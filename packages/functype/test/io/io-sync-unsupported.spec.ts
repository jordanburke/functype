import { describe, expect, it } from "vitest"

import { IO, UnsupportedSyncOperationError } from "@/io"

/**
 * `timeout` and `race` have no synchronous semantics, so `runSync` throws
 * `UnsupportedSyncOperationError` when it reaches one. That throw is a *programmer*
 * error — the effect was built for the wrong terminal — so it must not be catchable by
 * the recovery combinators.
 *
 * Before #246 it was a plain `Error`, indistinguishable from a failed effect: any
 * downstream `.recover()` absorbed it and handed back the fallback, so
 * `IO.succeed(1).timeoutTo(50, 99).runSync()` returned `Right(99)` — a successful effect
 * silently yielding the wrong value, with no error anywhere.
 *
 * Each case is paired with an async counterpart, because the async interpreter supports
 * both combinators and must be entirely unaffected.
 */
describe("unsupported sync operations are not recoverable", () => {
  // In 2.0 the diagnostic is a defect, so `runSync()` throws it rather than returning it in the
  // Left (#276 §3).
  describe("the diagnostic survives every recovery boundary", () => {
    it("timeoutTo does not swallow it into the fallback", () => {
      expect(() => IO.succeed(1).timeoutTo(50, 99).runSync()).toThrow(UnsupportedSyncOperationError)
    })

    it("recover does not swallow it", () => {
      expect(() => IO.succeed(1).timeout(50).recover(7).runSync()).toThrow(UnsupportedSyncOperationError)
    })

    it("recoverWith does not swallow it", () => {
      expect(() =>
        IO.succeed(1)
          .timeout(50)
          .recoverWith(() => IO.succeed(7))
          .runSync(),
      ).toThrow(UnsupportedSyncOperationError)
    })

    it("fold does not swallow it", () => {
      expect(() =>
        IO.succeed(1)
          .timeout(50)
          .fold(
            () => "recovered",
            () => "ok",
          )
          .runSync(),
      ).toThrow(UnsupportedSyncOperationError)
    })

    it("mapError does not rewrite it into a domain error", () => {
      expect(() =>
        IO.succeed(1)
          .timeout(50)
          .mapError(() => new Error("mapped"))
          .runSync(),
      ).toThrow(UnsupportedSyncOperationError)
    })

    it("race is guarded the same way", () => {
      expect(() =>
        IO.race([IO.succeed(1)])
          .recover(7)
          .runSync(),
      ).toThrow(UnsupportedSyncOperationError)
    })

    it("runSyncOrThrow throws it too", () => {
      expect(() => IO.succeed(1).timeout(50).runSyncOrThrow()).toThrow(UnsupportedSyncOperationError)
    })
  })

  it("identifies which combinator was unsupported", () => {
    const operationOf = (run: () => unknown): string | undefined => {
      try {
        run()
        return undefined
      } catch (e) {
        return e instanceof UnsupportedSyncOperationError ? e.operation : undefined
      }
    }

    expect(operationOf(() => IO.succeed(1).timeout(50).runSync())).toBe("timeout")
    expect(operationOf(() => IO.race([IO.succeed(1)]).runSync())).toBe("race")
  })

  it("is still surfaced with no recovery in the chain", () => {
    expect(() => IO.succeed(1).timeout(50).runSync()).toThrow(UnsupportedSyncOperationError)
  })

  // The async interpreter supports both combinators — none of the above applies there.
  describe("async interpreter is unaffected", () => {
    it("timeoutTo returns the value of an effect that completes in time", async () => {
      const exit = await IO.succeed(1).timeoutTo(50, 99).runExit()

      expect(exit.isSuccess()).toBe(true)
      expect(exit.orThrow()).toBe(1)
    })

    it("race resolves normally", async () => {
      const exit = await IO.race([IO.succeed(1)]).runExit()

      expect(exit.orThrow()).toBe(1)
    })
  })

  // Regression: making the guard non-recoverable must not stop recovery working for the
  // ordinary failures it exists for.
  it("still recovers a genuine failure on the sync interpreter", () => {
    const result = IO.fail(new Error("boom")).recover(42).runSync()

    expect(result.isRight() && result.value).toBe(42)
  })
})
