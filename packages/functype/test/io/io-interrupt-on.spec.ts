import { describe, expect, expectTypeOf, it } from "vitest"

import type { Either } from "@/either"
import type { IO as IOType } from "@/io"
import { InterruptedError, IO } from "@/io"

/**
 * `interruptOn(signal)` makes a running effect stop when an `AbortSignal` fires (#242).
 *
 * Before it, IO had no cancellation propagation: `timeout` and `race` only stopped *waiting*
 * (`Promise.race`), and the effect ran on. The test that tells real cancellation from that is
 * the first one below: after the abort, the effect's own side effects must stop.
 */

const tick = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms))

/** Counts forever, one async step per iteration. Its error channel is `RepeatExhausted<number>`. */
const countingLoop = (counter: { n: number }) =>
  IO.iterate(
    0,
    (i: number) =>
      IO.sleep(1).map(() => {
        counter.n += 1
        return i + 1
      }),
    () => false,
    { max: 1_000_000 },
  )

const isInterruption = (result: Either<unknown, unknown>): boolean =>
  result.isLeft() && InterruptedError.is(result.value)

describe("IO.interruptOn", () => {
  it("stops a running loop: the counter doesn't move after the abort", async () => {
    const counter = { n: 0 }
    const controller = new AbortController()
    const pending = countingLoop(counter).interruptOn(controller.signal).run()

    await tick(20)
    controller.abort()
    const result = await pending

    expect(isInterruption(result)).toBe(true)
    const snapshot = counter.n
    expect(snapshot).toBeGreaterThan(0)
    await tick(100)
    expect(counter.n).toBe(snapshot)
  })

  it("runs nothing when the signal is already aborted", async () => {
    const ran = { n: 0 }
    const controller = new AbortController()
    controller.abort()

    const result = await IO.sync(() => {
      ran.n += 1
      return 1
    })
      .interruptOn(controller.signal)
      .run()

    expect(ran.n).toBe(0)
    expect(isInterruption(result)).toBe(true)
  })

  it("behaves like the plain effect when the signal never fires", async () => {
    const controller = new AbortController()
    expect((await IO.succeed(7).interruptOn(controller.signal).run()).orThrow()).toBe(7)

    const failed = await IO.fail("boom" as const)
      .interruptOn(controller.signal)
      .run()
    expect(failed.isLeft() && failed.value).toBe("boom")
  })

  it("catchTag outside the region handles the cancellation", async () => {
    const controller = new AbortController()
    const pending = countingLoop({ n: 0 })
      .interruptOn(controller.signal)
      .catchTag("InterruptedError", () => IO.succeed(-1))
      .run()
    await tick(5)
    controller.abort()
    expect((await pending).orThrow()).toBe(-1)
  })

  describe("recovery inside the region cannot swallow the cancellation", () => {
    it("retry stops: no further attempt runs after the abort", async () => {
      const attempts = { n: 0 }
      const controller = new AbortController()
      const result = await IO.sync(() => {
        attempts.n += 1
      })
        .flatMap(() => {
          controller.abort()
          return IO.fail("boom" as const)
        })
        .retry(5)
        .interruptOn(controller.signal)
        .run()

      expect(attempts.n).toBe(1)
      expect(isInterruption(result)).toBe(true)
    })

    it("an abort that arrives as a rejected request is reported as the cancellation, not recovered", async () => {
      const controller = new AbortController()
      const handlerCalls = { n: 0 }
      const request = IO.tryAsync(
        (signal) =>
          new Promise<number>((_, reject) =>
            signal?.addEventListener("abort", () => reject(new DOMException("Aborted", "AbortError"))),
          ),
        (cause) => {
          handlerCalls.n += 1
          return { _tag: "NetworkError" as const, cause }
        },
        controller.signal,
      )

      const pending = request.recover(42).interruptOn(controller.signal).run()
      await tick(5)
      controller.abort()
      const result = await pending

      expect(isInterruption(result)).toBe(true)
      expect(handlerCalls.n).toBe(0)
    })

    it("fold's handlers don't run after the abort", async () => {
      const controller = new AbortController()
      const result = await IO.sync(() => controller.abort())
        .flatMap(() => IO.fail("boom" as const))
        .fold(
          () => "handled",
          () => "ok",
        )
        .interruptOn(controller.signal)
        .run()

      expect(isInterruption(result)).toBe(true)
    })
  })

  describe("nested regions", () => {
    it("an outer cancellation passes through the inner region's recovery", async () => {
      const outer = new AbortController()
      const inner = new AbortController()
      const result = await IO.sleep(1)
        .flatMap(() => {
          outer.abort()
          return IO.fail("late" as const)
        })
        .interruptOn(inner.signal)
        .recover(0)
        .interruptOn(outer.signal)
        .run()

      expect(isInterruption(result)).toBe(true)
    })

    it("an inner cancellation is an ordinary typed failure outside the inner region", async () => {
      const outer = new AbortController()
      const inner = new AbortController()
      const result = await IO.sleep(1)
        .flatMap(() => {
          inner.abort()
          return IO.fail("late" as const)
        })
        .interruptOn(inner.signal)
        .recover(0)
        .interruptOn(outer.signal)
        .run()

      expect(result.orThrow()).toBe(0)
    })
  })

  describe("cleanup", () => {
    it("bracket releases exactly once when use is cut off, and a multi-step release completes", async () => {
      const log: string[] = []
      const controller = new AbortController()
      const pending = IO.bracket(
        IO.sync(() => {
          log.push("acquire")
          return "resource"
        }),
        () =>
          IO.sleep(30).map(() => {
            log.push("use finished")
          }),
        () =>
          IO.sync(() => {
            log.push("release 1")
          })
            .flatMap(() => IO.sleep(2))
            .flatMap(() =>
              IO.sync(() => {
                log.push("release 2")
              }),
            ),
      )
        .interruptOn(controller.signal)
        .run()

      await tick(5)
      controller.abort()
      const result = await pending

      expect(isInterruption(result)).toBe(true)
      expect(log).toEqual(["acquire", "release 1", "release 2"])
    })

    it("bracketExit's release sees an Interrupted exit", async () => {
      const controller = new AbortController()
      const seen: string[] = []
      const pending = IO.bracketExit(
        IO.succeed("resource"),
        // The step after the sleep is where the cancellation lands: a promise already in
        // flight (the sleep) can't be stopped, so a lone sleep would finish successfully.
        () => IO.sleep(30).map(() => "used"),
        (_, exit) =>
          IO.sync(() => {
            seen.push(exit.isInterrupted() ? "interrupted" : exit.isFailure() ? "failure" : "other")
          }),
      )
        .interruptOn(controller.signal)
        .run()

      await tick(5)
      controller.abort()
      await pending
      expect(seen).toEqual(["interrupted"])
    })
  })

  it("a defect after the abort is still reported as a defect", async () => {
    const controller = new AbortController()
    const exit = await IO.sync(() => {
      controller.abort()
      throw new TypeError("bug")
    })
      .recover(0)
      .interruptOn(controller.signal)
      .runExit()

    expect(exit.isDie()).toBe(true)
  })

  it("an IO.interrupt() inside the region becomes the region's typed failure", async () => {
    const controller = new AbortController()
    const result = await IO.interrupt()
      .interruptOn(controller.signal)
      .catchTag("InterruptedError", () => IO.succeed("handled"))
      .run()
    expect(result.orThrow()).toBe("handled")
  })

  it("without a region, interruption behaves as before", async () => {
    expect(isInterruption(await IO.interrupt().run())).toBe(true)
    expect((await IO.interrupt().recover(42).runExit()).isInterrupted()).toBe(true)
  })

  it("InterruptedError.is recognises the cancellation when E is unknown", async () => {
    const controller = new AbortController()
    controller.abort()
    const result = await IO.async(async () => 1)
      .interruptOn(controller.signal)
      .run()
    expect(result.isLeft() && InterruptedError.is(result.value)).toBe(true)
    expect(InterruptedError.is(new Error("x"))).toBe(false)
  })

  it("widens E with InterruptedError", () => {
    const signal = new AbortController().signal
    expectTypeOf(IO.succeed(1).interruptOn(signal)).toEqualTypeOf<IOType<never, InterruptedError, number>>()
    expectTypeOf(IO.fail("boom" as const).interruptOn(signal)).toEqualTypeOf<
      IOType<never, "boom" | InterruptedError, never>
    >()
  })

  describe("runSync", () => {
    it("a signal aborted before the run interrupts, and catchTag outside the region recovers", () => {
      const controller = new AbortController()
      controller.abort()
      const effect = IO.sync(() => 1).interruptOn(controller.signal)

      const result = effect.runSync()
      expect(isInterruption(result)).toBe(true)
      expect(
        effect
          .catchTag("InterruptedError", () => IO.succeed(-1))
          .runSync()
          .orThrow(),
      ).toBe(-1)
    })

    it("an IO.interrupt() inside the region is catchable outside it, as on the async path", () => {
      const controller = new AbortController()
      const result = IO.interrupt()
        .interruptOn(controller.signal)
        .catchTag("InterruptedError", () => IO.succeed("handled"))
        .runSync()
      expect(result.orThrow()).toBe("handled")
    })

    it("without a region, recover still cannot swallow an interruption", () => {
      expect(() => IO.interrupt().recover(42).runSyncOrThrow()).toThrow(InterruptedError)
    })
  })
})

