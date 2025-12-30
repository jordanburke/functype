import { beforeEach, describe, expect, it } from "vitest"

import { Either, Left, parseNumber, ParseError, Right } from "../../src/either"
import { List } from "../../src/list"

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
    expect(result.orElse(List()).toArray()).toEqual([1, 2, 3, 4])
  })

  it("map over Right containing a list", () => {
    const result = Right(List([1, 2, 3, 4])).map((list) => list.map((x) => x * 2))
    expect(result.orElse(List()).toArray()).toEqual([2, 4, 6, 8])
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
    expect(right.orElse(10)).toBe(5)
  })

  it("getOrElse on Left", () => {
    const left = Left<string, number>("error")
    expect(left.orElse(10)).toBe(10)
  })

  it("getOrThrow on Right", () => {
    const right = Right<string, number>(5)
    expect(right.orThrow()).toBe(5)
  })

  it("getOrThrow on Left", () => {
    const left = Left<string, number>("error")
    expect(() => left.orThrow()).toThrow("error")
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
    expect(option.orElse(0)).toBe(5)
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

  // New tests for yield method
  it("should yield the value for Right", () => {
    const right = Right<string, number>(5)
    const yielded = [...right.yield()]
    expect(yielded).toEqual([5])
  })

  it("should yield nothing for Left", () => {
    const left = Left<string, number>("error")
    const yielded = [...left.yield()]
    expect(yielded).toEqual([])
  })

  // Tests for traverse method
  it("should traverse a Right value", () => {
    const right = Right<string, number>(5)
    const traversed = right.traverse((x) => Right<string, string>(x.toString()))
    expect(traversed.isRight()).toBe(true)
    expect(traversed.value).toEqual(["5"])
  })

  it("should not traverse a Left value", () => {
    const left = Left<string, number>("error")
    const traversed = left.traverse((x) => Right<string, string>(x.toString()))
    expect(traversed.isLeft()).toBe(true)
    expect(traversed.value).toBe("error")
  })

  // Tests for lazyMap method
  it("should lazyMap a Right value", () => {
    const right = Right<string, number>(5)
    const lazyMapped = [...right.lazyMap((x) => x * 2)]
    expect(lazyMapped.length).toBeGreaterThan(0)
    const firstEither = lazyMapped[0]
    expect(firstEither?.isRight()).toBe(true)
    expect(firstEither?.value).toBe(10)
  })

  it("should not lazyMap a Left value", () => {
    const left = Left<string, number>("error")
    const lazyMapped = [...left.lazyMap((x) => x * 2)]
    expect(lazyMapped.length).toBeGreaterThan(0)
    const firstEither = lazyMapped[0]
    expect(firstEither?.isLeft()).toBe(true)
    expect(firstEither?.value).toBe("error")
  })

  // Tests for Either.sequence
  it("should sequence an array of Rights", () => {
    const eithers = [Right<string, number>(1), Right<string, number>(2), Right<string, number>(3)]
    const sequenced = Either.sequence(eithers)
    expect(sequenced.isRight()).toBe(true)
    expect(sequenced.value).toEqual([1, 2, 3])
  })

  it("should return Left when sequencing array with a Left", () => {
    const eithers = [Right<string, number>(1), Left<string, number>("error"), Right<string, number>(3)]
    const sequenced = Either.sequence(eithers)
    expect(sequenced.isLeft()).toBe(true)
    expect(sequenced.value).toBe("error")
  })

  // Tests for Either.traverse
  it("should traverse an array with a function returning Right", () => {
    const numbers = [1, 2, 3]
    const traversed = Either.traverse(numbers, (x) => Right<string, number>(x * 2))
    expect(traversed.isRight()).toBe(true)
    expect(traversed.value).toEqual([2, 4, 6])
  })

  it("should return Left when traversing with a function returning Left", () => {
    const numbers = [1, 2, 3]
    const traversed = Either.traverse(numbers, (x) =>
      x === 2 ? Left<string, number>("error") : Right<string, number>(x * 2),
    )
    expect(traversed.isLeft()).toBe(true)
    expect(traversed.value).toBe("error")
  })

  // Tests for Either.fromNullable
  it("should create Right from non-null value", () => {
    const result = Either.fromNullable(5, "Value is null")
    expect(result.isRight()).toBe(true)
    expect(result.value).toBe(5)
  })

  it("should create Left from null value", () => {
    const result = Either.fromNullable(null, "Value is null")
    expect(result.isLeft()).toBe(true)
    expect(result.value).toBe("Value is null")
  })

  it("should create Left from undefined value", () => {
    const result = Either.fromNullable(undefined, "Value is undefined")
    expect(result.isLeft()).toBe(true)
    expect(result.value).toBe("Value is undefined")
  })

  // Tests for Either.fromPredicate
  it("should create Right when predicate is true", () => {
    const result = Either.fromPredicate(10, (x) => x > 5, "Value is not greater than 5")
    expect(result.isRight()).toBe(true)
    expect(result.value).toBe(10)
  })

  it("should create Left when predicate is false", () => {
    const result = Either.fromPredicate(3, (x) => x > 5, "Value is not greater than 5")
    expect(result.isLeft()).toBe(true)
    expect(result.value).toBe("Value is not greater than 5")
  })

  // Tests for Either.ap
  it("should apply a function in Right to a value in Right", () => {
    const eitherFunction = Right<string, (x: number) => number>((x) => x * 2)
    const eitherValue = Right<string, number>(5)
    const result = Either.ap(eitherFunction, eitherValue)
    expect(result.isRight()).toBe(true)
    expect(result.value).toBe(10)
  })

  it("should return Left when applying to a Left value", () => {
    const eitherFunction = Right<string, (x: number) => number>((x) => x * 2)
    const eitherValue = Left<string, number>("error")
    const result = Either.ap(eitherFunction, eitherValue)
    expect(result.isLeft()).toBe(true)
    expect(result.value).toBe("error")
  })

  it("should return Left when the function is Left", () => {
    const eitherFunction = Left<string, (x: number) => number>("error")
    const eitherValue = Right<string, number>(5)
    const result = Either.ap(eitherFunction, eitherValue)
    expect(result.isLeft()).toBe(true)
    expect(result.value).toBe("error")
  })

  // New tests for tap method
  it("should tap a Right value", () => {
    let sideEffect = 0
    const right = Right<string, number>(5)
    const result = right.tap((x) => {
      sideEffect = x
    })
    expect(result.toString()).toBe(right.toString())
    expect(sideEffect).toBe(5)
  })

  it("should not tap a Left value", () => {
    let sideEffect = 0
    const left = Left<string, number>("error")
    const result = left.tap((x) => {
      sideEffect = x
    })
    expect(result.toString()).toBe(left.toString())
    expect(sideEffect).toBe(0)
  })

  // Tests for tapLeft method
  it("should tapLeft a Left value", () => {
    let sideEffect = ""
    const left = Left<string, number>("error")
    const result = left.tapLeft((x) => {
      sideEffect = x
    })
    expect(result.toString()).toBe(left.toString())
    expect(sideEffect).toBe("error")
  })

  it("should not tapLeft a Right value", () => {
    let sideEffect = ""
    const right = Right<string, number>(5)
    const result = right.tapLeft((x) => {
      sideEffect = x
    })
    expect(result.toString()).toBe(right.toString())
    expect(sideEffect).toBe("")
  })

  // Tests for mapLeft method
  it("should mapLeft a Left value", () => {
    const left = Left<string, number>("error")
    const result = left.mapLeft((x) => x.toUpperCase())
    expect(result.isLeft()).toBe(true)
    expect(result.value).toBe("ERROR")
  })

  it("should not mapLeft a Right value", () => {
    const right = Right<string, number>(5)
    const result = right.mapLeft((x) => x.toUpperCase())
    expect(result.toString()).toBe(right.toString())
  })

  // Tests for bimap method
  it("should bimap a Right value", () => {
    const right = Right<string, number>(5)
    const result = right.bimap(
      (x) => x.toUpperCase(),
      (x) => x * 2,
    )
    expect(result.isRight()).toBe(true)
    expect(result.value).toBe(10)
  })

  it("should bimap a Left value", () => {
    const left = Left<string, number>("error")
    const result = left.bimap(
      (x) => x.toUpperCase(),
      (x) => x * 2,
    )
    expect(result.isLeft()).toBe(true)
    expect(result.value).toBe("ERROR")
  })

  // Tests for fold method
  it("should fold a Right value", () => {
    const right = Right<string, number>(5)
    const result = right.fold(
      (l) => `Error: ${l}`,
      (r) => `Value: ${r}`,
    )
    expect(result).toBe("Value: 5")
  })

  it("should fold a Left value", () => {
    const left = Left<string, number>("error")
    const result = left.fold(
      (l) => `Error: ${l}`,
      (r) => `Value: ${r}`,
    )
    expect(result).toBe("Error: error")
  })

  // Tests for swap method
  it("should swap a Right to a Left", () => {
    const right = Right<string, number>(5)
    const result = right.swap()
    expect(result.isLeft()).toBe(true)
    expect(result.value).toBe(5)
  })

  it("should swap a Left to a Right", () => {
    const left = Left<string, number>("error")
    const result = left.swap()
    expect(result.isRight()).toBe(true)
    expect(result.value).toBe("error")
  })

  // Tests for Either.fromPromise
  it("should create Right from resolved promise", async () => {
    const promise = Promise.resolve(5)
    const result = await Either.fromPromise(promise, (err) => `Error: ${err}`)
    expect(result.isRight()).toBe(true)
    expect(result.orThrow()).toBe(5)
  })

  it("should create Left from rejected promise", async () => {
    const promise = Promise.reject("Rejected")
    const result = await Either.fromPromise(promise, (err) => `Error: ${err}`)
    expect(result.isLeft()).toBe(true)
    expect(
      result.fold(
        (err) => err,
        (val) => val,
      ),
    ).toBe("Error: Rejected")
  })
})
