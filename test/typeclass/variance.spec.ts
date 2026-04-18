import { describe, expect, expectTypeOf, it } from "vitest"

import { List } from "@/list/List"
import { type Widen } from "@/typeclass"

/**
 * Tests for `Widen<A, B>` — the TS approximation of Scala's lower-bound
 * supertype constraint (`B >: A`). Ensures that:
 *   - default (B = A) flows through unchanged
 *   - supertype widening works
 *   - unrelated types resolve to `never`, rendering the method uncallable
 *
 * These guard against accidental loosening of the lower-bound enforcement
 * — if someone removes the Widen guard in a future refactor, these fail.
 */

describe("Widen<A, B>", () => {
  it("resolves to B when A extends B (identity case, B = A)", () => {
    // number extends number → Widen<number, number> = number
    expectTypeOf<Widen<number, number>>().toEqualTypeOf<number>()
  })

  it("resolves to B when B is a supertype of A", () => {
    // number extends (number | string) → Widen = number | string
    expectTypeOf<Widen<number, number | string>>().toEqualTypeOf<number | string>()
  })

  it("resolves to never when B is unrelated to A", () => {
    // number does NOT extend string → Widen resolves to never
    expectTypeOf<Widen<number, string>>().toEqualTypeOf<never>()
  })

  // Note: conditional types distribute over unions, so `Widen<A | B, X>` is
  // `(A extends X ? X : never) | (B extends X ? X : never)`. If any part of
  // the union extends X, that component of the result is non-never. This is
  // expected TS behavior; the supertype-enforcement at the call site comes
  // from the op parameter's (never, never) => never shape, which prevents
  // the callback from compiling even when Widen itself is partially inhabited.
})

describe("List.reduce with Widen enforcement", () => {
  it("infers B = A by default and produces an A result", () => {
    const xs: List<number> = List([1, 2, 3, 4])
    const sum = xs.reduce((a, b) => a + b)
    expectTypeOf(sum).toEqualTypeOf<number>()
    expect(sum).toBe(10)
  })

  it("accepts supertype B and widens result", () => {
    const xs: List<number> = List([1, 2, 3])
    const widened = xs.reduce<number | string>((a, b) => `${a}-${b}`)
    expectTypeOf(widened).toEqualTypeOf<number | string>()
    expect(widened).toBe("1-2-3")
  })

  it("rejects unrelated B at compile time (never-callback forces error)", () => {
    const xs: List<number> = List([1, 2, 3])
    // If Widen didn't enforce, this would compile and run as number addition typed as string.
    // @ts-expect-error — string is not a supertype of number; callback resolves to (never, never) => never
    xs.reduce<string>((a, b) => a + b)
    // Sanity: the runtime call doesn't matter since the line above is a type error
    expect(xs.toArray()).toEqual([1, 2, 3])
  })
})
