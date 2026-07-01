import { describe, expect, it } from "vitest"

import { IO, RepeatExhausted } from "@/io"

type TaggedError = { readonly _tag: "Transient" | "Permanent"; readonly message: string }
const transient = (message: string): TaggedError => ({ _tag: "Transient", message })
const permanent = (message: string): TaggedError => ({ _tag: "Permanent", message })

describe("IO.repeatUntil", () => {
  it("returns immediately when the first result satisfies done", async () => {
    let runs = 0
    const result = await IO.sync(() => {
      runs++
      return 42
    })
      .repeatUntil((n) => n === 42, { max: 10 })
      .runOrThrow()

    expect(result).toBe(42)
    expect(runs).toBe(1)
  })

  it("re-runs until the predicate is satisfied", async () => {
    let n = 0
    const result = await IO.sync(() => ++n)
      .repeatUntil((v) => v >= 5, { max: 20 })
      .runOrThrow()

    expect(result).toBe(5)
    expect(n).toBe(5)
  })

  it("fails with RepeatExhausted (carrying lastValue) when the bound is reached", async () => {
    let runs = 0
    const io = IO.sync(() => {
      runs++
      return runs
    }).repeatUntil((n) => n > 100, { max: 3 })

    await expect(io.runOrThrow()).rejects.toMatchObject({
      _tag: "RepeatExhausted",
      max: 3,
      lastValue: 3,
    })
    expect(runs).toBe(3)
  })

  it("short-circuits on the first failure and propagates the original error", async () => {
    let runs = 0
    const io = IO.sync<number>(() => {
      runs++
      throw permanent("stop")
    }).repeatUntil((n) => n === 1, { max: 10 })

    await expect(io.runOrThrow()).rejects.toMatchObject({ _tag: "Permanent", message: "stop" })
    expect(runs).toBe(1)
  })

  it("fails with RepeatExhausted immediately when max <= 0", async () => {
    let runs = 0
    const io = IO.sync(() => {
      runs++
      return 1
    }).repeatUntil((n) => n === 1, { max: 0 })

    await expect(io.runOrThrow()).rejects.toMatchObject({ _tag: "RepeatExhausted", max: 0 })
    expect(runs).toBe(0)
  })

  it("honors optional delayMs between iterations", async () => {
    const timestamps: number[] = []
    const io = IO.sync(() => {
      timestamps.push(Date.now())
      return timestamps.length
    }).repeatUntil((n) => n >= 3, { max: 5, delayMs: 30 })

    await io.runOrThrow()
    expect(timestamps.length).toBe(3)
    expect(timestamps[1]! - timestamps[0]!).toBeGreaterThanOrEqual(20)
    expect(timestamps[2]! - timestamps[1]!).toBeGreaterThanOrEqual(20)
  })
})

describe("IO.repeatWhile", () => {
  it("stops as soon as cont returns false", async () => {
    let n = 0
    const result = await IO.sync(() => ++n)
      .repeatWhile((v) => v < 5, { max: 20 })
      .runOrThrow()

    expect(result).toBe(5)
    expect(n).toBe(5)
  })

  it("returns immediately when cont(firstResult) is false", async () => {
    let runs = 0
    const result = await IO.sync(() => {
      runs++
      return 999
    })
      .repeatWhile((n) => n < 10, { max: 5 })
      .runOrThrow()

    expect(result).toBe(999)
    expect(runs).toBe(1)
  })

  it("fails with RepeatExhausted when cont never returns false", async () => {
    const io = IO.sync(() => 1).repeatWhile(() => true, { max: 4 })
    await expect(io.runOrThrow()).rejects.toMatchObject({ _tag: "RepeatExhausted", max: 4, lastValue: 1 })
  })
})

describe("IO.iterate", () => {
  it("returns seed without invoking step when done(seed) is already true", async () => {
    let steps = 0
    const result = await IO.iterate(
      42,
      (n) =>
        IO.sync(() => {
          steps++
          return n + 1
        }),
      (n) => n === 42,
    ).runOrThrow()

    expect(result).toBe(42)
    expect(steps).toBe(0)
  })

  it("threads state through step until done", async () => {
    const result = await IO.iterate(
      0,
      (n) => IO.sync(() => n + 1),
      (n) => n >= 10,
    ).runOrThrow()

    expect(result).toBe(10)
  })

  it("short-circuits on failure inside step", async () => {
    let steps = 0
    const io = IO.iterate<never, TaggedError, number>(
      0,
      (n) =>
        IO.sync(() => {
          steps++
          if (n === 3) throw transient("boom")
          return n + 1
        }),
      (n) => n >= 10,
    )

    await expect(io.runOrThrow()).rejects.toMatchObject({ _tag: "Transient", message: "boom" })
    expect(steps).toBe(4) // 0->1, 1->2, 2->3, 3->throw
  })

  it("fails with RepeatExhausted (carrying last state) when max is reached", async () => {
    const io = IO.iterate(
      0,
      (n) => IO.sync(() => n + 1),
      (n) => n >= 1000,
      { max: 5 },
    )

    await expect(io.runOrThrow()).rejects.toMatchObject({
      _tag: "RepeatExhausted",
      max: 5,
      lastValue: 5,
    })
  })

  it("is stack-safe over 100k iterations", async () => {
    const result = await IO.iterate(
      0,
      (n) => IO.succeed(n + 1),
      (n) => n >= 100_000,
      { max: 200_000 },
    ).runOrThrow()

    expect(result).toBe(100_000)
  })
})

describe("value axis composes with error axis", () => {
  it("retry handles transient failures while repeatUntil advances toward the goal value", async () => {
    let calls = 0
    // Pattern: every third call throws transiently; otherwise returns an incrementing counter.
    // With retry(3), each transient throw is recovered; repeatUntil advances the successful values.
    let succeeded = 0
    const io = IO.sync(() => {
      calls++
      if (calls % 3 === 0) throw transient("flake")
      succeeded++
      return succeeded
    })
      .retry(3)
      .repeatUntil((n) => n >= 5, { max: 20 })

    const result = await io.runOrThrow()
    expect(result).toBe(5)
    // Sanity: some transient failures happened AND the loop advanced through them.
    expect(succeeded).toBe(5)
    expect(calls).toBeGreaterThan(succeeded)
  })
})

describe("RepeatExhausted", () => {
  it("is a subclass of Error and carries a helpful message", () => {
    const err = new RepeatExhausted(10, 42)
    expect(err).toBeInstanceOf(Error)
    expect(err._tag).toBe("RepeatExhausted")
    expect(err.max).toBe(10)
    expect(err.lastValue).toBe(42)
    expect(err.message).toContain("10")
  })

  it("RepeatExhausted.is narrows unknown to RepeatExhausted<A>", () => {
    // Positive cases: real instances and plain objects with the tag both pass.
    expect(RepeatExhausted.is(new RepeatExhausted(5, "last"))).toBe(true)
    expect(RepeatExhausted.is({ _tag: "RepeatExhausted", max: 5, lastValue: "last" })).toBe(true)

    // Negative cases: nothing else passes.
    expect(RepeatExhausted.is(null)).toBe(false)
    expect(RepeatExhausted.is(undefined)).toBe(false)
    expect(RepeatExhausted.is("RepeatExhausted")).toBe(false)
    expect(RepeatExhausted.is(new Error("plain"))).toBe(false)
    expect(RepeatExhausted.is({ _tag: "Other" })).toBe(false)
    expect(RepeatExhausted.is({})).toBe(false)
  })
})
