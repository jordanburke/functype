import { describe, expect, it } from "vitest"

import { InterruptedError, IO, TimeoutError } from "@/io"

/**
 * `timeoutTo(ms, fallback)` was `timeout(ms).recover(fallback)`, and `recover` replaces every failure.
 * So an effect that failed fast with its own error, or died, came back as the fallback, though the type
 * `IO<R, E, A | B>` keeps `E`. Only the deadline produces the fallback now.
 */
describe("timeoutTo", () => {
  it("returns the fallback when the deadline passes", async () => {
    const result = await IO.sleep(200)
      .map(() => "late")
      .timeoutTo(10, "fallback")
      .runOrThrow()

    expect(result).toBe("fallback")
  })

  it("returns the effect's value when it finishes first", async () => {
    await expect(IO.succeed("on time").timeoutTo(1_000, "fallback").runOrThrow()).resolves.toBe("on time")
  })

  it("passes the effect's own typed failure through", async () => {
    const own = new Error("own failure")
    const result = await IO.fail(own).timeoutTo(1_000, "fallback").run()

    expect(result.isLeft()).toBe(true)
    expect(
      result.fold(
        (e) => e,
        () => undefined,
      ),
    ).toBe(own)
  })

  it("passes an inner timeout's TimeoutError through, not as its own deadline", async () => {
    const result = await IO.sleep(200).timeout(10).timeoutTo(1_000, "fallback").run()

    const error = result.fold(
      (e) => e,
      () => undefined,
    )
    expect(error).toBeInstanceOf(TimeoutError)
    expect((error as TimeoutError).duration).toBe(10)
  })

  it("stays interrupted when an outer cancel fires before the deadline, even if the effect ignores it", async () => {
    const ignoring = IO.async(() => new Promise<string>((resolve) => setTimeout(() => resolve("late"), 200)))
    const controller = new AbortController()
    setTimeout(() => controller.abort(), 10)

    const exit = await ignoring.timeoutTo(60, "fallback").interruptOn(controller.signal).runExit()

    // interruptOn reports its own cancel as a typed InterruptedError, as it does for timeout().
    expect(exit.isFailure()).toBe(true)
    expect(exit.isFailure() && exit.error).toBeInstanceOf(InterruptedError)
  })

  it("passes a defect through as a defect", async () => {
    const exit = await IO.sync((): string => {
      throw new Error("bug")
    })
      .timeoutTo(1_000, "fallback")
      .runExit()

    expect(exit.isDie()).toBe(true)
  })
})
