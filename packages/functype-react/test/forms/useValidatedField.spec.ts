import { act, renderHook } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { invalid, valid } from "../../src/forms/Validated"
import { useValidatedField } from "../../src/forms/useValidatedField"

const minLen3 = (s: string) => (s.length >= 3 ? valid(s) : invalid(["too short"]))

describe("useValidatedField", () => {
  it("starts at the initial value and re-derives validation per render", () => {
    const { result } = renderHook(() => useValidatedField<string>({ initial: "abc", validate: minLen3 }))
    expect(result.current.value).toBe("abc")
    expect(result.current.isValid).toBe(true)
    expect(result.current.errors.toArray()).toEqual([])
  })

  it("collects errors when validate returns invalid", () => {
    const { result } = renderHook(() => useValidatedField<string>({ initial: "ab", validate: minLen3 }))
    expect(result.current.isValid).toBe(false)
    expect(result.current.errors.toArray()).toEqual(["too short"])
  })

  it("setValue updates the state and revalidates", () => {
    const { result } = renderHook(() => useValidatedField<string>({ initial: "ab", validate: minLen3 }))
    expect(result.current.isValid).toBe(false)
    act(() => result.current.setValue("abcd"))
    expect(result.current.isValid).toBe(true)
    expect(result.current.value).toBe("abcd")
  })

  it("bind() supplies value + onChange for native inputs", () => {
    const { result } = renderHook(() => useValidatedField<string>({ initial: "ab", validate: minLen3 }))
    const props = result.current.bind()
    expect(props.value).toBe("ab")
    act(() => props.onChange({ target: { value: "hello" } } as never))
    expect(result.current.value).toBe("hello")
  })
})
