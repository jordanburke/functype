import { act, renderHook } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { Right } from "functype/either"

import { useEither } from "../../src/hooks/useEither"

describe("useEither", () => {
  it("starts at the provided initial value", () => {
    const initial = Right<string, number>(7)
    const { result } = renderHook(() => useEither<string, number>(initial))
    expect(result.current.value.isRight()).toBe(true)
    expect(
      result.current.fold(
        () => 0,
        (a) => a,
      ),
    ).toBe(7)
  })

  it("setRight transitions to Right", () => {
    const { result } = renderHook(() => useEither<string, number>(Right("ok" as unknown as never)))
    act(() => result.current.setRight(99))
    expect(
      result.current.fold(
        () => -1,
        (a) => a,
      ),
    ).toBe(99)
  })

  it("setLeft transitions to Left", () => {
    const { result } = renderHook(() => useEither<string, number>(Right(1)))
    act(() => result.current.setLeft("nope"))
    expect(result.current.value.isLeft()).toBe(true)
    expect(
      result.current.fold(
        (e) => e,
        () => "",
      ),
    ).toBe("nope")
  })
})
