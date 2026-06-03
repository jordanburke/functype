import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { IO } from "@/io"

type TaggedError = { readonly _tag: "Transient" | "Permanent"; readonly message: string }
const transient = (message: string): TaggedError => ({ _tag: "Transient", message })
const permanent = (message: string): TaggedError => ({ _tag: "Permanent", message })

describe("IO.retryWhile", () => {
  it("does not retry when predicate returns false", async () => {
    let attempts = 0
    const io = IO.sync(() => {
      attempts++
      throw permanent("no retry")
    }).retryWhile({
      n: 3,
      while: (e) => (e as TaggedError)._tag === "Transient",
    })

    await expect(io.runOrThrow()).rejects.toMatchObject({ _tag: "Permanent", message: "no retry" })
    expect(attempts).toBe(1)
  })

  it("retries up to n when predicate returns true", async () => {
    let attempts = 0
    const io = IO.sync(() => {
      attempts++
      throw transient("flaky")
    }).retryWhile({
      n: 3,
      while: (e) => (e as TaggedError)._tag === "Transient",
    })

    await expect(io.runOrThrow()).rejects.toMatchObject({ _tag: "Transient" })
    expect(attempts).toBe(4) // 1 initial + 3 retries
  })

  it("eventually succeeds when predicate gates retries", async () => {
    let attempts = 0
    const io = IO.sync(() => {
      attempts++
      if (attempts < 3) throw transient("not yet")
      return "ok"
    }).retryWhile({
      n: 5,
      while: (e) => (e as TaggedError)._tag === "Transient",
    })

    const result = await io.runOrThrow()
    expect(result).toBe("ok")
    expect(attempts).toBe(3)
  })

  it("passes a 1-indexed attempt number to the predicate", async () => {
    const seenAttempts: number[] = []
    const io = IO.sync(() => {
      throw transient("always")
    }).retryWhile({
      n: 3,
      while: (_e, attempt) => {
        seenAttempts.push(attempt)
        return true
      },
    })

    await expect(io.runOrThrow()).rejects.toMatchObject({ _tag: "Transient" })
    expect(seenAttempts).toEqual([1, 2, 3])
  })

  it("honors optional delayMs between attempts", async () => {
    const timestamps: number[] = []
    const io = IO.sync(() => {
      timestamps.push(Date.now())
      throw transient("retry me")
    }).retryWhile({
      n: 2,
      while: () => true,
      delayMs: 40,
    })

    await expect(io.runOrThrow()).rejects.toMatchObject({ _tag: "Transient" })
    expect(timestamps.length).toBe(3)
    expect(timestamps[1]! - timestamps[0]!).toBeGreaterThanOrEqual(30)
    expect(timestamps[2]! - timestamps[1]!).toBeGreaterThanOrEqual(30)
  })
})

describe("IO.retryWithBackoff", () => {
  beforeEach(() => {
    vi.spyOn(Math, "random").mockReturnValue(0)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it("uses exponential schedule baseMs * factor^(attempt-1) when jitter is off", async () => {
    const timestamps: number[] = []
    const io = IO.sync(() => {
      timestamps.push(Date.now())
      throw transient("retry")
    }).retryWithBackoff({
      n: 3,
      baseMs: 50,
      factor: 2,
      jitter: false,
    })

    await expect(io.runOrThrow()).rejects.toMatchObject({ _tag: "Transient" })
    expect(timestamps.length).toBe(4) // 1 initial + 3 retries

    const d1 = timestamps[1]! - timestamps[0]! // ~50
    const d2 = timestamps[2]! - timestamps[1]! // ~100
    const d3 = timestamps[3]! - timestamps[2]! // ~200

    expect(d1).toBeGreaterThanOrEqual(40)
    expect(d1).toBeLessThan(150)
    expect(d2).toBeGreaterThanOrEqual(90)
    expect(d2).toBeLessThan(200)
    expect(d3).toBeGreaterThanOrEqual(190)
    expect(d3).toBeLessThan(350)
  })

  it("caps the per-attempt delay at maxMs", async () => {
    const timestamps: number[] = []
    const io = IO.sync(() => {
      timestamps.push(Date.now())
      throw transient("retry")
    }).retryWithBackoff({
      n: 3,
      baseMs: 50,
      factor: 10,
      maxMs: 60,
      jitter: false,
    })

    await expect(io.runOrThrow()).rejects.toMatchObject({ _tag: "Transient" })
    const deltas = [timestamps[1]! - timestamps[0]!, timestamps[2]! - timestamps[1]!, timestamps[3]! - timestamps[2]!]
    // All deltas should land at or near maxMs (60), not 50/500/5000.
    deltas.forEach((d) => {
      expect(d).toBeLessThan(150)
    })
  })

  it("applies full jitter ± 50% when jitter is enabled", async () => {
    // With Math.random = 0, jitter multiplier = 0.5, so delay is half the computed.
    const timestamps: number[] = []
    const io = IO.sync(() => {
      timestamps.push(Date.now())
      throw transient("retry")
    }).retryWithBackoff({
      n: 1,
      baseMs: 200,
      factor: 1, // disable exponential growth to isolate jitter
      jitter: true,
    })

    await expect(io.runOrThrow()).rejects.toMatchObject({ _tag: "Transient" })
    const delta = timestamps[1]! - timestamps[0]!
    // computed = 200; jitter * (0.5 + 0) = 0.5 → ~100ms
    expect(delta).toBeGreaterThanOrEqual(80)
    expect(delta).toBeLessThan(180)
  })

  it("respects the while predicate (no retry on permanent errors)", async () => {
    let attempts = 0
    const io = IO.sync(() => {
      attempts++
      throw permanent("nope")
    }).retryWithBackoff({
      n: 5,
      baseMs: 10,
      jitter: false,
      while: (e) => (e as TaggedError)._tag === "Transient",
    })

    await expect(io.runOrThrow()).rejects.toMatchObject({ _tag: "Permanent" })
    expect(attempts).toBe(1)
  })

  it("stops after n attempts even with a retry-all predicate", async () => {
    let attempts = 0
    const io = IO.sync(() => {
      attempts++
      throw transient("always")
    }).retryWithBackoff({
      n: 2,
      baseMs: 5,
      jitter: false,
    })

    await expect(io.runOrThrow()).rejects.toMatchObject({ _tag: "Transient" })
    expect(attempts).toBe(3) // 1 initial + 2 retries
  })
})
