import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { IO, TimeoutError } from "@/io"

/**
 * `timeout` used to leave its timer pending after the effect won, which kept a Node process alive
 * for the whole duration (`IO.succeed(1).timeout(60_000)` held the event loop open for a minute).
 */
describe("timeout clears its timer", () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it("leaves no timer behind when the effect wins", async () => {
    await expect(IO.succeed(1).timeout(60_000).runOrThrow()).resolves.toBe(1)
    expect(vi.getTimerCount()).toBe(0)
  })

  it("leaves no timer behind when the effect fails first", async () => {
    const result = await IO.fail("nope").timeout(60_000).run()
    expect(result.isLeft()).toBe(true)
    expect(vi.getTimerCount()).toBe(0)
  })

  it("leaves no timer behind via timeoutTo and IO.timeout", async () => {
    await IO.succeed("v").timeoutTo(60_000, "fallback").runOrThrow()
    await IO.timeout(IO.succeed(2), 60_000).runOrThrow()
    expect(vi.getTimerCount()).toBe(0)
  })

  it("still times out when the timer wins", async () => {
    const slow = IO.async(() => new Promise<number>((resolve) => setTimeout(() => resolve(1), 1_000)))
    const pending = slow.timeout(10).run()
    await vi.advanceTimersByTimeAsync(10)
    const result = await pending
    expect(
      result.fold(
        (e) => e instanceof TimeoutError,
        () => false,
      ),
    ).toBe(true)
  })
})
