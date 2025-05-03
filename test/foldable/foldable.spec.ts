import { describe, expect, it } from "vitest"

import { FoldableUtils, Left, List, None, Right, Some, Try } from "../../src"

describe("Foldable", () => {
  describe("Option", () => {
    it("should implement fold for Some", () => {
      const option = Some(5)
      const result = option.fold(
        () => "None",
        (value) => `Some(${value})`,
      )
      expect(result).toBe("Some(5)")
    })

    it("should implement fold for None", () => {
      const option = None<number>()
      const result = option.fold(
        () => "None",
        (value) => `Some(${value})`,
      )
      expect(result).toBe("None")
    })

    it("should implement foldLeft for Some", () => {
      const option = Some(5)
      const result = option.foldLeft(10)((acc, value) => acc + value)
      expect(result).toBe(15)
    })

    it("should implement foldLeft for None", () => {
      const option = None<number>()
      const result = option.foldLeft(10)((acc, value) => acc + value)
      expect(result).toBe(10)
    })

    it("should implement foldRight for Some", () => {
      const option = Some(5)
      const result = option.foldRight(10)((value, acc) => value + acc)
      expect(result).toBe(15)
    })

    it("should implement foldRight for None", () => {
      const option = None<number>()
      const result = option.foldRight(10)((value, acc) => value + acc)
      expect(result).toBe(10)
    })
  })

  describe("List", () => {
    it("should implement foldLeft correctly", () => {
      const list = List([1, 2, 3, 4, 5])
      const result = list.foldLeft(0)((acc, value) => acc + value)
      expect(result).toBe(15)
    })

    it("should implement foldRight correctly", () => {
      const list = List([1, 2, 3, 4, 5])
      const result = list.foldRight(0)((value, acc) => value + acc)
      expect(result).toBe(15)
    })

    it("should show the difference between foldLeft and foldRight with non-commutative operations", () => {
      const list = List([1, 2, 3, 4])

      // For subtraction (non-commutative), the results will be different
      const resultLeft = list.foldLeft(20)((acc, value) => acc - value)
      // (((20 - 1) - 2) - 3) - 4 = 10
      expect(resultLeft).toBe(10)

      const resultRight = list.foldRight(20)((value, acc) => value - acc)
      // 1 - (2 - (3 - (4 - 20))) = 18
      expect(resultRight).toBe(18)
    })
  })

  describe("Either", () => {
    it("should implement fold for Right", () => {
      const either = Right<string, number>(5)
      const result = either.fold(
        (error) => `Left(${error})`,
        (value) => `Right(${value})`,
      )
      expect(result).toBe("Right(5)")
    })

    it("should implement fold for Left", () => {
      const either = Left<string, number>("error")
      const result = either.fold(
        (error) => `Left(${error})`,
        (value) => `Right(${value})`,
      )
      expect(result).toBe("Left(error)")
    })
  })

  describe("Try", () => {
    it("should implement fold for Success", () => {
      const success = Try(() => 5)
      const result = success.fold(
        (error) => `Failure(${error.message})`,
        (value) => `Success(${value})`,
      )
      expect(result).toBe("Success(5)")
    })

    it("should implement fold for Failure", () => {
      const failure = Try(() => {
        throw new Error("something went wrong")
      })
      const result = failure.fold(
        (error) => `Failure(${error.message})`,
        (value) => `Success(${value})`,
      )
      expect(result).toBe("Failure(something went wrong)")
    })

    it("should implement foldLeft for Success", () => {
      const success = Try(() => 5)
      const result = success.foldLeft(10)((acc, value) => acc + value)
      expect(result).toBe(15)
    })

    it("should implement foldLeft for Failure", () => {
      const failure = Try(() => {
        throw new Error("something went wrong")
      })
      const result = failure.foldLeft(10)((acc, value) => acc + value)
      expect(result).toBe(10)
    })

    it("should implement foldRight for Success", () => {
      const success = Try(() => 5)
      const result = success.foldRight(10)((value, acc) => value + acc)
      expect(result).toBe(15)
    })

    it("should implement foldRight for Failure", () => {
      const failure = Try(() => {
        throw new Error("something went wrong")
      })
      const result = failure.foldRight(10)((value, acc) => value + acc)
      expect(result).toBe(10)
    })
  })

  describe("FoldableUtils utility functions", () => {
    it("should convert a Foldable to an Option", () => {
      const option = Some(5)
      const result = FoldableUtils.toOption(option)
      expect(result.getOrElse(0)).toBe(5)

      const none = None<number>()
      const noneResult = FoldableUtils.toOption(none)
      expect(noneResult.isEmpty).toBe(true)
    })

    it("should convert a Foldable to a List", () => {
      const option = Some(5)
      const result = FoldableUtils.toList(option)
      expect(result.toArray()).toEqual([5])

      const none = None<number>()
      const noneResult = FoldableUtils.toList(none)
      expect(noneResult.toArray()).toEqual([])
    })

    it("should convert a Foldable to an Either", () => {
      const option = Some(5)
      const result = FoldableUtils.toEither(option, "empty")
      expect(result.isRight()).toBe(true)
      expect(result.getOrElse(0)).toBe(5)

      const none = None<number>()
      const noneResult = FoldableUtils.toEither(none, "empty")
      expect(noneResult.isLeft()).toBe(true)
      expect(noneResult.value).toBe("empty")
    })

    it("should check if a Foldable is empty", () => {
      const option = Some(5)
      expect(FoldableUtils.isEmpty(option)).toBe(false)

      const none = None<number>()
      expect(FoldableUtils.isEmpty(none)).toBe(true)
    })

    it("should get the size of a Foldable", () => {
      const option = Some(5)
      expect(FoldableUtils.size(option)).toBe(1)

      const none = None<number>()
      expect(FoldableUtils.size(none)).toBe(0)
    })
  })
})
