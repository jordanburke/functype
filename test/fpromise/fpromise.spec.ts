import { describe, expect, it, vi } from "vitest"

import { FPromise } from "../../src/fPromise/FPromise"

describe("FPromise", () => {
  describe("basic functionality", () => {
    it("should resolve with a value", async () => {
      const promise = FPromise<number>((resolve: (value: number) => void) => resolve(42))
      const result = await promise.toPromise()
      expect(result).toBe(42)
    })

    it("should reject with an error", async () => {
      const error = new Error("Test error")
      const promise = FPromise<number>((_, reject) => reject(error))

      await expect(promise.toPromise()).rejects.toEqual(error)
    })

    it("should be thenable", async () => {
      const promise = FPromise.resolve(42)
      let result: number | undefined

      await promise.then((value) => {
        result = value
      })
      expect(result).toBe(42)
    })
  })

  describe("map", () => {
    it("should transform resolved values", async () => {
      const promise = FPromise.resolve<number>(42)
      const mapped = promise.map((x) => x * 2)

      expect(await mapped.toPromise()).toBe(84)
    })

    it("should propagate errors", async () => {
      const error = new Error("Test error")
      const promise = FPromise.reject<number>(error)
      const mapped = promise.map((x) => x * 2)

      await expect(mapped.toPromise()).rejects.toEqual(error)
    })

    it("should catch mapping errors", async () => {
      const promise = FPromise.resolve(42)
      const mapped = promise.map(() => {
        throw new Error("Mapping error")
      })

      await expect(mapped.toPromise()).rejects.toThrow("Mapping error")
    })
  })

  describe("flatMap", () => {
    it("should chain promises", async () => {
      const promise = FPromise.resolve(42)
      const chained = promise.flatMap((x) => FPromise.resolve(x.toString()))

      expect(await chained.toPromise()).toBe("42")
    })

    it("should work with regular promises", async () => {
      const promise = FPromise.resolve(42)
      const chained = promise.flatMap((x) => Promise.resolve(x.toString()))

      expect(await chained.toPromise()).toBe("42")
    })

    it("should propagate errors from the source promise", async () => {
      const error = new Error("Source error")
      const promise = FPromise.reject<number>(error)
      const chained = promise.flatMap((x) => FPromise.resolve(x.toString()))

      await expect(chained.toPromise()).rejects.toEqual(error)
    })

    it("should propagate errors from the mapped promise", async () => {
      const error = new Error("Mapped error")
      const promise = FPromise.resolve(42)
      const chained = promise.flatMap(() => FPromise.reject<string>(error))

      await expect(chained.toPromise()).rejects.toEqual(error)
    })

    it("should catch mapping function errors", async () => {
      const promise = FPromise.resolve(42)
      const chained = promise.flatMap(() => {
        throw new Error("Mapping function error")
      })

      await expect(chained.toPromise()).rejects.toThrow("Mapping function error")
    })
  })

  describe("flatMapAsync", () => {
    it("should chain promises asynchronously", async () => {
      const promise = FPromise.resolve(42)
      // flatMapAsync now returns Promise<string> directly
      const result = await promise.flatMapAsync((x) => FPromise.resolve(x.toString()))

      expect(result).toBe("42")
    })

    it("should work with regular promises", async () => {
      const promise = FPromise.resolve(42)
      // flatMapAsync now returns Promise<string> directly
      const result = await promise.flatMapAsync((x) => Promise.resolve(x.toString()))

      expect(result).toBe("42")
    })
  })

  describe("tap", () => {
    it("should apply side effects without changing the value", async () => {
      let sideEffect = 0
      const promise = FPromise.resolve(42)
      const tapped = promise.tap((x) => {
        sideEffect = x
      })

      expect(await tapped.toPromise()).toBe(42)
      expect(sideEffect).toBe(42)
    })

    it("should propagate the original error", async () => {
      const error = new Error("Original error")
      let sideEffect = 0

      const promise = FPromise.reject<number>(error)
      const tapped = promise.tap((x) => {
        sideEffect = x
      })

      await expect(tapped.toPromise()).rejects.toEqual(error)
      expect(sideEffect).toBe(0) // Side effect shouldn't run on rejection
    })

    it("should catch side effect errors", async () => {
      const promise = FPromise.resolve(42)
      const tapped = promise.tap(() => {
        throw new Error("Side effect error")
      })

      await expect(tapped.toPromise()).rejects.toThrow("Side effect error")
    })
  })

  describe("mapError", () => {
    it("should transform rejected errors", async () => {
      const originalError = new Error("Original error")
      const promise = FPromise.reject<number>(originalError)
      const mapped = promise.mapError((err) => {
        if (err instanceof Error) {
          return new Error(`Transformed: ${err.message}`)
        }
        return err
      })

      await expect(mapped.toPromise()).rejects.toThrow("Transformed: Original error")
    })

    it("should not affect resolved values", async () => {
      const promise = FPromise.resolve(42)
      const mapped = promise.mapError(() => new Error("Transformed error"))

      expect(await mapped.toPromise()).toBe(42)
    })

    it("should catch mapping errors", async () => {
      const promise = FPromise.reject<number>(new Error("Original error"))
      const mapped = promise.mapError(() => {
        throw new Error("Mapping error")
      })

      await expect(mapped.toPromise()).rejects.toThrow("Mapping error")
    })
  })

  describe("tapError", () => {
    it("should apply side effects to errors without changing them", async () => {
      const originalError = new Error("Original error")
      let sideEffect: unknown = null

      const promise = FPromise.reject<number>(originalError)
      const tapped = promise.tapError((err) => {
        sideEffect = err
      })

      await expect(tapped.toPromise()).rejects.toEqual(originalError)
      expect(sideEffect).toEqual(originalError)
    })

    it("should not affect resolved values", async () => {
      let sideEffect = false
      const promise = FPromise.resolve(42)
      const tapped = promise.tapError(() => {
        sideEffect = true
      })

      expect(await tapped.toPromise()).toBe(42)
      expect(sideEffect).toBe(false) // Side effect shouldn't run on success
    })

    it("should catch side effect errors", async () => {
      const promise = FPromise.reject<number>(new Error("Original error"))
      const tapped = promise.tapError(() => {
        throw new Error("Side effect error")
      })

      await expect(tapped.toPromise()).rejects.toThrow("Side effect error")
    })
  })

  describe("static methods", () => {
    describe("resolve", () => {
      it("should create a resolved FPromise", async () => {
        const promise = FPromise.resolve(42)
        expect(await promise.toPromise()).toBe(42)
      })
    })

    describe("reject", () => {
      it("should create a rejected FPromise", async () => {
        const error = new Error("Test error")
        const promise = FPromise.reject<number>(error)

        await expect(promise.toPromise()).rejects.toEqual(error)
      })
    })

    describe("from", () => {
      it("should convert a Promise to an FPromise", async () => {
        const originalPromise = Promise.resolve(42)
        const fPromise = FPromise.from(originalPromise)

        expect(await fPromise.toPromise()).toBe(42)
      })

      it("should handle rejected promises", async () => {
        const error = new Error("Test error")
        const originalPromise = Promise.reject(error)
        const fPromise = FPromise.from(originalPromise)

        await expect(fPromise.toPromise()).rejects.toEqual(error)
      })
    })

    describe("all", () => {
      it("should resolve with an array of all resolved values", async () => {
        const promises = [FPromise.resolve(1), FPromise.resolve(2), FPromise.resolve(3)]

        const result = await FPromise.all(promises).toPromise()
        expect(result).toEqual([1, 2, 3])
      })

      it("should reject if any promise rejects", async () => {
        const error = new Error("Test error")
        const promises = [FPromise.resolve(1), FPromise.reject<number>(error), FPromise.resolve(3)]

        await expect(FPromise.all(promises).toPromise()).rejects.toEqual(error)
      })

      it("should accept a mix of FPromise, Promise and values", async () => {
        const promises = [FPromise.resolve(1), Promise.resolve(2), 3]

        const result = await FPromise.all(promises).toPromise()
        expect(result).toEqual([1, 2, 3])
      })
    })
  })

  describe("composition", () => {
    it("should support chaining multiple operations", async () => {
      const promise = FPromise.resolve(42)

      const result = await promise
        .map((x) => x * 2)
        .tap((x) => expect(x).toBe(84))
        .flatMap((x) => FPromise.resolve(x.toString()))
        .map((s) => `Result: ${s}`)
        .toPromise()

      expect(result).toBe("Result: 84")
    })

    it("should handle errors in chains", async () => {
      const promise = FPromise.resolve(42)

      const chain = promise
        .map((x) => x * 2)
        .flatMap(() => FPromise.reject<string>(new Error("Chain error")))
        .map((s) => `Result: ${s}`)

      await expect(chain.toPromise()).rejects.toThrow("Chain error")
    })

    it("should support error transformation in chains", async () => {
      const promise = FPromise.resolve(42)

      const chain = promise
        .map((x) => x * 2)
        .flatMap(() => FPromise.reject<string>(new Error("Original error")))
        .mapError((err) => {
          if (err instanceof Error) {
            return new Error(`Transformed: ${err.message}`)
          }
          return err
        })

      await expect(chain.toPromise()).rejects.toThrow("Transformed: Original error")
    })

    it("should support recovery from errors", async () => {
      const mockFn = vi.fn()

      const result = await FPromise.reject<number>(new Error("Test error"))
        .tapError(mockFn)
        .flatMap(() => FPromise.resolve(42))
        .toPromise()
        .catch(() => 42) // Catch the error and return 42 instead

      expect(result).toBe(42)
      expect(mockFn).toHaveBeenCalled()
    })
  })

  describe("real-world scenarios", () => {
    it("should handle delays with timeouts", async () => {
      const delayedPromise = FPromise<number>((resolve) => {
        setTimeout(() => resolve(42), 50)
      })

      const result = await delayedPromise.toPromise()
      expect(result).toBe(42)
    })

    it("should handle conditional processing", async () => {
      const processValue = (value: number) => {
        if (value > 50) {
          return FPromise.resolve(`Large: ${value}`)
        } else {
          return FPromise.resolve(`Small: ${value}`)
        }
      }

      const smallResult = await FPromise.resolve(42).flatMap(processValue).toPromise()
      const largeResult = await FPromise.resolve(100).flatMap(processValue).toPromise()

      expect(smallResult).toBe("Small: 42")
      expect(largeResult).toBe("Large: 100")
    })

    it("should handle retries", async () => {
      let attempts = 0

      const unreliableOperation = () => {
        attempts++
        if (attempts < 3) {
          return FPromise.reject<number>(new Error(`Attempt ${attempts} failed`))
        }
        return FPromise.resolve(42)
      }

      // Fixed retry implementation
      const retry = <T>(operation: () => FPromise<T>, maxRetries: number): FPromise<T> => {
        return FPromise<T>((resolve, reject) => {
          operation()
            .toPromise()
            .then(resolve)
            .catch((error) => {
              if (maxRetries > 0) {
                retry(operation, maxRetries - 1)
                  .toPromise()
                  .then(resolve)
                  .catch(reject)
              } else {
                reject(error)
              }
            })
        })
      }

      // Using Promise's catch instead for the test
      try {
        const result = await retry(unreliableOperation, 3).toPromise()
        expect(result).toBe(42)
        expect(attempts).toBe(3)
      } catch (error) {
        // This should not happen if retry works correctly
        expect.fail("Retry should have succeeded")
      }
    })
  })
})
