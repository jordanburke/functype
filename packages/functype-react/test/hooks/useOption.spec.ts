import { act, renderHook } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { useOption } from "../../src/hooks/useOption"

describe("useOption", () => {
  it("starts as None when no initial provided", () => {
    const { result } = renderHook(() => useOption<number>())
    expect(result.current.value.isNone()).toBe(true)
  })

  it("starts as Some when an initial is provided", () => {
    const { result } = renderHook(() => useOption(42))
    expect(result.current.value.isSome()).toBe(true)
    expect(
      result.current.fold(
        () => 0,
        (a) => a,
      ),
    ).toBe(42)
  })

  it("set(null) becomes None", () => {
    const { result } = renderHook(() => useOption(1))
    act(() => result.current.set(null))
    expect(result.current.value.isNone()).toBe(true)
  })

  it("clear() returns to None", () => {
    const { result } = renderHook(() => useOption(1))
    act(() => result.current.clear())
    expect(result.current.value.isNone()).toBe(true)
  })

  it("map projects Some, leaves None alone", () => {
    const { result } = renderHook(() => useOption(2))
    const doubled = result.current.map((a) => a * 2)
    expect(
      doubled.fold(
        () => 0,
        (a) => a,
      ),
    ).toBe(4)
  })
})
