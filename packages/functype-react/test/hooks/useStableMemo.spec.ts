import { renderHook } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"

import { structuralEq } from "../../src/hooks/eq"
import { useStableMemo } from "../../src/hooks/useStableMemo"

describe("useStableMemo", () => {
  it("returns the same memoized value when deps are equal under comparator", () => {
    const factory = vi.fn(() => ({ x: 1 }))
    const { result, rerender } = renderHook(({ dep }) => useStableMemo(factory, [dep], [structuralEq]), {
      initialProps: { dep: { a: 1 } },
    })
    const first = result.current
    rerender({ dep: { a: 1 } })
    expect(result.current).toBe(first)
    expect(factory).toHaveBeenCalledTimes(1)
  })

  it("recomputes when deps change under comparator", () => {
    const factory = vi.fn(() => ({}))
    const { rerender } = renderHook(({ dep }) => useStableMemo(factory, [dep], [structuralEq]), {
      initialProps: { dep: { a: 1 } },
    })
    rerender({ dep: { a: 2 } })
    expect(factory).toHaveBeenCalledTimes(2)
  })
})
