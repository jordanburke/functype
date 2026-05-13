import { renderHook } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { structuralEq } from "../../src/hooks/eq"
import { useStableCallback } from "../../src/hooks/useStableCallback"

describe("useStableCallback", () => {
  it("returns the same callback when deps are equal under comparator", () => {
    const { result, rerender } = renderHook(({ dep }) => useStableCallback(() => dep.a, [dep], [structuralEq]), {
      initialProps: { dep: { a: 1 } },
    })
    const first = result.current
    rerender({ dep: { a: 1 } })
    expect(result.current).toBe(first)
  })

  it("returns a new callback when deps change", () => {
    const { result, rerender } = renderHook(({ dep }) => useStableCallback(() => dep.a, [dep], [structuralEq]), {
      initialProps: { dep: { a: 1 } },
    })
    const first = result.current
    rerender({ dep: { a: 2 } })
    expect(result.current).not.toBe(first)
  })
})
