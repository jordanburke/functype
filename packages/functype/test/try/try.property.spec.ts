import * as fc from "fast-check"
import { describe, expect, it } from "vitest"

import { Try } from "@/try"

describe("Try - Property-based tests", () => {
  describe("Try construction properties", () => {
    it("should create Success for non-throwing functions", () => {
      fc.assert(
        fc.property(fc.string(), (value) => {
          const tryResult = Try(() => value)
          expect(tryResult.isSuccess()).toBe(true)
          expect(tryResult.isFailure()).toBe(false)
          expect(tryResult.orThrow()).toBe(value)
        }),
      )
    })

    it("should create Failure for throwing functions", () => {
      fc.assert(
        fc.property(fc.string(), (errorMessage) => {
          const tryResult = Try(() => {
            throw new Error(errorMessage)
          })
          expect(tryResult.isFailure()).toBe(true)
          expect(tryResult.isSuccess()).toBe(false)
          expect(() => tryResult.orThrow()).toThrow()
          expect(tryResult.error?.message).toBe(errorMessage)
        }),
      )
    })
  })

  describe("Try laws", () => {
    // Identity law: map(x => x) === identity for Success
    it("should satisfy identity law for Success", () => {
      fc.assert(
        fc.property(fc.string(), (value) => {
          const tryResult = Try(() => value)
          const mapped = tryResult.map((x) => x)

          expect(mapped.isSuccess()).toEqual(tryResult.isSuccess())
          if (tryResult.isSuccess()) {
            expect(mapped.orThrow()).toEqual(tryResult.orThrow())
          }
        }),
      )
    })

    // Composition law: map(f).map(g) === map(x => g(f(x))) for Success
    it("should satisfy composition law for Success", () => {
      const f = (s: string) => s.length
      const g = (n: number) => n * 2

      fc.assert(
        fc.property(fc.string(), (value) => {
          const tryResult = Try(() => value)

          // First approach: map(f).map(g)
          const result1 = tryResult.map(f).map(g)

          // Second approach: map(x => g(f(x)))
          const result2 = tryResult.map((x) => g(f(x)))

          expect(result1.isSuccess()).toEqual(result2.isSuccess())
          if (result1.isSuccess() && result2.isSuccess()) {
            expect(result1.orThrow()).toEqual(result2.orThrow())
          }
        }),
      )
    })

    // Associativity law for flatMap: flatMap(f).flatMap(g) === flatMap(x => f(x).flatMap(g))
    it("should satisfy flatMap associativity law for Success", () => {
      // Create functions that return Try
      const f = (x: string) => Try(() => x + "!")
      const g = (x: string) => Try(() => x.length)

      fc.assert(
        fc.property(fc.string(), (value) => {
          const tryResult = Try(() => value)

          // First approach: flatMap(f).flatMap(g)
          const result1 = tryResult.flatMap(f).flatMap(g)

          // Second approach: flatMap(x => f(x).flatMap(g))
          const result2 = tryResult.flatMap((x) => f(x).flatMap(g))

          expect(result1.isSuccess()).toEqual(result2.isSuccess())
          if (result1.isSuccess() && result2.isSuccess()) {
            expect(result1.orThrow()).toEqual(result2.orThrow())
          }
        }),
      )
    })
  })

  describe("Try operations properties", () => {
    // getOrElse should return the value for Success and the default for Failure
    it("should properly handle getOrElse", () => {
      fc.assert(
        fc.property(fc.string(), fc.string(), (value, defaultValue) => {
          const success = Try(() => value)
          expect(success.orElse(defaultValue)).toBe(value)

          const failure = Try<string>(() => {
            throw new Error("Test error")
          })
          expect(failure.orElse(defaultValue)).toBe(defaultValue)
        }),
      )
    })

    // Test pattern matching with isSuccess/isFailure
    it("should allow pattern matching on Success/Failure", () => {
      fc.assert(
        fc.property(fc.string(), fc.integer(), (errorMsg, value) => {
          // Test Success case
          const success = Try(() => value)
          let successResult = ""
          if (success.isSuccess()) {
            successResult = `success: ${success.orThrow()}`
          } else {
            successResult = `error: ${success.error?.message || ""}`
          }
          expect(successResult).toBe(`success: ${value}`)

          // Test Failure case with explicit error
          const failure = Try<number>(() => {
            throw new Error(errorMsg)
          })

          // Verify the error exists and has the expected message
          expect(failure.error).toBeDefined()
          expect(failure.error?.message).toBe(errorMsg)

          // Now construct the result string
          let failureResult = ""
          if (failure.isSuccess()) {
            failureResult = `success: ${failure.orThrow()}`
          } else {
            failureResult = `error: ${failure.error?.message}`
          }
          expect(failureResult).toBe(`error: ${errorMsg}`)
        }),
      )
    })

    // map should only transform Success values
    it("should only transform Success values with map", () => {
      fc.assert(
        fc.property(fc.string(), fc.integer(), (errorMsg, value) => {
          const transform = (n: number) => n * 2

          const success = Try(() => value)
          expect(success.map(transform).orThrow()).toBe(transform(value))

          const failure = Try<number>(() => {
            throw new Error(errorMsg)
          })
          expect(failure.map(transform).isFailure()).toBe(true)
        }),
      )
    })
  })

  describe("Try error handling properties", () => {
    // or should return the original Try for Success and the alternative for Failure
    it("should properly handle or", () => {
      fc.assert(
        fc.property(fc.string(), fc.integer(), (errorMsg, fallbackValue) => {
          const success = Try(() => 42)
          const alternative = Try(() => fallbackValue)
          expect(success.or(alternative).orThrow()).toBe(42)

          const failure = Try<number>(() => {
            throw new Error(errorMsg)
          })
          expect(failure.or(alternative).orThrow()).toBe(fallbackValue)
        }),
      )
    })

    // orThrow should return the value for Success and throw the provided error for Failure
    it("should properly handle orThrow", () => {
      fc.assert(
        fc.property(fc.string(), fc.integer(), (errorMsg, value) => {
          const success = Try(() => value)
          expect(success.orThrow(new Error("Custom error"))).toBe(value)

          const failure = Try<number>(() => {
            throw new Error(errorMsg)
          })
          const customError = new Error("Custom error")
          expect(() => failure.orThrow(customError)).toThrow(customError)
        }),
      )
    })

    // toEither should convert Success to Right and Failure to Left
    it("should properly convert to Either", () => {
      fc.assert(
        fc.property(fc.string(), fc.integer(), (errorMsg, value) => {
          const success = Try(() => value)
          const successEither = success.toEither("error")
          expect(successEither.isRight()).toBe(true)
          expect(successEither.orElse(0)).toBe(value)

          const failure = Try<number>(() => {
            throw new Error(errorMsg)
          })
          const failureEither = failure.toEither("error")
          expect(failureEither.isLeft()).toBe(true)
          expect(failureEither.orElse(0)).toBe(0)
        }),
      )
    })
  })
})
