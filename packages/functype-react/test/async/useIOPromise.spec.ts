import { renderHook } from "@testing-library/react"
import { IO } from "functype/io"
import { describe, expect, it } from "vitest"

import { useIOPromise } from "../../src/async/useIOPromise"

describe("useIOPromise", () => {
  it("returns the same Promise reference across renders with equal deps", () => {
    const { result, rerender } = renderHook(({ dep }) => useIOPromise(() => IO.succeed(dep), [dep]), {
      initialProps: { dep: 1 },
    })
    const first = result.current
    rerender({ dep: 1 })
    expect(result.current).toBe(first)
  })

  it("returns a new Promise when deps change", () => {
    const { result, rerender } = renderHook(({ dep }) => useIOPromise(() => IO.succeed(dep), [dep]), {
      initialProps: { dep: 1 },
    })
    const first = result.current
    rerender({ dep: 2 })
    expect(result.current).not.toBe(first)
  })

  it("resolves to an Exit that keeps success, failure and defect apart", async () => {
    const ok = await renderHook(() => useIOPromise(() => IO.succeed(42), [])).result.current
    expect(ok.isSuccess() && ok.orThrow()).toBe(42)

    const failed = await renderHook(() => useIOPromise(() => IO.fail("boom" as const), [])).result.current
    expect(failed.isFailure()).toBe(true)

    const crashed = await renderHook(() =>
      useIOPromise(
        () =>
          IO.sync(() => {
            throw new TypeError("bug")
          }),
        [],
      ),
    ).result.current
    expect(crashed.isDie()).toBe(true)
  })
})
