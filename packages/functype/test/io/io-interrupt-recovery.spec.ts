import { describe, expect, it } from "vitest"

import { InterruptedError, IO } from "@/io"

/**
 * Interruption is control flow, not a domain failure: it must survive every recovery
 * combinator. Before the fix, `.recover()` absorbed it on both interpreters (and
 * `.recoverWith()` / `.fold()` absorbed it on the sync one), so a cancelled effect
 * silently resolved with the fallback.
 *
 * Each recovery case is paired with failure/success regressions, so the guard can't be
 * "fixed" by simply making recovery stop working.
 */
describe("interruption is not recoverable", () => {
  describe("async interpreter", () => {
    it("recover passes interruption through", async () => {
      const exit = await IO.interrupt().recover(42).runExit()

      expect(exit.isSuccess()).toBe(false)
      expect(exit.isInterrupted()).toBe(true)
    })

    it("recoverWith passes interruption through", async () => {
      const exit = await IO.interrupt()
        .recoverWith(() => IO.succeed(42))
        .runExit()

      expect(exit.isInterrupted()).toBe(true)
    })

    it("fold passes interruption through", async () => {
      const exit = await IO.interrupt()
        .fold(
          () => "recovered",
          () => "ok",
        )
        .runExit()

      expect(exit.isInterrupted()).toBe(true)
    })

    it("timeoutTo passes interruption through", async () => {
      const exit = await IO.interrupt().timeoutTo(1_000, "fallback").runExit()

      expect(exit.isInterrupted()).toBe(true)
    })

    it("surfaces interruption as Left(InterruptedError) from run()", async () => {
      const result = await IO.interrupt().recover(42).run()

      expect(result.isLeft()).toBe(true)
      expect(result.isLeft() && result.value).toBeInstanceOf(InterruptedError)
    })

    // Regressions: recovery must still work for the cases it is *for*.
    it("still recovers a genuine failure", async () => {
      const exit = await IO.fail(new Error("boom")).recover(42).runExit()

      expect(exit.isSuccess()).toBe(true)
      expect(exit.orThrow()).toBe(42)
    })

    it("still passes a success through untouched", async () => {
      const exit = await IO.succeed(1).recover(42).runExit()

      expect(exit.orThrow()).toBe(1)
    })

    it("still recovers a defect", async () => {
      const exit = await IO.sync(() => {
        throw new Error("defect")
      })
        .recover(42)
        .runExit()

      expect(exit.orThrow()).toBe(42)
    })
  })

  describe("sync interpreter", () => {
    it("recover passes interruption through", () => {
      const result = IO.interrupt().recover(42).runSync()

      expect(result.isLeft()).toBe(true)
      expect(result.isLeft() && result.value).toBeInstanceOf(InterruptedError)
    })

    it("recoverWith passes interruption through", () => {
      const result = IO.interrupt()
        .recoverWith(() => IO.succeed(42))
        .runSync()

      expect(result.isLeft()).toBe(true)
      expect(result.isLeft() && result.value).toBeInstanceOf(InterruptedError)
    })

    it("fold passes interruption through", () => {
      const result = IO.interrupt()
        .fold(
          () => "recovered",
          () => "ok",
        )
        .runSync()

      expect(result.isLeft()).toBe(true)
      expect(result.isLeft() && result.value).toBeInstanceOf(InterruptedError)
    })

    // Regressions.
    it("still recovers a genuine failure", () => {
      const result = IO.fail(new Error("boom")).recover(42).runSync()

      expect(result.isRight()).toBe(true)
      expect(result.isRight() && result.value).toBe(42)
    })

    it("still passes a success through untouched", () => {
      const result = IO.succeed(1).recover(42).runSync()

      expect(result.isRight() && result.value).toBe(1)
    })

    it("still recovers a defect", () => {
      const result = IO.sync(() => {
        throw new Error("defect")
      })
        .recover(42)
        .runSync()

      expect(result.isRight() && result.value).toBe(42)
    })
  })

  // Interruption must not be swallowed by a recovery boundary nested anywhere in the
  // chain — this is the shape that matters once external cancellation lands (#242).
  it("survives recovery nested mid-chain", async () => {
    const exit = await IO.succeed(1)
      .flatMap(() => IO.interrupt())
      .recover(99)
      .map((n) => n)
      .runExit()

    expect(exit.isInterrupted()).toBe(true)
  })
})
