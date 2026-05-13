import { act, renderHook } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { Try } from "functype/try"

import { useTry } from "../../src/hooks/useTry"

describe("useTry", () => {
  it("starts as Failure by default", () => {
    const { result } = renderHook(() => useTry<number>())
    expect(result.current.value.isFailure()).toBe(true)
  })

  it("respects a provided initial Success", () => {
    const { result } = renderHook(() => useTry<number>(Try.success(5)))
    expect(
      result.current.fold(
        () => 0,
        (a) => a,
      ),
    ).toBe(5)
  })

  it("setSuccess transitions to Success", () => {
    const { result } = renderHook(() => useTry<number>())
    act(() => result.current.setSuccess(11))
    expect(
      result.current.fold(
        () => 0,
        (a) => a,
      ),
    ).toBe(11)
  })

  it("setFailure transitions to Failure carrying the error", () => {
    const { result } = renderHook(() => useTry<number>(Try.success(1)))
    const err = new Error("boom")
    act(() => result.current.setFailure(err))
    expect(result.current.value.isFailure()).toBe(true)
    expect(
      result.current.fold(
        (e) => e.message,
        () => "",
      ),
    ).toBe("boom")
  })
})
