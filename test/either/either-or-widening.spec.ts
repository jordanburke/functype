import { describe, expect, it } from "vitest"

import type { Either } from "@/either/Either"
import { Left, Right } from "@/either/Either"

type NarrowErr = { kind: "A" }
type WideErr = { kind: "A" } | { kind: "B" }

describe("Either.or — L widening (regression #0.57)", () => {
  it("widens L to the union when alternative carries a wider L type", () => {
    const narrow: Either<NarrowErr, number> = Left({ kind: "A" })
    const fallback: Either<WideErr, number> = Right(42)

    const widened = narrow.or(fallback)
    const check: Either<NarrowErr | WideErr, number> = widened
    expect(check.orElse(-1)).toBe(42)
  })

  it("preserves same-L behavior: Right.or returns itself", () => {
    const r = Right<string, number>(1).or(Right<string, number>(2))
    expect(r.orElse(-1)).toBe(1)
  })

  it("preserves same-L behavior: Left.or returns alternative", () => {
    const r = Left<string, number>("err").or(Right<string, number>(99))
    expect(r.orElse(-1)).toBe(99)
  })
})
