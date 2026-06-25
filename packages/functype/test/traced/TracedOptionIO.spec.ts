import { describe, it, expect } from "vitest"
import { IO } from "../../src/io/IO.js"
import { None, Option, Some } from "../../src/option/Option.js"
import { Tracer } from "../../src/traced/Tracer.js"
import { TracedOption } from "../../src/traced/TracedOption.js"
import { TracerLive } from "../../src/traced/TracerLive.js"
import type { TraceEvent } from "../../src/traced/TraceEvent.js"

describe("TracedOption + IO DI wiring", () => {
  it("collects events from a traced pipeline via Layer injection", async () => {
    const captured: TraceEvent[] = []

    const program = IO.service(Tracer).map((tracer) =>
      TracedOption(Some(3), tracer, "io-span")
        .map((n) => n * 2, "double")
        .filter((n) => n < 5, "lt5")
        .orElse(0, "default"),
    )

    const result = await program.provideLayer(TracerLive.collecting(captured)).runOrThrow()

    expect(result).toBe(0)
    expect(captured).toHaveLength(3)
    expect(captured.map((e) => e.op)).toEqual(["map", "filter", "orElse"])
    expect(captured.every((e) => e.spanId === "io-span")).toBe(true)
  })

  it("noop layer produces the same result with zero events captured", async () => {
    const captured: TraceEvent[] = []

    const program = IO.service(Tracer).map((tracer) =>
      TracedOption(Option.from<number>(null), tracer).orElse(42),
    )

    const result = await program.provideLayer(TracerLive.noop()).runOrThrow()

    expect(result).toBe(42)
    expect(captured).toHaveLength(0)
  })
})
