import * as fc from "fast-check"
import { describe, expect, it } from "vitest"

import { IO } from "@/io"

/**
 * Property-based tests for IO monad laws and invariants
 */

describe("IO Property Tests", () => {
  // ============================================
  // Functor Laws
  // ============================================

  describe("Functor Laws", () => {
    it("identity: io.map(x => x) === io", async () => {
      await fc.assert(
        fc.asyncProperty(fc.integer(), async (n) => {
          const io = IO.succeed(n)
          const mapped = io.map((x) => x)

          const original = await io.run()
          const result = await mapped.run()
          expect(result).toBe(original)
        }),
      )
    })

    it("composition: io.map(f).map(g) === io.map(x => g(f(x)))", async () => {
      const f = (x: number) => x * 2
      const g = (x: number) => x + 10

      await fc.assert(
        fc.asyncProperty(fc.integer({ min: -1000, max: 1000 }), async (n) => {
          const io = IO.succeed(n)

          const left = await io.map(f).map(g).run()
          const right = await io.map((x) => g(f(x))).run()

          expect(left).toBe(right)
        }),
      )
    })
  })

  // ============================================
  // Monad Laws
  // ============================================

  describe("Monad Laws", () => {
    const f = (x: number) => IO.succeed(x * 2)
    const g = (x: number) => IO.succeed(x + 10)

    it("left identity: IO.succeed(a).flatMap(f) === f(a)", async () => {
      await fc.assert(
        fc.asyncProperty(fc.integer({ min: -1000, max: 1000 }), async (a) => {
          const left = await IO.succeed(a).flatMap(f).run()
          const right = await f(a).run()
          expect(left).toBe(right)
        }),
      )
    })

    it("right identity: m.flatMap(IO.succeed) === m", async () => {
      await fc.assert(
        fc.asyncProperty(fc.integer(), async (n) => {
          const m = IO.succeed(n)
          const left = await m.flatMap(IO.succeed).run()
          const right = await m.run()
          expect(left).toBe(right)
        }),
      )
    })

    it("associativity: m.flatMap(f).flatMap(g) === m.flatMap(x => f(x).flatMap(g))", async () => {
      await fc.assert(
        fc.asyncProperty(fc.integer({ min: -1000, max: 1000 }), async (n) => {
          const m = IO.succeed(n)

          const left = await m.flatMap(f).flatMap(g).run()
          const right = await m.flatMap((x) => f(x).flatMap(g)).run()

          expect(left).toBe(right)
        }),
      )
    })
  })

  // ============================================
  // Applicative Laws (via zip)
  // ============================================

  describe("Applicative-like Properties", () => {
    it("zip is commutative in structure: io1.zip(io2) produces [a, b]", async () => {
      await fc.assert(
        fc.asyncProperty(fc.integer(), fc.string(), async (n, s) => {
          const io1 = IO.succeed(n)
          const io2 = IO.succeed(s)

          const result = await io1.zip(io2).run()
          expect(result).toEqual([n, s])
        }),
      )
    })

    it("zipLeft preserves first value", async () => {
      await fc.assert(
        fc.asyncProperty(fc.integer(), fc.string(), async (n, s) => {
          const io1 = IO.succeed(n)
          const io2 = IO.succeed(s)

          const result = await io1.zipLeft(io2).run()
          expect(result).toBe(n)
        }),
      )
    })

    it("zipRight preserves second value", async () => {
      await fc.assert(
        fc.asyncProperty(fc.integer(), fc.string(), async (n, s) => {
          const io1 = IO.succeed(n)
          const io2 = IO.succeed(s)

          const result = await io1.zipRight(io2).run()
          expect(result).toBe(s)
        }),
      )
    })
  })

  // ============================================
  // Error Handling Properties
  // ============================================

  describe("Error Handling Properties", () => {
    it("recover always produces a value", async () => {
      await fc.assert(
        fc.asyncProperty(fc.string(), fc.integer(), async (errorMsg, fallback) => {
          const io = IO.fail(errorMsg).recover(fallback)
          const result = await io.run()
          expect(result).toBe(fallback)
        }),
      )
    })

    it("succeed followed by recover returns original value", async () => {
      await fc.assert(
        fc.asyncProperty(fc.integer(), fc.integer(), async (original, fallback) => {
          const io = IO.succeed(original).recover(fallback)
          const result = await io.run()
          expect(result).toBe(original)
        }),
      )
    })

    it("mapError transforms error", async () => {
      await fc.assert(
        fc.asyncProperty(fc.string(), async (errorMsg) => {
          const io = IO.fail(errorMsg).mapError((e) => `Wrapped: ${e}`)
          const exit = await io.runExit()
          expect(exit.isFailure()).toBe(true)
        }),
      )
    })

    it("fold handles both success and failure", async () => {
      await fc.assert(
        fc.asyncProperty(fc.integer(), async (n) => {
          const successIo = IO.succeed(n).fold(
            () => "failed",
            (x) => `success: ${x}`,
          )
          const failIo = IO.fail("error").fold(
            (e) => `failed: ${e}`,
            (x) => `success: ${x}`,
          )

          const successResult = await successIo.run()
          const failResult = await failIo.run()

          expect(successResult).toBe(`success: ${n}`)
          expect(failResult).toBe("failed: error")
        }),
      )
    })
  })

  // ============================================
  // IO.all Properties
  // ============================================

  describe("IO.all Properties", () => {
    it("collects all results in order", async () => {
      await fc.assert(
        fc.asyncProperty(fc.array(fc.integer(), { minLength: 0, maxLength: 10 }), async (nums) => {
          const ios = nums.map((n) => IO.succeed(n))
          const result = await IO.all(ios).run()
          expect(result).toEqual(nums)
        }),
      )
    })

    it("empty array returns empty result", async () => {
      const result = await IO.all<never, never, never>([]).run()
      expect(result).toEqual([])
    })
  })

  // ============================================
  // Retry Properties
  // ============================================

  describe("Retry Properties", () => {
    it("retry(0) behaves like no retry", async () => {
      await fc.assert(
        fc.asyncProperty(fc.integer(), async (n) => {
          const io = IO.succeed(n).retry(0)
          const result = await io.run()
          expect(result).toBe(n)
        }),
      )
    })

    it("successful IO doesn't need retry", async () => {
      await fc.assert(
        fc.asyncProperty(fc.integer(), fc.nat({ max: 5 }), async (n, retries) => {
          let callCount = 0
          const io = IO.sync(() => {
            callCount++
            return n
          }).retry(retries)

          const result = await io.run()
          expect(result).toBe(n)
          expect(callCount).toBe(1) // Only called once
        }),
      )
    })
  })

  // ============================================
  // Laziness Properties
  // ============================================

  describe("Laziness Properties", () => {
    it("IO.sync is lazy - thunk not called until run", async () => {
      await fc.assert(
        fc.asyncProperty(fc.integer(), async (n) => {
          let called = false
          const io = IO.sync(() => {
            called = true
            return n
          })

          // Not called yet
          expect(called).toBe(false)

          // Called after run
          await io.run()
          expect(called).toBe(true)
        }),
      )
    })

    it("IO.async is lazy - Promise not created until run", async () => {
      await fc.assert(
        fc.asyncProperty(fc.integer(), async (n) => {
          let called = false
          const io = IO.async(() => {
            called = true
            return Promise.resolve(n)
          })

          // Not called yet
          expect(called).toBe(false)

          // Called after run
          await io.run()
          expect(called).toBe(true)
        }),
      )
    })
  })

  // ============================================
  // runEither/runExit Properties
  // ============================================

  describe("Execution Properties", () => {
    it("runEither returns Right for success", async () => {
      await fc.assert(
        fc.asyncProperty(fc.integer(), async (n) => {
          const either = await IO.succeed(n).runEither()
          expect(either.isRight()).toBe(true)
          expect(either.orElse(0)).toBe(n)
        }),
      )
    })

    it("runEither returns Left for failure", async () => {
      await fc.assert(
        fc.asyncProperty(fc.string(), async (errorMsg) => {
          const either = await IO.fail(errorMsg).runEither()
          expect(either.isLeft()).toBe(true)
        }),
      )
    })

    it("runExit returns Success for success", async () => {
      await fc.assert(
        fc.asyncProperty(fc.integer(), async (n) => {
          const exit = await IO.succeed(n).runExit()
          expect(exit.isSuccess()).toBe(true)
          expect(exit.orThrow()).toBe(n)
        }),
      )
    })

    it("runExit returns Failure for failure", async () => {
      await fc.assert(
        fc.asyncProperty(fc.string(), async (errorMsg) => {
          const exit = await IO.fail(errorMsg).runExit()
          expect(exit.isFailure()).toBe(true)
        }),
      )
    })

    it("runOption returns Some for success", async () => {
      await fc.assert(
        fc.asyncProperty(fc.integer(), async (n) => {
          const option = await IO.succeed(n).runOption()
          expect(option.isSome()).toBe(true)
          expect(option.orElse(0)).toBe(n)
        }),
      )
    })

    it("runOption returns None for failure", async () => {
      await fc.assert(
        fc.asyncProperty(fc.string(), async (errorMsg) => {
          const option = await IO.fail(errorMsg).runOption()
          expect(option.isNone()).toBe(true)
        }),
      )
    })
  })
})
