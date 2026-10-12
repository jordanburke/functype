import { describe, expect, it } from "vitest"

import { IO } from "@/io"

/**
 * `IO.all` / `IO.forEach` take `{ concurrency }`, and `IO.async` / `IO.tryPromise` thunks receive
 * the run's abort signal. Defaults are unchanged: both combinators run one effect at a time.
 */

const tick = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms))

/** An effect that records how many effects are in flight while it waits `ms`. */
const tracked = (gauge: { now: number; max: number }, value: number, ms: number) =>
  IO.async(async () => {
    gauge.now += 1
    gauge.max = Math.max(gauge.max, gauge.now)
    await tick(ms)
    gauge.now -= 1
    return value
  })

describe("IO.all concurrency", () => {
  it("runs one at a time by default", async () => {
    const gauge = { now: 0, max: 0 }
    const result = await IO.all([tracked(gauge, 1, 5), tracked(gauge, 2, 5), tracked(gauge, 3, 5)]).runOrThrow()
    expect(result).toEqual([1, 2, 3])
    expect(gauge.max).toBe(1)
  })

  it("runs up to `concurrency` at once and keeps input order", async () => {
    const gauge = { now: 0, max: 0 }
    const effects = [tracked(gauge, 1, 20), tracked(gauge, 2, 5), tracked(gauge, 3, 5), tracked(gauge, 4, 5)]
    const result = await IO.all(effects, { concurrency: 2 }).runOrThrow()
    expect(result).toEqual([1, 2, 3, 4])
    expect(gauge.max).toBe(2)
  })

  it('starts them all with "unbounded"', async () => {
    const gauge = { now: 0, max: 0 }
    const effects = [1, 2, 3, 4, 5].map((n) => tracked(gauge, n, 5))
    expect(await IO.all(effects, { concurrency: "unbounded" }).runOrThrow()).toEqual([1, 2, 3, 4, 5])
    expect(gauge.max).toBe(5)
  })

  it("returns the first failure without waiting for a sibling that ignores its signal", async () => {
    const stuck = IO.async(() => new Promise<number>(() => {}))
    const failing = IO.async(() => tick(5).then(() => Promise.reject(new Error("boom"))))
    const either = await IO.all([stuck, failing], { concurrency: "unbounded" }).run()
    expect(either.isLeft()).toBe(true)
    expect(either.fold((e) => (e as Error).message, String)).toBe("boom")
  })

  it("interrupts siblings on the first failure: their signal aborts and later steps don't run", async () => {
    const seen: { aborted?: boolean; afterStep: boolean } = { afterStep: false }
    const sibling = IO.async(
      (signal) =>
        new Promise<number>((resolve) => {
          signal?.addEventListener("abort", () => {
            seen.aborted = true
            resolve(0)
          })
        }),
    ).map((n) => {
      seen.afterStep = true
      return n
    })
    const failing = IO.async(() => tick(5).then(() => Promise.reject(new Error("boom"))))
    await IO.all([sibling, failing], { concurrency: "unbounded" }).run()
    await tick(5)
    expect(seen.aborted).toBe(true)
    expect(seen.afterStep).toBe(false)
  })

  it("still runs an interrupted sibling's bracket release", async () => {
    const released: string[] = []
    const sibling = IO.bracket(
      IO.succeed("conn"),
      () => IO.async((signal) => new Promise<number>((resolve) => signal?.addEventListener("abort", () => resolve(0)))),
      (r) => IO.sync(() => void released.push(r)),
    )
    const failing = IO.async(() => tick(5).then(() => Promise.reject(new Error("boom"))))
    await IO.all([sibling, failing], { concurrency: 2 }).run()
    await tick(5)
    expect(released).toEqual(["conn"])
  })

  it("is interrupted from outside like any effect", async () => {
    const started = { n: 0 }
    const slow = IO.async((signal) => {
      started.n += 1
      return new Promise<number>((_, reject) => signal?.addEventListener("abort", () => reject(new Error("stop"))))
    })
    const { result, cancel } = IO.all([slow, slow, slow], { concurrency: "unbounded" }).runCancellable()
    await tick(5)
    cancel()
    await expect(result).resolves.toSatisfy((either: { isLeft: () => boolean }) => either.isLeft())
    expect(started.n).toBe(3)
  })

  it("leaves the thunks' signal live after every effect succeeds", async () => {
    const signals: Array<AbortSignal | undefined> = []
    const effect = IO.async((signal) => {
      signals.push(signal)
      return tick(2).then(() => 1)
    })
    expect(await IO.all([effect, effect, effect], { concurrency: "unbounded" }).runOrThrow()).toEqual([1, 1, 1])
    expect(signals).toHaveLength(3)
    expect(signals.every((s) => s !== undefined && !s.aborted)).toBe(true)
  })

  it("returns a sibling's defect as Die", async () => {
    const stuck = IO.async(() => new Promise<number>(() => {}))
    const dying = IO.sync<number>(() => {
      throw new Error("bug")
    })
    const exit = await IO.all([stuck, dying], { concurrency: 2 }).runExit()
    expect(exit.isDie()).toBe(true)
  })

  it("keeps an inner IO.all's failure from interrupting the outer one's other effects", async () => {
    const seen = { outerAborted: false }
    const outerSibling = IO.async(async (signal) => {
      await tick(20)
      seen.outerAborted = signal?.aborted ?? false
      return "outer"
    })
    const inner = IO.all([IO.fail("inner"), IO.async(() => tick(20).then(() => 1))], {
      concurrency: "unbounded",
    }).recover([])
    const effects: ReadonlyArray<IO<never, unknown, unknown>> = [inner, outerSibling]
    const result = await IO.all(effects, { concurrency: "unbounded" }).runOrThrow()
    expect(result).toEqual([[], "outer"])
    expect(seen.outerAborted).toBe(false)
  })

  it("starts only as many workers as there are effects when concurrency is larger", async () => {
    const gauge = { now: 0, max: 0 }
    const result = await IO.all([tracked(gauge, 1, 5), tracked(gauge, 2, 5)], { concurrency: 10 }).runOrThrow()
    expect(result).toEqual([1, 2])
    expect(gauge.max).toBe(2)
  })

  it("rejects a bad concurrency when the IO is built", () => {
    expect(() => IO.all([IO.succeed(1)], { concurrency: 0 })).toThrow(RangeError)
    expect(() => IO.forEach([1], IO.succeed, { concurrency: 1.5 })).toThrow(RangeError)
  })

  it("runs synchronously under runSync, in order", () => {
    const order: number[] = []
    const effects = [1, 2, 3].map((n) => IO.sync(() => (order.push(n), n * 10)))
    expect(IO.all(effects, { concurrency: 2 }).runSyncOrThrow()).toEqual([10, 20, 30])
    expect(order).toEqual([1, 2, 3])
  })
})

