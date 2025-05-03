import { describe, expect, it } from "vitest"

import type { Matchable } from "../../src"
import { Either, Left, List, MatchableUtils, None, Option, Right, Some, Try } from "../../src"

describe("Matchable", () => {
  describe("Option", () => {
    it("should match Some variant", () => {
      const option: Option<number> = Some(42)

      const result = option.match({
        Some: (value) => `Value is ${value}`,
        None: () => "No value",
      })

      expect(result).toBe("Value is 42")
    })

    it("should match None variant", () => {
      const option: Option<number> = None()

      const result = option.match({
        Some: (value) => `Value is ${value}`,
        None: () => "No value",
      })

      expect(result).toBe("No value")
    })

    it("should be compatible with the Matchable type", () => {
      const option: Option<number> = Some(42)
      const matchable: Matchable<number, "Some" | "None"> = option

      expect(matchable).toBe(option)
    })
  })

  describe("Either", () => {
    it("should match Right variant", () => {
      const either: Either<string, number> = Right(42)

      const result = either.match({
        Right: (value) => `Success: ${value}`,
        Left: (err) => `Error: ${err}`,
      })

      expect(result).toBe("Success: 42")
    })

    it("should match Left variant", () => {
      const either: Either<string, number> = Left("error occurred")

      const result = either.match({
        Right: (value) => `Success: ${value}`,
        Left: (err) => `Error: ${err}`,
      })

      expect(result).toBe("Error: error occurred")
    })

    it("should be compatible with the Matchable type", () => {
      const either: Either<string, number> = Right(42)
      const matchable: Matchable<number | string, "Left" | "Right"> = either

      expect(matchable).toBe(either)
    })
  })

  describe("Try", () => {
    it("should match Success variant", () => {
      const tryValue = Try(() => 42)

      const result = tryValue.match({
        Success: (value) => `Success: ${value}`,
        Failure: (error) => `Error: ${error.message}`,
      })

      expect(result).toBe("Success: 42")
    })

    it("should match Failure variant", () => {
      const tryValue = Try(() => {
        throw new Error("Something went wrong")
      })

      const result = tryValue.match({
        Success: (value) => `Success: ${value}`,
        Failure: (error) => `Error: ${error.message}`,
      })

      expect(result).toBe("Error: Something went wrong")
    })

    it("should be compatible with the Matchable type", () => {
      const tryValue = Try(() => 42)
      const matchable: Matchable<number | Error, "Success" | "Failure"> = tryValue

      expect(matchable).toBe(tryValue)
    })
  })

  describe("List", () => {
    it("should match NonEmpty variant", () => {
      const list = List([1, 2, 3])

      const result = list.match({
        NonEmpty: (values) => `List has ${values.length} items`,
        Empty: () => "List is empty",
      })

      expect(result).toBe("List has 3 items")
    })

    it("should match Empty variant", () => {
      const list = List([])

      const result = list.match({
        NonEmpty: (values) => `List has ${values.length} items`,
        Empty: () => "List is empty",
      })

      expect(result).toBe("List is empty")
    })

    it("should be compatible with the Matchable type", () => {
      const list = List([1, 2, 3])
      const matchable: Matchable<number[], "Empty" | "NonEmpty"> = list

      expect(matchable).toBe(list)
    })
  })

  describe("MatchableUtils", () => {
    it("should provide a default handler", () => {
      const defaultHandler = MatchableUtils.default((value: number) => `Default: ${value}`)

      expect(defaultHandler(42)).toBe("Default: 42")
    })

    it("should support when guards", () => {
      const whenPositive = MatchableUtils.when(
        (n: number) => n > 0,
        (n) => `Positive: ${n}`,
      )
      const whenNegative = MatchableUtils.when(
        (n: number) => n < 0,
        (n) => `Negative: ${n}`,
      )

      expect(whenPositive(5)).toBe("Positive: 5")
      expect(whenPositive(-5)).toBeUndefined()
      expect(whenNegative(-5)).toBe("Negative: -5")
      expect(whenNegative(5)).toBeUndefined()
    })

    it("should allow for complex pattern matching", () => {
      const option: Option<number> = Some(42)

      const result = option.match({
        Some: (value) => {
          if (value > 0) return "Positive"
          if (value < 0) return "Negative"
          return "Zero"
        },
        None: () => "No value",
      })

      expect(result).toBe("Positive")
    })
  })
})
