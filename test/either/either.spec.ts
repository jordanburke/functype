import { Either, Left, List, Right } from "../../src"
import { ParseError } from "../../src/error/ParseError"
import { parseNumber } from "../../src/util"

describe("Either", () => {
  beforeEach(() => {
    // Nothing
  })

  const result1: Either<ParseError, number> = parseNumber("123").map((num) => num * 2)
  const result2: Either<ParseError, number> = parseNumber("hello").map((num) => num * 2)

  it("parse valid number", () => {
    expect(result1.value).toBe(246)
  })

  it("map on Right", () => {
    expect(result1.map((f) => 4).value).toBe(4)
  })

  it("parse valid invalid number", () => {
    expect(result2.value).toStrictEqual(ParseError("NaN"))
  })

  it("map on Left", () => {
    expect(result2.map((f) => 10).value).toStrictEqual(ParseError("NaN"))
  })

  it("should contain all items in list on Right", () => {
    const list = List([1, 2, 3, 4])
    const result = Right(list)
    expect(result.getOrElse(List()).toArray()).toEqual([1, 2, 3, 4])
  })

  it("map over Right containing a list", () => {
    const result = Right(List([1, 2, 3, 4])).map((list) => list.map((x) => x * 2))
    expect(result.getOrElse(List()).toArray()).toEqual([2, 4, 6, 8])
  })

  it("merge two Rights", () => {
    const right1 = Right<string, number>(5)
    const right2 = Right<string, string>("test")
    const merged = right1.merge(right2)
    expect(merged.isRight()).toBe(true)
    expect(merged.value).toEqual([5, "test"])
  })

  it("merge Right and Left", () => {
    const right = Right<string, number>(5)
    const left = Left<string, number>("error")
    const merged = right.merge(left)
    expect(merged.isLeft()).toBe(true)
    expect(merged.value).toBe("error")
  })

  it("merge Left and Right", () => {
    const left = Left<string, number>("error")
    const right = Right<string, number>(5)
    const merged = left.merge(right)
    expect(merged.isLeft()).toBe(true)
    expect(merged.value).toBe("error")
  })

  it("getOrElse on Right", () => {
    const right = Right<string, number>(5)
    expect(right.getOrElse(10)).toBe(5)
  })

  it("getOrElse on Left", () => {
    const left = Left<string, number>("error")
    expect(left.getOrElse(10)).toBe(10)
  })

  it("getOrThrow on Right", () => {
    const right = Right<string, number>(5)
    expect(right.getOrThrow()).toBe(5)
  })

  it("getOrThrow on Left", () => {
    const left = Left<string, number>("error")
    expect(() => left.getOrThrow()).toThrow("error")
  })

  it("flatMap on Right", () => {
    const right = Right<string, number>(5)
    const result = right.flatMap((x) => Right<string, string>(x.toString()))
    expect(result.isRight()).toBe(true)
    expect(result.value).toBe("5")
  })

  it("flatMap on Left", () => {
    const left = Left<string, number>("error")
    const result = left.flatMap((x) => Right<string, string>(x.toString()))
    expect(result.isLeft()).toBe(true)
    expect(result.value).toBe("error")
  })

  it("toOption on Right", () => {
    const right = Right<string, number>(5)
    const option = right.toOption()
    expect(!option.isEmpty).toBe(true)
    expect(option.getOrElse(0)).toBe(5)
  })

  it("toOption on Left", () => {
    const left = Left<string, number>("error")
    const option = left.toOption()
    expect(option.isEmpty).toBe(true)
  })

  it("toList on Right", () => {
    const right = Right<string, number>(5)
    const list = right.toList()
    expect(list.toArray()).toEqual([5])
  })

  it("toList on Left", () => {
    const left = Left<string, number>("error")
    const list = left.toList()
    expect(list.toArray()).toEqual([])
  })

  it("toString on Right", () => {
    const right = Right<string, number>(5)
    expect(right.toString()).toBe("Right(5)")
  })

  it("toString on Left", () => {
    const left = Left<string, number>("error")
    expect(left.toString()).toBe('Left("error")')
  })

  // New tests for Symbol.iterator implementation
  it("should be iterable for Right", () => {
    const right = Right<string, number>(5)
    expect([...right]).toEqual([5])
  })

  it("should be iterable for Left", () => {
    const left = Left<string, number>("error")
    expect([...left]).toEqual([])
  })

  it("should work with for...of loop for Right", () => {
    const right = Right<string, number>(5)
    const values: number[] = []
    for (const value of right) {
      values.push(value)
    }
    expect(values).toEqual([5])
  })

  it("should work with for...of loop for Left", () => {
    const left = Left<string, number>("error")
    const values: number[] = []
    for (const value of left) {
      values.push(value)
    }
    expect(values).toEqual([])
  })
})
