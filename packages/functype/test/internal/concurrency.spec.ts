import { describe, expect, it } from "vitest"

import { Either, Left, Right } from "@/either"
import { traverseWithConcurrency } from "@/internal/concurrency"
import { List } from "@/list"
import { Set } from "@/set"

/**
 * Two consumers (CivalaOS, ts-builds) hand-rolled sequential async traversal after `no-imperative-loops`
 * flagged their awaiting loops, because the only built-in, `List.flatMapAsync`, started every call at once.
 * These tests pin the concurrency contract the replacements rely on.
 */

type Probe = {
  readonly started: string[]
  readonly maxInFlight: () => number
  readonly run: <B>(label: string, value: B) => Promise<B>
}

/** Records start order and the peak number of calls in flight; each call settles on a later macrotask. */
const probe = (): Probe => {
  const started: string[] = []
  const state = { inFlight: 0, peak: 0 }
  return {
    started,
    maxInFlight: () => state.peak,
    run: async (label, value) => {
      started.push(label)
      state.inFlight += 1
      state.peak = Math.max(state.peak, state.inFlight)
      await new Promise((resolve) => setTimeout(resolve, 1))
      state.inFlight -= 1
      return value
    },
  }
}

describe("traverseWithConcurrency", () => {
  it("returns results in input order regardless of completion order", async () => {
    const delays = [5, 1, 3]
    const results = await traverseWithConcurrency(
      delays,
      (ms) => new Promise<number>((resolve) => setTimeout(() => resolve(ms), ms)),
      "unbounded",
    )
    expect(results).toEqual([5, 1, 3])
  })

  it("caps calls in flight at the concurrency", async () => {
    const p = probe()
    await traverseWithConcurrency([1, 2, 3, 4, 5, 6, 7], (n) => p.run(String(n), n), 3)
    expect(p.maxInFlight()).toBe(3)
  })

  it("concurrency 1 runs one call at a time, in order", async () => {
    const p = probe()
    await traverseWithConcurrency(["a", "b", "c"], (s) => p.run(s, s), 1)
    expect(p.maxInFlight()).toBe(1)
    expect(p.started).toEqual(["a", "b", "c"])
  })

  it("starts nothing after stop() holds, and leaves unstarted items out", async () => {
    const p = probe()
    const results = await traverseWithConcurrency(
      [1, 2, 3, 4],
      (n) => p.run(String(n), n),
      1,
      (n) => n === 2,
    )
    expect(results).toEqual([1, 2])
    expect(p.started).toEqual(["1", "2"])
  })

  it("starts nothing after a rejection, and rejects", async () => {
    const p = probe()
    const failing = traverseWithConcurrency(
      [1, 2, 3],
      (n) => (n === 2 ? Promise.reject(new Error("boom")) : p.run(String(n), n)),
      1,
    )
    await expect(failing).rejects.toThrow("boom")
    expect(p.started).toEqual(["1"])
  })

  it("handles an empty input", async () => {
    expect(await traverseWithConcurrency([], async (n: number) => n, 2)).toEqual([])
  })

  it.each([0, -1, 1.5, Number.NaN])("rejects concurrency %s", async (concurrency) => {
    await expect(traverseWithConcurrency([1], async (n) => n, concurrency)).rejects.toThrow(RangeError)
  })
})

describe("List.flatMapAsync concurrency", () => {
  it("starts every call at once by default (unchanged behavior)", async () => {
    const p = probe()
    const result = await List([1, 2, 3]).flatMapAsync((n) => p.run(String(n), [n, n * 10]))
    expect(p.maxInFlight()).toBe(3)
    expect(result.toArray()).toEqual([1, 10, 2, 20, 3, 30])
  })

  it("{ concurrency: 1 } runs in order", async () => {
    const p = probe()
    const result = await List(["a", "b", "c"]).flatMapAsync((s) => p.run(s, [s.toUpperCase()]), { concurrency: 1 })
    expect(p.maxInFlight()).toBe(1)
    expect(p.started).toEqual(["a", "b", "c"])
    expect(result.toArray()).toEqual(["A", "B", "C"])
  })
})

describe("Set.flatMapAsync concurrency", () => {
  it("runs in order by default (unchanged behavior)", async () => {
    const p = probe()
    const result = await Set([1, 2, 3]).flatMapAsync((n) => p.run(String(n), [n % 2]))
    expect(p.maxInFlight()).toBe(1)
    expect(result.toArray().sort()).toEqual([0, 1])
  })

  it("{ concurrency: 'unbounded' } starts every call at once", async () => {
    const p = probe()
    await Set([1, 2, 3]).flatMapAsync((n) => p.run(String(n), [n]), { concurrency: "unbounded" })
    expect(p.maxInFlight()).toBe(3)
  })
})

describe("Either.traverseAsync", () => {
  it("collects Right values in input order", async () => {
    const result = await Either.traverseAsync([1, 2, 3], async (n) => Right<string, number>(n * 2))
    expect(result.isRight() && result.value).toEqual([2, 4, 6])
  })

  it("runs one call at a time by default and stops at the first Left", async () => {
    const p = probe()
    const result = await Either.traverseAsync(["a", "b", "c"], (s) =>
      p.run(s, s === "b" ? Left<string, string>(`bad ${s}`) : Right<string, string>(s)),
    )
    expect(p.maxInFlight()).toBe(1)
    expect(p.started).toEqual(["a", "b"])
    expect(result.isLeft() && result.value).toBe("bad b")
  })

  it("with concurrency, returns the Left of the earliest failing item", async () => {
    // Item 1 fails slowly, item 2 fails fast: the earliest *item* wins, not the earliest to settle.
    const result = await Either.traverseAsync(
      [1, 2],
      (n) =>
        new Promise<Either<string, number>>((resolve) => setTimeout(() => resolve(Left(`fail ${n}`)), n === 1 ? 5 : 1)),
      { concurrency: 2 },
    )
    expect(result.isLeft() && result.value).toBe("fail 1")
  })

  it("accepts a List", async () => {
    const result = await Either.traverseAsync(List([1, 2]), async (n) => Right<never, number>(n + 1))
    expect(result.isRight() && result.value).toEqual([2, 3])
  })

  it("returns Right([]) for no items", async () => {
    const result = await Either.traverseAsync([], async (n: number) => Right<string, number>(n))
    expect(result.isRight() && result.value).toEqual([])
  })
})
