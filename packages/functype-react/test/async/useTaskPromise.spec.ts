import { renderHook } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { useTaskPromise } from "../../src/async/useTaskPromise"

describe("useTaskPromise", () => {
  it("returns the same Promise reference across renders with equal deps", () => {
    const { result, rerender } = renderHook(({ dep }) => useTaskPromise(async () => dep, [dep]), {
      initialProps: { dep: 1 },
    })
    const first = result.current
    rerender({ dep: 1 })
    expect(result.current).toBe(first)
  })

  it("returns a new Promise when deps change", () => {
    const { result, rerender } = renderHook(({ dep }) => useTaskPromise(async () => dep, [dep]), {
      initialProps: { dep: 1 },
    })
    const first = result.current
    rerender({ dep: 2 })
    expect(result.current).not.toBe(first)
  })

  it("the resolved outcome carries the value when the task succeeds", async () => {
    const { result } = renderHook(() => useTaskPromise(async () => 42, []))
    const outcome = await result.current
    expect(outcome.isOk()).toBe(true)
    if (outcome.isOk()) {
      expect(outcome.value).toBe(42)
    }
  })
})
