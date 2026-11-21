/**
 * A sink inside `IO.withSpan` sees the span (functype #276 §11). This is how trace IDs reach logs:
 * the tracer's `run` makes the span active, and the sink reads it, as the README's OpenTelemetry
 * sink does with `trace.getActiveSpan()`. The tracer here is a fake on `AsyncLocalStorage`, which is
 * what OpenTelemetry's context manager uses on Node.
 */
import { AsyncLocalStorage } from "node:async_hooks"

import { IO, SpanTracer } from "functype"
import { describe, expect, it } from "vitest"

import { createDirectConsoleLogger } from "../src/direct/DirectLogger"
import { createConsoleLogger } from "../src/layers/ConsoleLogger"
import type { LogSink } from "../src/logger/Logger"

type FakeSpan = { readonly spanId: string }

const storage = new AsyncLocalStorage<FakeSpan>()
const tracer: SpanTracer<FakeSpan> = {
  start: (name) => ({ spanId: name }),
  run: (span, fn) => storage.run(span, fn),
  end: () => undefined,
}

const collect = (): { readonly lines: string[]; readonly sink: LogSink } => {
  const lines: string[] = []
  return {
    lines,
    sink: ({ message }) => {
      lines.push(`${storage.getStore()?.spanId ?? "-"} ${message}`)
    },
  }
}

const tick = (): Promise<void> => new Promise((resolve) => setTimeout(resolve, 1))

describe("a log sink inside IO.withSpan", () => {
  it("sees the span through Logger, before and after an await", async () => {
    const { lines, sink } = collect()
    const log = createConsoleLogger({ sink })
    const program = log
      .info("start")
      .flatMap(() => IO.async(tick))
      .flatMap(() => log.info("done"))
      .withSpan("request")
    await program.provideService(SpanTracer, tracer).runOrThrow()
    await log.info("outside").runOrThrow()
    expect(lines).toEqual(["request start", "request done", "- outside"])
  })

  it("sees the span through DirectLogger, after an await in the thunk", async () => {
    const { lines, sink } = collect()
    const log = createDirectConsoleLogger({ sink })
    const program = IO.async(async () => {
      await tick()
      log.info("in thunk")
    }).withSpan("job")
    await program.provideService(SpanTracer, tracer).runOrThrow()
    expect(lines).toEqual(["job in thunk"])
  })
})
