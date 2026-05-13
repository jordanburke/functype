import { act, renderHook } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { useList } from "../../src/hooks/useList"

describe("useList", () => {
  it("starts empty when no initial", () => {
    const { result } = renderHook(() => useList<number>())
    expect(result.current.value.toArray()).toEqual([])
  })

  it("starts with provided initial array", () => {
    const { result } = renderHook(() => useList<number>([1, 2, 3]))
    expect(result.current.value.toArray()).toEqual([1, 2, 3])
  })

  it("add appends an item immutably", () => {
    const { result } = renderHook(() => useList<number>([1]))
    act(() => result.current.add(2))
    expect(result.current.value.toArray()).toEqual([1, 2])
  })

  it("remove deletes the matching item", () => {
    const { result } = renderHook(() => useList<number>([1, 2, 3]))
    act(() => result.current.remove(2))
    expect(result.current.value.toArray()).toEqual([1, 3])
  })

  it("removeAt deletes by index", () => {
    const { result } = renderHook(() => useList<number>([10, 20, 30]))
    act(() => result.current.removeAt(0))
    expect(result.current.value.toArray()).toEqual([20, 30])
  })

  it("clear empties the list", () => {
    const { result } = renderHook(() => useList<number>([1, 2]))
    act(() => result.current.clear())
    expect(result.current.value.toArray()).toEqual([])
  })

  it("filter returns a derived List", () => {
    const { result } = renderHook(() => useList<number>([1, 2, 3, 4]))
    const evens = result.current.filter((n) => n % 2 === 0)
    expect(evens.toArray()).toEqual([2, 4])
  })
})
