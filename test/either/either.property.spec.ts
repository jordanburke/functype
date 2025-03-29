import * as fc from "fast-check"
import { describe, expect, it } from "vitest"

import { Either, Left, Right } from "../../src"

describe("Either - Property-based tests", () => {
  // Helper functions to create Either instances
  const createRight = <L, R>(value: R): Either<L, R> => Right<L, R>(value)
  const createLeft = <L, R>(error: L): Either<L, R> => Left<L, R>(error)

  describe("Either construction properties", () => {
    it("should properly create Right values", () => {
      fc.assert(
        fc.property(fc.string(), (value) => {
          const either = createRight<string, string>(value)
          expect(either.isRight()).toBe(true)
          expect(either.isLeft()).toBe(false)
          expect(either.getOrElse("default")).toBe(value)
        }),
      )
    })

    it("should properly create Left values", () => {
      fc.assert(
        fc.property(fc.string(), (error) => {
          const either = createLeft<string, string>(error)
          expect(either.isLeft()).toBe(true)
          expect(either.isRight()).toBe(false)
          expect(either.getOrElse("default")).toBe("default")
        }),
      )
    })
  })

  describe("Either laws", () => {
    // Identity law: map(x => x) === identity for Right
    it("should satisfy identity law for Right", () => {
      fc.assert(
        fc.property(fc.string(), (value) => {
          const either = createRight<string, string>(value)
          const mapped = either.map((x) => x)

          // Check that the mapped either has the same value
          expect(mapped.getOrElse("default")).toBe(either.getOrElse("default"))
          expect(mapped.isRight()).toBe(either.isRight())
        }),
      )
    })

    // Identity law: map(x => x) should not change Left
    it("should not change Left when applying identity function", () => {
      fc.assert(
        fc.property(fc.string(), (error) => {
          const either = createLeft<string, string>(error)
          const mapped = either.map((x) => x)

          // Check that the mapped either is still a Left with the same error
          expect(mapped.isLeft()).toBe(true)
          expect(
            mapped.fold(
              (e) => e,
              () => "",
            ),
          ).toBe(error)
        }),
      )
    })

    // Composition law: map(f).map(g) === map(x => g(f(x))) for Right
    it("should satisfy composition law for Right", () => {
      const f = (s: string) => s.length
      const g = (n: number) => n * 2

      fc.assert(
        fc.property(fc.string(), (value) => {
          const either = createRight<string, string>(value)

          // First approach: map(f).map(g)
          const result1 = either.map(f).map(g)

          // Second approach: map(x => g(f(x)))
          const result2 = either.map((x) => g(f(x)))

          expect(result1.getOrElse(0)).toBe(result2.getOrElse(0))
        }),
      )
    })

    // Associativity law for flatMap: flatMap(f).flatMap(g) === flatMap(x => f(x).flatMap(g))
    it("should satisfy flatMap associativity law for Right", () => {
      // Create functions that return Eithers
      const f = (x: string): Either<string, string> => Right(x + "!")
      const g = (x: string): Either<string, number> => Right(x.length)

      fc.assert(
        fc.property(fc.string(), (value) => {
          const either = createRight<string, string>(value)

          // First approach: flatMap(f).flatMap(g)
          const result1 = either.flatMap(f).flatMap(g)

          // Second approach: flatMap(x => f(x).flatMap(g))
          const result2 = either.flatMap((x) => f(x).flatMap(g))

          expect(result1.getOrElse(0)).toBe(result2.getOrElse(0))
        }),
      )
    })
  })

  describe("Either operations properties", () => {
    // getOrElse should return the value for Right and the default for Left
    it("should properly handle getOrElse", () => {
      fc.assert(
        fc.property(fc.string(), fc.string(), (value, defaultValue) => {
          const right = createRight<string, string>(value)
          expect(right.getOrElse(defaultValue)).toBe(value)

          const left = createLeft<string, string>("error")
          expect(left.getOrElse(defaultValue)).toBe(defaultValue)
        }),
      )
    })

    // fold should apply the correct function based on the Either state
    it("should properly handle fold", () => {
      fc.assert(
        fc.property(fc.string(), fc.integer(), (errorMsg, value) => {
          const right = createRight<string, number>(value)
          const rightResult = right.fold(
            (err) => `error: ${err}`,
            (val) => `success: ${val}`,
          )
          expect(rightResult).toBe(`success: ${value}`)

          const left = createLeft<string, number>(errorMsg)
          const leftResult = left.fold(
            (err) => `error: ${err}`,
            (val) => `success: ${val}`,
          )
          expect(leftResult).toBe(`error: ${errorMsg}`)
        }),
      )
    })

    // map should only transform Right values
    it("should only transform Right values with map", () => {
      fc.assert(
        fc.property(fc.string(), fc.integer(), (errorMsg, value) => {
          const transform = (n: number) => n * 2

          const right = createRight<string, number>(value)
          expect(right.map(transform).getOrElse(0)).toBe(transform(value))

          const left = createLeft<string, number>(errorMsg)
          expect(left.map(transform).isLeft()).toBe(true)
          expect(left.map(transform).getOrElse(0)).toBe(0)
        }),
      )
    })
  })

  describe("Either error handling properties", () => {
    // swap should exchange Left and Right
    it("should properly swap Left and Right", () => {
      fc.assert(
        fc.property(fc.string(), fc.integer(), (errorMsg, value) => {
          const right = createRight<string, number>(value)
          const swappedRight = right.swap()
          expect(swappedRight.isLeft()).toBe(true)
          expect(
            swappedRight.fold(
              (l) => l,
              () => 0,
            ),
          ).toBe(value)

          const left = createLeft<string, number>(errorMsg)
          const swappedLeft = left.swap()
          expect(swappedLeft.isRight()).toBe(true)
          expect(
            swappedLeft.fold(
              () => "",
              (r) => r,
            ),
          ).toBe(errorMsg)
        }),
      )
    })

    // mapLeft should only transform Left values
    it("should only transform Left values with mapLeft", () => {
      fc.assert(
        fc.property(fc.string(), fc.integer(), (errorMsg, value) => {
          const transform = (s: string) => s.toUpperCase()

          const right = createRight<string, number>(value)
          expect(right.mapLeft(transform).isRight()).toBe(true)
          expect(right.mapLeft(transform).getOrElse(0)).toBe(value)

          const left = createLeft<string, number>(errorMsg)
          const mappedLeft = left.mapLeft(transform)
          expect(mappedLeft.isLeft()).toBe(true)
          expect(
            mappedLeft.fold(
              (l) => l,
              () => "",
            ),
          ).toBe(transform(errorMsg))
        }),
      )
    })
  })
})
