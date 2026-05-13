import { renderHook } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"

import { structuralEq } from "../../src/hooks/eq"
import { useStableEffect } from "../../src/hooks/useStableEffect"

describe("useStableEffect", () => {
  it("runs effect on first render", () => {
    const effect = vi.fn()
    renderHook(() => useStableEffect(effect, [1]))
    expect(effect).toHaveBeenCalledTimes(1)
  })

  it("skips effect when deps are equal under custom comparator", () => {
    const effect = vi.fn()
    const obj = { a: 1 }
    const { rerender } = renderHook(({ dep }) => useStableEffect(effect, [dep], [structuralEq]), {
      initialProps: { dep: obj },
    })
    rerender({ dep: { a: 1 } })
    expect(effect).toHaveBeenCalledTimes(1)
  })

  it("re-runs effect when deps change under custom comparator", () => {
    const effect = vi.fn()
    const { rerender } = renderHook(({ dep }) => useStableEffect(effect, [dep], [structuralEq]), {
      initialProps: { dep: { a: 1 } },
    })
    rerender({ dep: { a: 2 } })
    expect(effect).toHaveBeenCalledTimes(2)
  })

  it("falls back to referenceEq when no comparator supplied", () => {
    const effect = vi.fn()
    const { rerender } = renderHook(({ dep }: { dep: object }) => useStableEffect(effect, [dep]), {
      initialProps: { dep: { a: 1 } },
    })
    rerender({ dep: { a: 1 } }) // different reference
    expect(effect).toHaveBeenCalledTimes(2)
  })
})
