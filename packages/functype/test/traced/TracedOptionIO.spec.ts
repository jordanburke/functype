import { describe, expect, it } from "vitest"

import { IO } from "../../src/io/IO.js"
import { Layer } from "../../src/io/Layer.js"
import { Tag } from "../../src/io/Tag.js"
import { None, Some } from "../../src/option/Option.js"
import type { TraceEvent } from "../../src/traced/TraceEvent.js"
import { TracedOption } from "../../src/traced/TracedOption.js"
import type { Tracer } from "../../src/traced/Tracer.js"

// Core ships no Tag for Tracer — a consumer declares its own. This is the
// whole of the DI wiring, and it is what the docs tell users to write.
const TracerTag = Tag<Tracer>("app/Tracer")

const collecting = (target: TraceEvent[]): Tracer => ({ emit: (e) => void target.push(e) })
const noop: Tracer = { emit: () => undefined }

describe("TracedOption + IO DI wiring", () => {
  it("collects events from a traced pipeline via Layer injection", async () => {
    const captured: TraceEvent[] = []

    const program = IO.service(TracerTag).map((tracer) =>
      TracedOption(Some(3), tracer, "io-span")
        .map((n) => n * 2, "double")
        .filter((n) => n < 5, "lt5")
        .orElse(0, "default"),
    )

    const result = await program.provideLayer(Layer.succeed(TracerTag, collecting(captured))).runOrThrow()

    expect(result).toBe(0)
    expect(captured.map((e) => e.op)).toEqual(["map", "filter", "orElse"])
    expect(captured.every((e) => e.spanId === "io-span")).toBe(true)
    expect(captured.map((e) => e.seq)).toEqual([0, 1, 2])
  })

  it("a noop tracer produces the same value and emits nothing", async () => {
    // Same program, run twice against two sinks: the values must agree, and the
    // noop sink must leave the collecting sink's view of the world untouched.
    const captured: TraceEvent[] = []
    const program = IO.service(TracerTag).map((tracer) => TracedOption(None<number>(), tracer, "io-span").orElse(42))

    const traced = await program.provideLayer(Layer.succeed(TracerTag, collecting(captured))).runOrThrow()
    const untraced = await program.provideLayer(Layer.succeed(TracerTag, noop)).runOrThrow()

    expect(traced).toBe(untraced)
    expect(untraced).toBe(42)
    // exactly one event, from the collecting run — the noop run added none
    expect(captured.map((e) => e.op)).toEqual(["orElse"])
  })
})
