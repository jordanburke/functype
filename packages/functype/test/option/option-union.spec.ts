/**
 * Option is a discriminated union of SomeOf and NoneOf (#276 §9a), so TypeScript narrows it the way
 * it narrows Either. Before, `if (o.isNone()) return; o.value` left `o.value` as `T | undefined`.
 */
import { describe, expect, expectTypeOf, it } from "vitest"

import { type NoneOf, None, Option, type SomeOf } from "@/index"

const valueAfterNoneGuard = (o: Option<number>): number => {
  if (o.isNone()) return -1
  expectTypeOf(o).toEqualTypeOf<SomeOf<number>>()
  return o.value
}

const valueAfterTagCheck = (o: Option<number>): number => (o._tag === "Some" ? o.value : -1)

describe("Option narrows", () => {
  it("on isNone(), isSome() and _tag", () => {
    expect(valueAfterNoneGuard(Option(2))).toBe(2)
    expect(valueAfterNoneGuard(None())).toBe(-1)
    expect(valueAfterTagCheck(Option(3))).toBe(3)
    const o: Option<string> = Option("a")
    if (o.isSome()) expectTypeOf(o.value).toEqualTypeOf<string>()
    else expectTypeOf(o).toEqualTypeOf<NoneOf<string>>()
  })

  it("through the companion guards", () => {
    const o: Option<number> = Option(4)
    if (Option.isSome(o)) expectTypeOf(o.value).toEqualTypeOf<number>()
    if (Option.isNone(o)) expectTypeOf(o.value).toEqualTypeOf<undefined>()
    expect(Option.isSome(o)).toBe(true)
  })
})
