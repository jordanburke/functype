/**
 * Try is a discriminated union of SuccessOf and FailureOf (#276 §9a), so TypeScript narrows it the
 * way it narrows Either. A Success also carries its value as `value`, which it had no field for.
 */
import { describe, expect, expectTypeOf, it } from "vitest"

import { type FailureOf, type SuccessOf, Try } from "@/index"

const valueOrMinusOne = (t: Try<number>): number => {
  if (t.isFailure()) return -1
  expectTypeOf(t).toEqualTypeOf<SuccessOf<number>>()
  return t.value
}

describe("Try narrows", () => {
  it("on isSuccess(), isFailure() and _tag", () => {
    expect(valueOrMinusOne(Try(() => 2))).toBe(2)
    expect(
      valueOrMinusOne(
        Try(() => {
          throw new Error("x")
        }),
      ),
    ).toBe(-1)
    const t: Try<string> = Try(() => "a")
    if (t._tag === "Failure") expectTypeOf(t.error).toEqualTypeOf<Error>()
    else expectTypeOf(t.value).toEqualTypeOf<string>()
    if (t.isFailure()) expectTypeOf(t).toEqualTypeOf<FailureOf<string>>()
  })

  it("through the companion guards", () => {
    const t: Try<number> = Try(() => 4)
    if (Try.isSuccess(t)) expectTypeOf(t.value).toEqualTypeOf<number>()
    if (Try.isFailure(t)) expectTypeOf(t.error).toEqualTypeOf<Error>()
    expect(Try.isSuccess(t)).toBe(true)
  })
})
