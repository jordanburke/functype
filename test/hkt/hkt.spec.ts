import { describe, expect, test } from "vitest"

import { Either, HKT, List, Option, Right, Try } from "../../src"
import type { UniversalContainer } from "../../src/hkt"

describe("HKT", () => {
  test("should map over Option", () => {
    const option = Option(42)
    const result = HKT.map(option as any, (x: number) => x * 2)
    expect(HKT.isOption(result)).toBe(true)
    expect((result as Option<number>).get()).toBe(84)
  })

  test("should map over List", () => {
    const list = List([1, 2, 3])
    const result = HKT.map(list as any, (x: number) => x * 2)
    expect(HKT.isList(result)).toBe(true)
    expect((result as List<number>).toArray()).toEqual([2, 4, 6])
  })

  test("should map over Either", () => {
    const either = Right<string, number>(42)
    const result = HKT.map(either as any, (x: number) => x * 2)
    expect(HKT.isEither(result)).toBe(true)
    expect((result as Either<string, number>).isRight()).toBe(true)
    // Use fold instead of get() for Either
    const value = (result as Either<string, number>).fold(
      () => 0,
      (x: number) => x,
    )
    expect(value).toBe(84)
  })

  test("should map over Try", () => {
    const tryValue = Try(() => 42)
    const result = HKT.map(tryValue as any, (x: number) => x * 2)
    expect(HKT.isTry(result)).toBe(true)
    expect((result as Try<number>).isSuccess()).toBe(true)
    expect((result as Try<number>).get()).toBe(84)
  })

  test("should flatten nested Options", () => {
    const nestedOption = Option(Option(42))
    const result = HKT.flatten(nestedOption as any)
    expect(HKT.isOption(result)).toBe(true)
    expect((result as Option<number>).get()).toBe(42)
  })

  test("should flatten nested Lists", () => {
    const nestedList = List([List([1, 2]), List([3, 4])])
    const result = HKT.flatten(nestedList as any)
    expect(HKT.isList(result)).toBe(true)
    expect((result as List<number>).toArray()).toEqual([1, 2, 3, 4])
  })

  test("should flatMap over Option", () => {
    const option = Option(42)
    const result = HKT.flatMap(option as any, (x: number) => Option(x * 2) as any)
    expect(HKT.isOption(result)).toBe(true)
    expect((result as Option<number>).get()).toBe(84)
  })

  test("should sequence Option of List to List of Option", () => {
    const optionOfList = Option(List([1, 2, 3]))
    const result = HKT.sequence(optionOfList as any)

    expect(HKT.isList(result)).toBe(true)
    const resultArray = (result as List<Option<number>>).toArray()
    expect(resultArray.length).toBe(3)
    expect(HKT.isOption(resultArray[0])).toBe(true)
    expect((resultArray[0] as Option<number>)?.get()).toBe(1)
    expect((resultArray[1] as Option<number>)?.get()).toBe(2)
    expect((resultArray[2] as Option<number>)?.get()).toBe(3)
  })

  test("should handle None case in sequence", () => {
    const noneOption = Option.none<List<number>>()
    const result = HKT.sequence(noneOption as any)

    expect(HKT.isList(result)).toBe(true)
    const resultArray = (result as List<Option<number>>).toArray()
    expect(resultArray.length).toBe(1)
    expect(HKT.isOption(resultArray[0])).toBe(true)
    // Check if it's None using the isEmpty property
    expect((resultArray[0] as Option<unknown>).isEmpty).toBe(true)
  })

  test("should sequence List of Option to Option of List", () => {
    const listOfOption = List([Option(1), Option(2), Option(3)])
    const result = HKT.sequence(listOfOption as any)

    expect(HKT.isOption(result)).toBe(true)
    expect((result as Option<unknown>).isEmpty).toBe(false)

    const innerList = (result as Option<List<number>>).get()
    expect(HKT.isList(innerList)).toBe(true)
    expect(innerList.toArray()).toEqual([1, 2, 3])
  })

  test("should return None when sequencing List with None", () => {
    const listWithNone = List([Option(1), Option.none(), Option(3)])
    const result = HKT.sequence(listWithNone as any)

    expect(HKT.isOption(result)).toBe(true)
    expect((result as Option<unknown>).isEmpty).toBe(true)
  })

  test("should traverse List with Option function", () => {
    const list = List([1, 2, 3])
    const result = HKT.traverse(list as any, (x: number) => Option(x * 2) as any)

    expect(HKT.isOption(result)).toBe(true)
    expect((result as Option<unknown>).isEmpty).toBe(false)

    const innerList = (result as Option<List<number>>).get()
    expect(HKT.isList(innerList)).toBe(true)
    expect(innerList.toArray()).toEqual([2, 4, 6])
  })

  test("should return None when traversing with function returning None", () => {
    const list = List([1, 2, 3])
    const noneFunc = (x: number) => (x === 2 ? Option.none() : Option(x * 2))
    const result = HKT.traverse(list as any, (x: number) => noneFunc(x) as any)

    expect(HKT.isOption(result)).toBe(true)
    expect((result as Option<unknown>).isEmpty).toBe(true)
  })

  test("should support applicative-style usage with ap", () => {
    const optionFn = Option((x: number) => x * 2)
    const optionValue = Option(21)

    const result = HKT.ap(optionFn as any, optionValue as any)

    expect(HKT.isOption(result)).toBe(true)
    expect((result as Option<number>).get()).toBe(42)
  })
})