describe("IO.forEach concurrency", () => {
  it("runs up to `concurrency` at once and calls `f` only when the IO runs", async () => {
    const gauge = { now: 0, max: 0 }
    const calls = { n: 0 }
    const io = IO.forEach(
      [1, 2, 3, 4],
      (n) => {
        calls.n += 1
        return tracked(gauge, n * 2, 5)
      },
      { concurrency: 2 },
    )
    expect(calls.n).toBe(0)
    expect(await io.runOrThrow()).toEqual([2, 4, 6, 8])
    expect(gauge.max).toBe(2)
  })

  it("returns an empty array for no items", async () => {
    expect(await IO.forEach([], IO.succeed, { concurrency: 2 }).runOrThrow()).toEqual([])
  })
})

describe("abort signal for async thunks", () => {
  it("is undefined outside an interruptOn region", async () => {
    const received: Array<AbortSignal | undefined> = []
    await IO.async((signal) => {
      received.push(signal)
      return Promise.resolve(1)
    }).run()
    expect(received).toEqual([undefined])
  })

  it("aborts when the region is cancelled, so a fetch-style call can stop", async () => {
    const controller = new AbortController()
    const seen = { aborted: false }
    const io = IO.tryPromise({
      try: (signal) =>
        new Promise<number>((_, reject) =>
          signal?.addEventListener("abort", () => {
            seen.aborted = true
            reject(new Error("aborted"))
          }),
        ),
      catch: (e) => e as Error,
    }).interruptOn(controller.signal)
    const running = io.run()
    await tick(5)
    controller.abort()
    await running
    expect(seen.aborted).toBe(true)
  })

  it("reaches the thunk through runExit({ signal })", async () => {
    const controller = new AbortController()
    const running = IO.async(
      (signal) =>
        new Promise<number>((_, reject) => signal?.addEventListener("abort", () => reject(new Error("stop")))),
    ).runExit({ signal: controller.signal })
    controller.abort()
    expect((await running).isInterrupted()).toBe(true)
  })

  it("arrives in the first parameter, so a thunk with its own optional parameter must be wrapped", async () => {
    const controller = new AbortController()
    const load = (page: unknown = 1): Promise<unknown> => Promise.resolve(page)
    const unwrapped = await IO.async(load as (signal?: AbortSignal) => Promise<unknown>)
      .interruptOn(controller.signal)
      .runOrThrow()
    expect(unwrapped).toBeInstanceOf(AbortSignal)
    expect(
      await IO.async(() => load())
        .interruptOn(controller.signal)
        .runOrThrow(),
    ).toBe(1)
  })

  it("tryAsync detaches from the caller's signal when the function throws synchronously", async () => {
    const caller = new AbortController()
    const region = new AbortController()
    const added = { n: 0, removed: 0 }
    const add = caller.signal.addEventListener.bind(caller.signal)
    const remove = caller.signal.removeEventListener.bind(caller.signal)
    caller.signal.addEventListener = ((...args: Parameters<typeof add>) => {
      added.n += 1
      return add(...args)
    }) as typeof add
    caller.signal.removeEventListener = ((...args: Parameters<typeof remove>) => {
      added.removed += 1
      return remove(...args)
    }) as typeof remove
    const io = IO.tryAsync(
      () => {
        throw new Error("sync")
      },
      (e) => e as Error,
      caller.signal,
    ).interruptOn(region.signal)
    await io.run()
    expect(added.n).toBeGreaterThan(0)
    expect(added.removed).toBe(added.n)
  })

  it("tryAsync with no caller signal gets the region's signal, and undefined outside a region", async () => {
    const region = new AbortController()
    const seen: Array<AbortSignal | undefined> = []
    const call = IO.tryAsync(
      (signal) => {
        seen.push(signal)
        return new Promise<number>((_, reject) => signal?.addEventListener("abort", () => reject(new Error("stop"))))
      },
      (e) => e as Error,
    )
    const running = call.interruptOn(region.signal).run()
    await tick(5)
    region.abort()
    await running
    expect(seen[0]?.aborted).toBe(true)

    await IO.tryAsync(
      (signal) => {
        seen.push(signal)
        return Promise.resolve(1)
      },
      (e) => e as Error,
    ).run()
    expect(seen[1]).toBeUndefined()
  })

  it("tryAsync combines the caller's signal with the region's", async () => {
    const caller = new AbortController()
    const region = new AbortController()
    const seen: { signal?: AbortSignal } = {}
    const io = IO.tryAsync(
      (signal) => {
        seen.signal = signal
        return new Promise<number>((_, reject) => signal?.addEventListener("abort", () => reject(new Error("stop"))))
      },
      (e) => e as Error,
      caller.signal,
    ).interruptOn(region.signal)
    const running = io.run()
    await tick(5)
    expect(seen.signal?.aborted).toBe(false)
    region.abort()
    await running
    expect(seen.signal?.aborted).toBe(true)
  })
})
