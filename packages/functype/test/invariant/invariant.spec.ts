import { describe, expect, expectTypeOf, it } from "vitest"

import { invariant, InvariantViolation } from "@/invariant"

/**
 * `invariant(condition, message)` is functype's one-line bug check (#342). It throws only when the
 * condition is falsy — a programmer error, never an expected failure (those return Either) — and it
 * narrows the condition for the code after it, which a JSDoc tag cannot do.
 */

describe("invariant", () => {
  it("returns normally when the condition holds", () => {
    expect(() => invariant(true, "unreachable")).not.toThrow()
    expect(() => invariant(1, "unreachable")).not.toThrow()
    expect(() => invariant("x", "unreachable")).not.toThrow()
  })

  it.each([false, 0, "", null, undefined])("throws an InvariantViolation when the condition is %s", (falsy) => {
    expect(() => invariant(falsy, "step must be non-negative")).toThrow("step must be non-negative")
  })

  it("throws a tagged error a handler can tell apart from ordinary failures", () => {
    const caught = (() => {
      try {
        // `Boolean(0)` is typed boolean; a literal `false` would make the rest of the block unreachable.
        invariant(Boolean(0), "upsert returned no row")
        return undefined
      } catch (e) {
        return e
      }
    })()
    expect(caught).toBeInstanceOf(Error)
    expect(caught).toMatchObject({
      name: "InvariantViolation",
      _tag: "InvariantViolation",
      message: "upsert returned no row",
    })
  })

  it("builds a lazy message only when the check fails", () => {
    const calls: string[] = []
    const message = () => {
      calls.push("built")
      return "expensive"
    }
    invariant(true, message)
    expect(calls).toEqual([])
    expect(() => invariant(false, message)).toThrow("expensive")
    expect(calls).toEqual(["built"])
  })

  it("narrows the condition for the code after it", () => {
    const row: { readonly id: string } | undefined = { id: "1" } as { readonly id: string } | undefined
    invariant(row, "upsert returned no row")
    expectTypeOf(row).toEqualTypeOf<{ readonly id: string }>()
    expect(row.id).toBe("1")
  })

  it("narrows compound conditions", () => {
    const env: { teamDomain?: string; aud?: string } = { teamDomain: "t", aud: "a" }
    const { teamDomain, aud } = env
    invariant(teamDomain && aud, "requires CF_ACCESS_TEAM_DOMAIN and CF_ACCESS_AUD")
    expectTypeOf(teamDomain).toEqualTypeOf<string>()
    expectTypeOf(aud).toEqualTypeOf<string>()
  })

  it("InvariantViolation can be constructed directly for invariant(false, …)-style sites", () => {
    const e = InvariantViolation("unknown provider")
    expect(e).toBeInstanceOf(Error)
    expect(e.name).toBe("InvariantViolation")
    expect(e._tag).toBe("InvariantViolation")
  })
})
