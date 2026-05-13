import { act, renderHook } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { structuralEq } from "../../src/hooks/eq"
import { useStableState } from "../../src/hooks/useStableState"

describe("useStableState", () => {
  it("behaves like useState under the default Object.is comparator", () => {
    const { result } = renderHook(() => useStableState(0))
    expect(result.current[0]).toBe(0)
    act(() => result.current[1](1))
    expect(result.current[0]).toBe(1)
  })

  it("no-ops when the next value is equal under the comparator", () => {
    const { result } = renderHook(() => useStableState({ a: 1 }, structuralEq))
    const before = result.current[0]
    act(() => result.current[1]({ a: 1 }))
    expect(result.current[0]).toBe(before)
  })

  it("updates when the next value differs under the comparator", () => {
    const { result } = renderHook(() => useStableState({ a: 1 }, structuralEq))
    act(() => result.current[1]({ a: 2 }))
    expect(result.current[0]).toEqual({ a: 2 })
  })

  it("supports functional updates", () => {
    const { result } = renderHook(() => useStableState(0))
    act(() => result.current[1]((n) => n + 1))
    act(() => result.current[1]((n) => n + 1))
    expect(result.current[0]).toBe(2)
  })
})
