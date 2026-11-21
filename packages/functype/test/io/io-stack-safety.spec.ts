/**
 * Both interpreters are loops, so a chain's length is bounded by memory, not by the call stack
 * (#560, IO overflows the stack on chains of 10,000 steps). Before, every shape below threw a
 * RangeError at 10,000 steps under `runSync`, and the chain built ahead of time did under `run`.
 */
import { describe, expect, it } from "vitest"

import { IO } from "@/io"

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

  it("recovers at the end of a long chain of error handlers", async () => {
    const make = (): IO<never, never, string> => {
      // eslint-disable-next-line functional/no-let -- building the chain step by step
      let io: IO<never, string, string> = IO.fail("boom")
      for (let k = 0; k < N; k++) io = io.mapError((e) => e)
      return io.recover("recovered")
    }
    expect(make().runSyncOrThrow()).toBe("recovered")
    expect(await make().runOrThrow()).toBe("recovered")
  })

  it("keeps a provided service through a long chain", async () => {
    const make = (): IO<never, never, number> => {
      // eslint-disable-next-line functional/no-let -- building the chain step by step
      let io: IO<never, never, number> = IO.succeed(0)
      for (let k = 0; k < 10_000; k++) io = io.flatMap((x) => IO.sync(() => x + 1))
      return io
    }
    expect(await make().runOrThrow()).toBe(10_000)
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
