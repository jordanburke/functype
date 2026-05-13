import { act, renderHook } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import { List } from "functype"

import { invalid, valid, type Validated } from "../../src/forms/Validated"
import { useValidatedForm } from "../../src/forms/useValidatedForm"

type Form = { email: string; age: number }

const validate = (s: Form): Validated<string, Form> => {
  const errs = List<string>([])
    .concat(s.email.includes("@") ? List([]) : List(["email must contain @"]))
    .concat(s.age >= 18 ? List([]) : List(["age must be 18+"]))
  return errs.isEmpty ? valid(s) : invalid(errs)
}

describe("useValidatedForm", () => {
  it("accumulates multiple field errors applicatively", () => {
    const { result } = renderHook(() => useValidatedForm<Form>({ initial: { email: "no-at-sign", age: 12 }, validate }))
    expect(result.current.isValid).toBe(false)
    expect(result.current.errors.toArray()).toEqual(["email must contain @", "age must be 18+"])
  })

  it("setField updates one key without disturbing others", () => {
    const { result } = renderHook(() => useValidatedForm<Form>({ initial: { email: "", age: 0 }, validate }))
    act(() => result.current.setField("email", "a@b.c"))
    expect(result.current.values.email).toBe("a@b.c")
    expect(result.current.values.age).toBe(0)
    expect(result.current.errors.toArray()).toEqual(["age must be 18+"])
  })

  it("handleSubmit blocks invalid forms and fires on valid", () => {
    const onValid = vi.fn()
    const preventDefault = vi.fn()
    const { result } = renderHook(() => useValidatedForm<Form>({ initial: { email: "no", age: 5 }, validate }))

    act(() => result.current.handleSubmit(onValid)({ preventDefault } as never))
    expect(preventDefault).toHaveBeenCalled()
    expect(onValid).not.toHaveBeenCalled()

    act(() => result.current.setField("email", "a@b.c"))
    act(() => result.current.setField("age", 21))
    act(() => result.current.handleSubmit(onValid)({ preventDefault: vi.fn() } as never))
    expect(onValid).toHaveBeenCalledWith({ email: "a@b.c", age: 21 })
  })

  it("reset returns to the initial values", () => {
    const initial: Form = { email: "init@x.y", age: 30 }
    const { result } = renderHook(() => useValidatedForm<Form>({ initial, validate }))
    act(() => result.current.setField("age", 99))
    act(() => result.current.reset())
    expect(result.current.values).toEqual(initial)
  })
})
