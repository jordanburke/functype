/**
 * Try shares its methods through one prototype per variant (#276 §14, from #539: every method was
 * copied onto every value). A Success now keeps its value as data, as #276 §9a plans.
 */
import { inspect } from "node:util"

import { describe, expect, it } from "vitest"

import { Try } from "@/index"

const boom = (): number => {
  throw new Error("boom")
}

describe("Try's shape", () => {
  it("keeps only its data as own properties, with the value on a Success", () => {
    expect(Object.keys(Try(() => 1))).toEqual(["_tag", "value", "error"])
    expect(Object.keys(Try(boom))).toEqual(["_tag", "value", "error"])
    expect({ ...Try(() => 1) }).toEqual({ _tag: "Success", value: 1, error: undefined })
  })

  it("shares one frozen prototype per variant", () => {
    expect(Object.getPrototypeOf(Try(() => 1))).toBe(Object.getPrototypeOf(Try(() => "a")))
    expect(Object.getPrototypeOf(Try(() => 1))).not.toBe(Object.getPrototypeOf(Try(boom)))
    expect(Object.isFrozen(Object.getPrototypeOf(Try(() => 1)))).toBe(true)
  })

  it("compares by data in test matchers", () => {
    expect(Try(() => 1)).toEqual(Try(() => 1))
    expect(Try(() => 1)).not.toEqual(Try(() => 2))
    expect(Try(() => 1)).not.toEqual(Try(boom))
  })

  it("prints its variant and data", () => {
    expect(inspect(Try(() => 1))).toBe("Success [Try] { _tag: 'Success', value: 1, error: undefined }")
    expect(inspect(Try(boom))).toMatch(
      /^Failure \[Try\] \{\s+_tag: 'Failure',\s+value: undefined,\s+error: Error: boom/,
    )
  })

  it("still maps, recovers and catches", () => {
    expect(
      Try(() => 1)
        .map((x) => x + 1)
        .getOrElse(() => 0),
    ).toBe(2)
    expect(
      Try(boom)
        .recover(() => 7)
        .getOrElse(() => 0),
    ).toBe(7)
    expect(
      Try(() => 1)
        .map(() => boom())
        .isFailure(),
    ).toBe(true)
  })
})

describe("Try's 2.0 breaks", () => {
  it("a detached method call throws", () => {
    const { getOrElse } = Try(() => 1)
    expect(() => getOrElse(() => 0)).toThrow(TypeError)
  })
})