describe("IO.runCancellable", () => {
  it("cancel() stops the effect and resolves to Left(InterruptedError)", async () => {
    const counter = { n: 0 }
    const { result, cancel } = countingLoop(counter).runCancellable()

    await tick(20)
    cancel()
    expect(isInterruption(await result)).toBe(true)
    const snapshot = counter.n
    await tick(100)
    expect(counter.n).toBe(snapshot)
  })

  it("resolves to the value when not cancelled, and cancel() afterwards does nothing", async () => {
    const { result, cancel } = IO.sleep(1)
      .map(() => "done")
      .runCancellable()
    expect((await result).orThrow()).toBe("done")
    cancel()
    expect((await result).orThrow()).toBe("done")
  })
})

describe("IO.runExit({ signal })", () => {
  it("stops the effect and returns Interrupted without widening E", async () => {
    const counter = { n: 0 }
    const controller = new AbortController()
    const pending = countingLoop(counter).runExit({ signal: controller.signal })

    await tick(20)
    controller.abort()
    const exit = await pending
    expect(exit.isInterrupted()).toBe(true)
    const snapshot = counter.n
    await tick(100)
    expect(counter.n).toBe(snapshot)
  })

  it("reports a failure caused by the abort as Interrupted, and a defect as a defect", async () => {
    const aborted = new AbortController()
    const failed = await IO.sync(() => aborted.abort())
      .flatMap(() => IO.fail("boom" as const))
      .runExit({ signal: aborted.signal })
    expect(failed.isInterrupted()).toBe(true)

    const crashed = new AbortController()
    const defect = await IO.sync(() => {
      crashed.abort()
      throw new TypeError("bug")
    }).runExit({ signal: crashed.signal })
    expect(defect.isDie()).toBe(true)
  })

  it("without a signal, or with one that never fires, behaves as before", async () => {
    expect((await IO.succeed(1).runExit()).isSuccess()).toBe(true)
    const live = new AbortController()
    const failed = await IO.fail("boom" as const).runExit({ signal: live.signal })
    expect(failed.isFailure()).toBe(true)
  })

  it("keeps E unchanged", () => {
    const signal = new AbortController().signal
    expectTypeOf(IO.fail("boom" as const).runExit({ signal })).resolves.toEqualTypeOf<
      Awaited<ReturnType<IOType<never, "boom", never>["runExit"]>>
    >()
  })
})
