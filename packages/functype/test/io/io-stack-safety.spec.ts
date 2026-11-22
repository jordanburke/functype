/**
 * Both interpreters are loops, so a chain's length is bounded by memory, not by the call stack
 * (#560, IO overflows the stack on chains of 10,000 steps). Before, every shape below threw a
 * RangeError at 10,000 steps under `runSync`, and the chain built ahead of time did under `run`.
 */
import { describe, expect, it } from "vitest"

import { IO, SpanTracer, Tag } from "@/io"

const N = 100_000

/** `IO.succeed(0)` followed by `n` flatMaps, each nested inside the last. */
const builtAhead = (n: number): IO<never, never, number> => {
  // eslint-disable-next-line functional/no-let -- building the chain step by step
  let io: IO<never, never, number> = IO.succeed(0)
  for (let k = 0; k < n; k++) io = io.flatMap((x) => IO.succeed(x + 1))
  return io
}

/** A loop that recurses inside its continuation. */
const countdown = (n: number): IO<never, never, number> =>
  n === 0 ? IO.succeed(0) : IO.succeed(n).flatMap(() => countdown(n - 1))

const genLoop = (n: number): IO<never, unknown, number> =>
  IO.gen(function* () {
    // eslint-disable-next-line functional/no-let -- the loop's running value
    let x = 0
    for (let k = 0; k < n; k++) x = yield* IO.succeed(x + 1)
    return x
  })

describe("long chains don't overflow the stack", () => {
  it.each([
    ["a chain built ahead of time", () => builtAhead(N), N],
    ["a recursive loop", () => countdown(N), 0],
    ["IO.gen with many yields", () => genLoop(N), N],
    [
      "map after map",
      () => Array.from({ length: N }).reduce<IO<never, never, number>>((io) => io.map((x) => x + 1), IO.succeed(0)),
      N,
    ],
  ] as const)("%s, under runSync and run", async (_, make, expected) => {
    expect(make().runSyncOrThrow()).toBe(expected)
    expect(await make().runOrThrow()).toBe(expected)
  })

  it("repeatUntil many times, under runSync and run", async () => {
    const make = (): IO<never, unknown, number> => {
      // eslint-disable-next-line functional/no-let -- the effect's counter
      let count = 0
      return IO.sync(() => ++count).repeatUntil((v) => v >= N, { max: N + 1 })
    }
    expect(make().runSyncOrThrow()).toBe(N)
    expect(await make().runOrThrow()).toBe(N)
  })

  it("hands the original error through a long chain of error handlers", async () => {
    // On main this chain overflowed, and the handler at the end saw a RangeError, not "boom".
    const make = (): IO<never, never, unknown> => {
      // eslint-disable-next-line functional/no-let -- building the chain step by step
      let io: IO<never, string, string> = IO.fail("boom")
      for (let k = 0; k < N; k++) io = io.mapError((e) => e)
      return io.catchAll((e) => IO.succeed(e))
    }
    expect(make().runSyncOrThrow()).toBe("boom")
    expect(await make().runOrThrow()).toBe("boom")
  })

  it("keeps a provided service through a long chain", async () => {
    const Step = Tag<number>("Step")
    const make = (): IO<never, never, number> => {
      // eslint-disable-next-line functional/no-let -- building the chain step by step
      let io: IO<number, never, number> = IO.service(Step).map(() => 0)
      for (let k = 0; k < N; k++) io = io.flatMap((x) => IO.service(Step).map((step) => x + step))
      return io.provideService(Step, 1)
    }
    expect(make().runSyncOrThrow()).toBe(N)
    expect(await make().runOrThrow()).toBe(N)
  })
})

describe("a failed bracket release replaces the outcome", () => {
  const failingRelease = (): IO<never, string, string> =>
    IO.bracket(
      IO.succeed("resource"),
      () => IO.succeed("used"),
      () => IO.die(new Error("release-failed")),
    )

  it("under run, as it already did under runSync", async () => {
    expect(() => failingRelease().runSyncOrThrow()).toThrow("release-failed")
    const exit = await failingRelease().runExit()
    expect(exit._tag).toBe("Die")
    await expect(failingRelease().runOrThrow()).rejects.toThrow("release-failed")
  })

  it("for bracketExit too", async () => {
    const io = IO.bracketExit(
      IO.succeed("resource"),
      () => IO.succeed("used"),
      () => IO.die(new Error("release-failed")),
    )
    const exit = await io.runExit()
    expect(exit._tag).toBe("Die")
  })
})

