import * as fc from "fast-check"
import { describe, expect, it } from "vitest"

import { Option } from "../../src"

describe("Option - Property-based tests", () => {
  // Helper function to create an Option from a possibly null/undefined value
  const createOption = <T>(value: T | null | undefined): Option<T> => {
    return Option(value)
  }

  describe("Option construction properties", () => {
    it("should create Some for non-null/undefined values", () => {
      fc.assert(
        fc.property(fc.string(), (value) => {
          const option = createOption(value)
          expect(option.isEmpty).toBe(false)
          expect(option.getOrElse("default")).toBe(value)
        }),
      )
    })

    it("should create None for null/undefined values", () => {
      fc.assert(
        fc.property(fc.constant(null), (value) => {
          const option = createOption(value)
          expect(option.isEmpty).toBe(true)
          expect(option.getOrElse("default")).toBe("default")
        }),
      )
    })
  })

  describe("Option laws", () => {
    // Identity law: map(x => x) === identity
    it("should satisfy identity law", () => {
      fc.assert(
        fc.property(fc.string(), (value) => {
          const option = createOption(value)
          const mapped = option.map((x) => x)

          // Check that the mapped option has the same value
          expect(mapped.getOrElse("default")).toBe(option.getOrElse("default"))
          expect(mapped.isEmpty).toBe(option.isEmpty)
        }),
      )
    })

    // Composition law: map(f).map(g) === map(x => g(f(x)))
    it("should satisfy composition law", () => {
      const f = (s: string) => s.length
      const g = (n: number) => n * 2

      fc.assert(
        fc.property(fc.string(), (value) => {
          const option = createOption(value)

          // First approach: map(f).map(g)
          const result1 = option.map(f).map(g)

          // Second approach: map(x => g(f(x)))
          const result2 = option.map((x) => g(f(x)))

          expect(result1.getOrElse(0)).toBe(result2.getOrElse(0))
        }),
      )
    })

    // Associativity law for flatMap: flatMap(f).flatMap(g) === flatMap(x => f(x).flatMap(g))
    it("should satisfy flatMap associativity law", () => {
      // Create functions that return Options
      const f = (x: string) => Option(x + "!")
      const g = (x: string) => Option(x.length)

      fc.assert(
        fc.property(fc.string(), (value) => {
          const option = createOption(value)

          // First approach: flatMap(f).flatMap(g)
          const result1 = option.flatMap(f).flatMap(g)

          // Second approach: flatMap(x => f(x).flatMap(g))
          const result2 = option.flatMap((x) => f(x).flatMap(g))

          expect(result1.getOrElse(0)).toBe(result2.getOrElse(0))
        }),
      )
    })
  })

  describe("Option operations properties", () => {
    // getOrElse should return the value for Some and the default for None
    it("should properly handle getOrElse", () => {
      fc.assert(
        fc.property(fc.string(), fc.string(), (value, defaultValue) => {
          const someOption = createOption(value)
          expect(someOption.getOrElse(defaultValue)).toBe(value)

          const noneOption = createOption<string>(null)
          expect(noneOption.getOrElse(defaultValue)).toBe(defaultValue)
        }),
      )
    })

    // filter should keep values that satisfy the predicate and remove those that don't
    it("should properly handle filter", () => {
      fc.assert(
        fc.property(fc.integer(), (value) => {
          const option = Option(value)
          const isEven = (x: number) => x % 2 === 0

          if (isEven(value)) {
            expect(option.filter(isEven).isEmpty).toBe(false)
          } else {
            expect(option.filter(isEven).isEmpty).toBe(true)
          }
        }),
      )
    })

    // fold should apply the correct function based on the Option state
    it("should properly handle fold", () => {
      fc.assert(
        fc.property(fc.string(), (value) => {
          const someOption = createOption(value)
          const noneOption = createOption<string>(null)

          const someResult = someOption.fold(
            () => "none",
            (v) => `some: ${v}`,
          )

          const noneResult = noneOption.fold(
            () => "none",
            (v) => `some: ${v}`,
          )

          expect(someResult).toBe(`some: ${value}`)
          expect(noneResult).toBe("none")
        }),
      )
    })
  })

  describe("Option error handling properties", () => {
    // getOrThrow should throw for None and not throw for Some
    it("should properly handle getOrThrow", () => {
      fc.assert(
        fc.property(fc.string(), (value) => {
          const someOption = createOption(value)
          const noneOption = createOption<string>(null)
          const error = new Error("Test error")

          expect(() => someOption.getOrThrow(error)).not.toThrow()
          expect(someOption.getOrThrow(error)).toBe(value)

          expect(() => noneOption.getOrThrow(error)).toThrow(error)
        }),
      )
    })
  })
})
