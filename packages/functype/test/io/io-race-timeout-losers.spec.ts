import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { IO, TimeoutError } from "@/io"

/**
 * `race` and `timeout` stop the effects they no longer need (#276 §8b).
 *
 * Before 2.0 both were a bare `Promise.race`: the loser ran on to completion, holding its
 * timers, its requests and its `bracket` resources. Now the result returns at once and the
 * losers are interrupted. Their `bracket` releases run, detached, when they settle.
 */

const tick = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms))

/** An `IO.async` that behaves like `fetch`: slow, it records its signal and rejects when it aborts. */
const probe = <A>(value: A) => {
  const seen: { signal?: AbortSignal } = {}
  const io = IO.async<A>((signal) => {
    seen.signal = signal
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => resolve(value), 60_000)
      signal?.addEventListener(
        "abort",
        () => {
          clearTimeout(timer)
          reject(signal.reason)
        },
        { once: true },
      )
    })
  })
  return { io, seen }
}

describe("race stops the losers", () => {
  it("aborts a loser's signal once the winner settles", async () => {
    const loser = probe("slow")
    const result = await IO.race([IO.sleep(5).map(() => "fast"), loser.io]).runOrThrow()

    expect(result).toBe("fast")
    expect(loser.seen.signal?.aborted).toBe(true)
  })

  it("leaves the winner's signal live, so a result read through it (a fetch body) still works", async () => {
    const seen: { signal?: AbortSignal } = {}
    const winner = IO.async((signal) => {
      seen.signal = signal
      return Promise.resolve("body")
    })
    await IO.race([winner, IO.sleep(60_000).map(() => "late")]).runOrThrow()

    expect(seen.signal).toBeDefined()
    expect(seen.signal?.aborted).toBe(false)
  })

  it("runs a loser's bracket release promptly, after the race has returned", async () => {
    const log: string[] = []
    const loser = IO.bracket(
      IO.succeed("resource"),
      () => IO.sleep(60_000).map(() => "loser"),
      () =>
        IO.sync(() => {
          log.push("released")
        }),
    )
    const result = await IO.race([IO.sleep(5).map(() => "winner"), loser]).runOrThrow()

    expect(result).toBe("winner")
    await tick(5)
    expect(log).toEqual(["released"])
  })

  it("keeps first-to-settle: a failure that settles first wins", async () => {
    const result = await IO.race([
      IO.sleep(5).flatMap(() => IO.fail("boom" as const)),
      IO.sleep(50).map(() => "ok" as const),
    ]).run()

    expect(result.isLeft() && result.value).toBe("boom")
  })

  it("returns without waiting for a loser that ignores its signal", async () => {
    const ignoring = IO.async(() => new Promise<string>((resolve) => setTimeout(() => resolve("ignored"), 200)))
    const started = Date.now()
    const result = await IO.race([IO.sleep(5).map(() => "fast"), ignoring]).runOrThrow()

    expect(result).toBe("fast")
    expect(Date.now() - started).toBeLessThan(150)
  })

  it("an outer interruption interrupts every child", async () => {
    const a = probe(1)
    const b = probe(2)
    const controller = new AbortController()
    const pending = IO.race([a.io, b.io]).runExit({ signal: controller.signal })
    await tick(5)
    controller.abort()
    const exit = await pending

    expect(exit.isInterrupted()).toBe(true)
    expect(a.seen.signal?.aborted).toBe(true)
    expect(b.seen.signal?.aborted).toBe(true)
  })
})

describe("race and timeout with fake timers", () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it("race clears a sleeping loser's timer", async () => {
    const pending = IO.race([IO.sleep(5).map(() => "fast"), IO.sleep(60_000).map(() => "slow")]).runOrThrow()
    await vi.advanceTimersByTimeAsync(5)

    await expect(pending).resolves.toBe("fast")
    expect(vi.getTimerCount()).toBe(0)
  })

  it("timeout clears a sleeping effect's timer when the deadline wins", async () => {
    const pending = IO.sleep(60_000).timeout(10).run()
    await vi.advanceTimersByTimeAsync(10)

    const result = await pending
    expect(result.isLeft() && result.value).toBeInstanceOf(TimeoutError)
    expect(vi.getTimerCount()).toBe(0)
  })
})

describe("timeout stops the effect when the deadline wins", () => {
  it("aborts the effect's signal", async () => {
    const slow = probe("slow")
    const result = await slow.io.timeout(5).run()

    expect(result.isLeft() && result.value).toBeInstanceOf(TimeoutError)
    expect(slow.seen.signal?.aborted).toBe(true)
  })

  it("leaves the effect's signal live when the effect wins", async () => {
    const seen: { signal?: AbortSignal } = {}
    const fast = IO.async((signal) => {
      seen.signal = signal
      return Promise.resolve("body")
    })
    await expect(fast.timeout(60_000).runOrThrow()).resolves.toBe("body")

    expect(seen.signal).toBeDefined()
    expect(seen.signal?.aborted).toBe(false)
  })

  it("runs the effect's bracket release promptly after the deadline", async () => {
    const log: string[] = []
    const result = await IO.bracket(
      IO.succeed("resource"),
      () => IO.sleep(60_000),
      () =>
        IO.sync(() => {
          log.push("released")
        }),
    )
      .timeout(5)
      .run()

    expect(result.isLeft() && result.value).toBeInstanceOf(TimeoutError)
    await tick(5)
    expect(log).toEqual(["released"])
  })

  it("returns at the deadline even when the effect ignores its signal", async () => {
    const ignoring = IO.async(() => new Promise<string>((resolve) => setTimeout(() => resolve("ignored"), 200)))
    const started = Date.now()
    const result = await ignoring.timeout(5).run()

    expect(result.isLeft() && result.value).toBeInstanceOf(TimeoutError)
    expect(Date.now() - started).toBeLessThan(150)
  })

  it("an outer interruption interrupts the effect", async () => {
    const slow = probe("slow")
    const controller = new AbortController()
    const pending = slow.io.timeout(60_000).runExit({ signal: controller.signal })
    await tick(5)
    controller.abort()

    expect((await pending).isInterrupted()).toBe(true)
    expect(slow.seen.signal?.aborted).toBe(true)
  })
})

describe("a detached loser never becomes an unhandled rejection", () => {
  const unhandled: unknown[] = []
  const record = (reason: unknown): void => {
    unhandled.push(reason)
  }

  beforeEach(() => {
    unhandled.length = 0
    process.on("unhandledRejection", record)
  })

  afterEach(() => {
    process.off("unhandledRejection", record)
  })

  it("a race loser that rejects after the race returned", async () => {
    const lateReject = IO.async(
      () => new Promise<string>((_, reject) => setTimeout(() => reject(new Error("late")), 20)),
    )
    await IO.race([IO.succeed("now"), lateReject]).runOrThrow()
    await tick(50)

    expect(unhandled).toEqual([])
  })

  it("a timed-out effect that rejects after the deadline, with a release that fails", async () => {
    const lateReject = IO.bracket(
      IO.succeed("resource"),
      () => IO.async(() => new Promise<string>((_, reject) => setTimeout(() => reject(new Error("late")), 20))),
      () =>
        IO.sync(() => {
          throw new Error("release bug")
        }),
    )
    await lateReject.timeout(5).run()
    await tick(50)

    expect(unhandled).toEqual([])
  })
})