describe("nested steps don't overflow the stack under run()", () => {
  const DEPTH = 5_000
  const tracer: SpanTracer<string> = { start: (name) => name, run: (_span, fn) => fn(), end: () => undefined }

  type Wrap = (io: IO<never, unknown, number>) => IO<never, unknown, number>
  const wraps: ReadonlyArray<readonly [string, Wrap]> = [
    ["withSpan", (io: IO<never, unknown, number>) => io.withSpan("level")],
    ["interruptOn", (io: IO<never, unknown, number>) => io.interruptOn(new AbortController().signal)],
    ["timeout", (io: IO<never, unknown, number>) => io.timeout(60_000)],
    ["race", (io: IO<never, unknown, number>) => IO.race([io])],
    ["all", (io: IO<never, unknown, number>) => IO.all([io, IO.succeed(0)]).map(([n]) => n ?? -1)],
    [
      "bracket acquire",
      (io: IO<never, unknown, number>) =>
        IO.bracket(
          io,
          (n) => IO.succeed(n),
          () => IO.succeed(undefined),
        ),
    ],
  ]

  it.each(wraps)("%s", async (_, wrap) => {
    const go = (n: number): IO<never, unknown, number> =>
      n === 0 ? IO.succeed(0) : wrap(IO.succeed(n).flatMap(() => go(n - 1)))
    expect(await go(DEPTH).provideService(SpanTracer, tracer).runOrThrow()).toBe(0)
  })
})

describe("a step that isn't an IO is a defect, not a crash", () => {
  const notAnIO = (): IO<never, never, number> => IO.succeed(1).flatMap(() => 5 as unknown as IO<never, never, number>)

  it("reaches a recover under runSync and run", async () => {
    expect(notAnIO().recover(0).runSyncOrThrow()).toBe(0)
    expect(await notAnIO().recover(0).runOrThrow()).toBe(0)
    expect(
      IO.fail("x")
        .recoverWith(() => 5 as unknown as IO<never, never, number>)
        .recover(0)
        .runSyncOrThrow(),
    ).toBe(0)
  })

  it.each([
    ["all", () => IO.all([notAnIO(), IO.succeed(2)])],
    ["race", () => IO.race([notAnIO()])],
    ["timeout", () => notAnIO().timeout(60_000)],
  ] as const)("settles %s as Die, with no unhandled rejection", async (_, make) => {
    const unhandled: unknown[] = []
    const onUnhandled = (reason: unknown): void => {
      unhandled.push(reason)
    }
    process.on("unhandledRejection", onUnhandled)
    try {
      const io: IO<never, unknown, unknown> = make()
      const exit = await io.runExit()
      expect(exit._tag).toBe("Die")
      await new Promise((resolve) => setTimeout(resolve, 10))
      expect(unhandled).toEqual([])
    } finally {
      process.off("unhandledRejection", onUnhandled)
    }
  })

  it("fails a span whose tracer's run returns nothing, once, under runSync", () => {
    const runs: string[] = []
    const silent: SpanTracer<string> = {
      start: (name) => name,
      run: (span) => {
        runs.push(span)
        return undefined as never
      },
      end: () => undefined,
    }
    const exit = () => IO.succeed(1).withSpan("s").provideService(SpanTracer, silent).runSyncOrThrow()
    expect(exit).toThrow(TypeError)
    expect(runs).toEqual(["s"])
  })
})

describe("a nested step in a region cancelled just before it starts doesn't run", () => {
  // The step before the nested one queues a microtask that aborts the region. It lands after the
  // loop's check and before the nested step starts, on its fresh stack.
  const tracer = (events: string[]): SpanTracer<string> => ({
    start: (name) => {
      events.push(`start:${name}`)
      return name
    },
    run: (_span, fn) => fn(),
    end: (span, exit) => {
      events.push(`end:${span}:${exit._tag}`)
    },
  })

  it.each([
    [
      "bracket",
      (events: string[]) =>
        IO.bracket(
          IO.sync(() => events.push("acquire")),
          () => IO.sync(() => events.push("use")),
          () => IO.sync(() => void events.push("release")),
        ),
    ],
    [
      "bracketExit",
      (events: string[]) =>
        IO.bracketExit(
          IO.sync(() => events.push("acquire")),
          () => IO.sync(() => events.push("use")),
          () => IO.sync(() => void events.push("release")),
        ),
    ],
    ["withSpan", (events: string[]) => IO.sync(() => events.push("body")).withSpan("s")],
  ] as const)("%s", async (_, make) => {
    const controller = new AbortController()
    const events: string[] = []
    const abortSoon = IO.sync(() => queueMicrotask(() => controller.abort()))
    const exit = await abortSoon
      .flatMap(() => make(events))
      .interruptOn(controller.signal)
      .provideService(SpanTracer, tracer(events))
      .runExit()
    expect(exit._tag).toBe("Failure")
    expect(events).toEqual([])
  })
})
