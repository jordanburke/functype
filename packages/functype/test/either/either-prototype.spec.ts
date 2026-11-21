/**
 * Either shares its methods through one prototype per variant (#276 §14, from #539: every method
 * was copied onto every value). These tests pin the shape and the 2.0 breaks.
 */
import { inspect } from "node:util"

import { describe, expect, it } from "vitest"

import { Left, Right } from "@/index"

describe("Either's shape", () => {
  it("keeps only its data as own properties", () => {
    expect(Object.keys(Right(1))).toEqual(["_tag", "value"])
    expect(Object.keys(Left("e"))).toEqual(["_tag", "value"])
  })

  it("shares one frozen prototype per variant", () => {
    expect(Object.getPrototypeOf(Right(1))).toBe(Object.getPrototypeOf(Right("a")))
    expect(Object.getPrototypeOf(Left(1))).toBe(Object.getPrototypeOf(Left("a")))
    expect(Object.getPrototypeOf(Right(1))).not.toBe(Object.getPrototypeOf(Left(1)))
    expect(Object.isFrozen(Object.getPrototypeOf(Right(1)))).toBe(true)
  })

  it("compares by data in test matchers, and tells Right from Left", () => {
    expect(Right(1)).toEqual(Right(1))
    expect(Right(1)).not.toEqual(Right(2))
    expect(Right(1)).not.toEqual(Left(1))
  })

  it("prints its variant and data", () => {
    expect(inspect(Right(1))).toBe("Right [Either] { _tag: 'Right', value: 1 }")
    expect(inspect(Left("e"))).toBe("Left [Either] { _tag: 'Left', value: 'e' }")
  })

  it("still iterates, merges into a tuple, and swaps", () => {
    expect([...Right(2)]).toEqual([2])
    expect([...Left("e")]).toEqual([])
    expect(
      Right<string, number>(2)
        .merge(Right<string, string>("b"))
        .getOrElse(() => [0, ""]),
    ).toEqual([2, "b"])
    expect(Right<string, number>(2).swap().isLeft()).toBe(true)
  })
})

describe("Either's 2.0 breaks", () => {
  it("a detached method call throws", () => {
    const { getOrElse } = Right<string, number>(1)
    expect(() => getOrElse(() => 0)).toThrow(TypeError)
  })

  it("a spread copies only the data", () => {
    expect({ ...Left("e") }).toEqual({ _tag: "Left", value: "e" })
  })
})
