import * as fc from "fast-check"
import { describe, expect, it } from "vitest"

import { Left, Right } from "@/either"
import { None, Option, Some } from "@/option"
import { Try } from "@/try"

/**
 * `every` on the single-value types (#481): the dual of `exists`, and Scala's `forall`. With no
 * success value it is vacuously true, as `[].every(p)` is.
 */
const isEven = (n: number): boolean => n % 2 === 0

describe("every on Option, Either and Try", () => {
  it.each([
    ["Some(2)", () => Some(2).every(isEven), true],
    ["Some(3)", () => Some(3).every(isEven), false],
    ["None", () => None<number>().every(isEven), true],
    ["Option(undefined)", () => Option<number>(undefined).every(isEven), true],
    ["Right(2)", () => Right<string, number>(2).every(isEven), true],
    ["Right(3)", () => Right<string, number>(3).every(isEven), false],
    ["Left", () => Left<string, number>("e").every(isEven), true],
    ["Success(2)", () => Try(() => 2).every(isEven), true],
    ["Success(3)", () => Try(() => 3).every(isEven), false],
    [
      "Failure",
      () =>
        Try<number>(() => {
          throw new Error("x")
        }).every(isEven),
      true,
    ],
  ])("%s → %s", (_label, run, expected) => {
    expect(run()).toBe(expected)
  })

  it("never calls the predicate when there is no success value", () => {
    const calls: unknown[] = []
    const spy = (n: number): boolean => {
      calls.push(n)
      return false
    }
    None<number>().every(spy)
    Left<string, number>("e").every(spy)
    Try<number>(() => {
      throw new Error("x")
    }).every(spy)
    expect(calls).toEqual([])
  })

  it("is the dual of exists: every(p) === !exists(not p)", () => {
    const options = fc.option(fc.integer(), { nil: undefined }).map((v) => Option(v))
    const eithers = fc.oneof(
      fc.integer().map((n) => Right<string, number>(n)),
      fc.string().map((s) => Left<string, number>(s)),
    )
    const tries = fc.oneof(
      fc.integer().map((n) => Try(() => n)),
      fc.string().map((s) =>
        Try<number>(() => {
          throw new Error(s)
        }),
      ),
    )
    const holds = (x: {
      every: (p: (n: number) => boolean) => boolean
      exists: (p: (n: number) => boolean) => boolean
    }) => x.every(isEven) === !x.exists((n) => !isEven(n))
    fc.assert(fc.property(options, holds))
    fc.assert(fc.property(eithers, holds))
    fc.assert(fc.property(tries, holds))
  })

  it("replaces fold(() => true, p) for 'absent, or present and matching'", () => {
    const matches = (value: string, filter: string | undefined): boolean =>
      Option(filter).every((f) => value.toLowerCase().includes(f.toLowerCase()))
    expect(matches("Aspirin", undefined)).toBe(true)
    expect(matches("Aspirin", "asp")).toBe(true)
    expect(matches("Aspirin", "ibu")).toBe(false)
  })
})
