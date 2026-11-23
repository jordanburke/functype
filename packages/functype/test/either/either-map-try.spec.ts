import { describe, expect, expectTypeOf, it } from "vitest"

import type { Either } from "@/either"
import { Left, Right, tryCatch } from "@/either"

/** `Either.map` lets a throw escape; `mapTry` catches it into a Left built by `onError` (#605). */
type ParseError = { readonly _tag: "ParseError"; readonly message: string }
const toParseError = (thrown: unknown): ParseError => ({
  _tag: "ParseError",
  message: thrown instanceof Error ? thrown.message : String(thrown),
})
const boom = (): number => {
  throw new Error("boom")
}

describe("Either.mapTry", () => {
  it("maps a Right when f returns", () => {
    expect(Right<ParseError, number>(2).mapTry((n) => n * 3, toParseError)).toEqual(Right(6))
  })

  it("turns a throw in f into a Left", () => {
    expect(Right<ParseError, number>(2).mapTry(boom, toParseError)).toEqual(
      Left({ _tag: "ParseError", message: "boom" }),
    )
  })

  it("passes onError exactly what was thrown", () => {
    const thrown = { code: 42 }
    const result = Right<unknown, number>(1).mapTry(
      () => {
        throw thrown
      },
      (e) => e,
    )

    expect(result.isLeft() && result.value).toBe(thrown)
  })

  it("leaves a Left alone and doesn't call f", () => {
    const calls: number[] = []
    const result = Left<"earlier", number>("earlier").mapTry((n) => {
      calls.push(n)
      return n
    }, toParseError)

    expect(result).toEqual(Left("earlier"))
    expect(calls).toEqual([])
  })

  it("lets a throw from onError escape", () => {
    expect(() =>
      Right<string, number>(1).mapTry(boom, () => {
        throw new Error("onError bug")
      }),
    ).toThrow("onError bug")
  })

  it("leaves plain map's throw escaping", () => {
    expect(() => Right<string, number>(1).map(boom)).toThrow("boom")
  })

  it.each([
    ["a value", (n: number) => n + 1],
    ["a throw", boom],
  ])("equals flatMap with tryCatch, for %s", (_name, f) => {
    const either = Right<ParseError, number>(1)
    expect(either.mapTry(f, toParseError)).toEqual(either.flatMap((n) => tryCatch(() => f(n), toParseError)))
  })

  it("adds onError's type to the Left", () => {
    const result = Right<"earlier", number>(1).mapTry((n) => String(n), toParseError)

    expectTypeOf(result).toEqualTypeOf<Either<"earlier" | ParseError, string>>()
  })
})
