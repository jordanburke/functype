import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import type { Either } from "@/either"
import { InterruptedError, IO, UnsupportedSyncOperationError } from "@/io"

/**
 * `IO.sleep`, `IO.never` and `.delay` are one internal sleep effect that an abort wakes (#276 §8a).
 *
 * Before 2.0 each was a bare `setTimeout` promise, which no signal could reach: a cancelled
 * `retryWithDelay(3, 60_000)` sat out its full minute, `IO.never()` under `interruptOn` never
 * settled, and the pending timer held the process open.
 */

const isInterruption = (result: Either<unknown, unknown>): boolean =>
  result.isLeft() && InterruptedError.is(result.value)

/** Tracks whether a promise has settled, without awaiting it. */
const watch = <A>(promise: Promise<A>): { readonly settled: () => boolean; readonly promise: Promise<A> } => {
  const state = { settled: false }
  void promise.then(() => {
    state.settled = true
  })
  return { settled: () => state.settled, promise }
}

describe("sleep wakes on interruption", () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it("IO.sleep ends at once as the cancellation and clears its timer", async () => {
    const controller = new AbortController()
    const run = watch(IO.sleep(60_000).interruptOn(controller.signal).run())
    await vi.advanceTimersByTimeAsync(5)
    expect(vi.getTimerCount()).toBe(1)

    controller.abort()
    await vi.advanceTimersByTimeAsync(0)

    expect(run.settled()).toBe(true)
    expect(isInterruption(await run.promise)).toBe(true)
    expect(vi.getTimerCount()).toBe(0)
  })

  it("IO.never ends when its region is cancelled", async () => {
    const controller = new AbortController()
    const run = watch(IO.never<number>().interruptOn(controller.signal).run())
    await vi.advanceTimersByTimeAsync(5)

    controller.abort()
    await vi.advanceTimersByTimeAsync(0)

    expect(run.settled()).toBe(true)
    expect(isInterruption(await run.promise)).toBe(true)
  })

  it("IO.never sets no timer at all", async () => {
    const controller = new AbortController()
    const run = watch(IO.never<number>().interruptOn(controller.signal).run())
    await vi.advanceTimersByTimeAsync(0)
    expect(vi.getTimerCount()).toBe(0)
    controller.abort()
    await run.promise
  })

  it(".delay is interrupted before the delayed effect runs", async () => {
    const controller = new AbortController()
    const ran = { n: 0 }
    const run = watch(
      IO.sync(() => {
        ran.n += 1
      })
        .delay(60_000)
        .runExit({ signal: controller.signal }),
    )
    await vi.advanceTimersByTimeAsync(5)

    controller.abort()
    await vi.advanceTimersByTimeAsync(0)

    expect(run.settled()).toBe(true)
    expect((await run.promise).isInterrupted()).toBe(true)
    expect(ran.n).toBe(0)
    expect(vi.getTimerCount()).toBe(0)
  })

  it("a retryWithDelay wait wakes on interruption", async () => {
    const controller = new AbortController()
    const attempts = { n: 0 }
    const run = watch(
      IO.sync(() => {
        attempts.n += 1
      })
        .flatMap(() => IO.fail("down" as const))
        .retryWithDelay(3, 60_000)
        .interruptOn(controller.signal)
        .run(),
    )
    await vi.advanceTimersByTimeAsync(5)
    expect(attempts.n).toBe(1)

    controller.abort()
    await vi.advanceTimersByTimeAsync(0)

    expect(run.settled()).toBe(true)
    expect(isInterruption(await run.promise)).toBe(true)
    expect(attempts.n).toBe(1)
    expect(vi.getTimerCount()).toBe(0)
  })

  it("a retryWithBackoff wait wakes on interruption", async () => {
    const controller = new AbortController()
    const run = watch(
      IO.fail("down" as const)
        .retryWithBackoff({ n: 3, baseMs: 60_000, jitter: false })
        .interruptOn(controller.signal)
        .run(),
    )
    await vi.advanceTimersByTimeAsync(5)

    controller.abort()
    await vi.advanceTimersByTimeAsync(0)

    expect(run.settled()).toBe(true)
    expect(isInterruption(await run.promise)).toBe(true)
  })

  it("a repeatUntil wait wakes on interruption", async () => {
    const controller = new AbortController()
    const polls = { n: 0 }
    const run = watch(
      IO.sync(() => {
        polls.n += 1
        return polls.n
      })
        .repeatUntil(() => false, { max: 10, delayMs: 60_000 })
        .interruptOn(controller.signal)
        .run(),
    )
    await vi.advanceTimersByTimeAsync(5)

    controller.abort()
    await vi.advanceTimersByTimeAsync(0)

    expect(run.settled()).toBe(true)
    expect(isInterruption(await run.promise)).toBe(true)
    expect(polls.n).toBe(1)
  })

  it("an interrupted sleep inside bracket's use releases at once", async () => {
    const controller = new AbortController()
    const log: string[] = []
    const run = watch(
      IO.bracket(
        IO.succeed("resource"),
        () => IO.sleep(60_000),
        () =>
          IO.sync(() => {
            log.push("released")
          }),
      ).runExit({ signal: controller.signal }),
    )
    await vi.advanceTimersByTimeAsync(5)

    controller.abort()
    await vi.advanceTimersByTimeAsync(0)

    expect(run.settled()).toBe(true)
    expect(log).toEqual(["released"])
  })
})

describe("sleep without an abort", () => {
  it("still sleeps for its duration and succeeds", async () => {
    vi.useFakeTimers()
    try {
      const run = watch(
        IO.sleep(100)
          .map(() => "done")
          .runOrThrow(),
      )
      await vi.advanceTimersByTimeAsync(99)
      expect(run.settled()).toBe(false)
      await vi.advanceTimersByTimeAsync(1)
      await expect(run.promise).resolves.toBe("done")
    } finally {
      vi.useRealTimers()
    }
  })

  it("detaches from the region's signal when it finishes, so a long-lived signal collects no listeners", async () => {
    const controller = new AbortController()
    const added = vi.spyOn(controller.signal, "addEventListener")
    const removed = vi.spyOn(controller.signal, "removeEventListener")

    await IO.sleep(0)
      .repeatUntil(() => false, { max: 20 })
      .interruptOn(controller.signal)
      .run()

    const abortListeners = (spy: typeof added): number => spy.mock.calls.filter(([type]) => type === "abort").length
    expect(abortListeners(added)).toBeGreaterThanOrEqual(20)
    expect(abortListeners(removed)).toBe(abortListeners(added))
  })
})

describe("sleep under runSync", () => {
  it("is an unsupported operation that recovery can't swallow", () => {
    const outcome = (() => {
      try {
        return IO.sleep(0).recover(undefined).runSync()
      } catch (e) {
        return e
      }
    })()
    const error = outcome instanceof UnsupportedSyncOperationError ? outcome : (outcome as Either<unknown, void>).value
    expect(error).toBeInstanceOf(UnsupportedSyncOperationError)
    expect((error as UnsupportedSyncOperationError).operation).toBe("sleep")
  })

  it("covers IO.never and .delay too", () => {
    const operationOf = (run: () => unknown): unknown => {
      try {
        const result = run() as Either<unknown, unknown>
        return result.isLeft() && result.value instanceof UnsupportedSyncOperationError
          ? result.value.operation
          : undefined
      } catch (e) {
        return e instanceof UnsupportedSyncOperationError ? e.operation : undefined
      }
    }
    expect(operationOf(() => IO.never().runSync())).toBe("sleep")
    expect(operationOf(() => IO.succeed(1).delay(0).runSync())).toBe("sleep")
  })
})
