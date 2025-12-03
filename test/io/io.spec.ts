import { describe, expect, it } from "vitest"

import { Left, Right } from "@/either"
import { Exit, IO } from "@/io"
import { None, Some } from "@/option"
import { Try } from "@/try"

describe("IO", () => {
  // ============================================
  // Constructors
  // ============================================

  describe("IO.succeed", () => {
    it("should create an IO that succeeds with the given value", async () => {
      const io = IO.succeed(42)
      const result = await io.run()
      expect(result).toBe(42)
    })
  })

  describe("IO.fail", () => {
    it("should create an IO that fails with the given error", async () => {
      const io = IO.fail(new Error("oops"))
      await expect(io.run()).rejects.toThrow("oops")
    })
  })

  describe("IO.sync", () => {
    it("should create a lazy IO from a synchronous function", async () => {
      let called = false
      const io = IO.sync(() => {
        called = true
        return 42
      })
      expect(called).toBe(false) // Lazy - not called until run
      const result = await io.run()
      expect(called).toBe(true)
      expect(result).toBe(42)
    })
  })

  describe("IO.async", () => {
    it("should create an IO from an async function", async () => {
      const io = IO.async(() => Promise.resolve(42))
      const result = await io.run()
      expect(result).toBe(42)
    })

    it("should be lazy - Promise not created until run", async () => {
      let called = false
      const io = IO.async(() => {
        called = true
        return Promise.resolve(42)
      })
      expect(called).toBe(false)
      await io.run()
      expect(called).toBe(true)
    })
  })

  describe("IO.tryPromise", () => {
    it("should handle successful Promise", async () => {
      const io = IO.tryPromise({
        try: () => Promise.resolve(42),
        catch: (e) => new Error(String(e)),
      })
      const result = await io.run()
      expect(result).toBe(42)
    })

    it("should transform error on failure", async () => {
      const io = IO.tryPromise({
        try: () => Promise.reject("raw error"),
        catch: (e) => new Error(`Wrapped: ${e}`),
      })
      await expect(io.run()).rejects.toThrow("Wrapped: raw error")
    })
  })

  describe("IO.die", () => {
    it("should create an IO with an unrecoverable defect", async () => {
      const io = IO.die(new Error("defect"))
      await expect(io.run()).rejects.toThrow("defect")
    })
  })

  // ============================================
  // Core Operations
  // ============================================

  describe("map", () => {
    it("should transform the success value", async () => {
      const io = IO.succeed(21).map((x) => x * 2)
      const result = await io.run()
      expect(result).toBe(42)
    })

    it("should not transform on failure", async () => {
      const io = IO.fail<Error, number>(new Error("oops")).map((x) => x * 2)
      await expect(io.run()).rejects.toThrow("oops")
    })
  })

  describe("flatMap", () => {
    it("should chain IO operations", async () => {
      const io = IO.succeed(21).flatMap((x) => IO.succeed(x * 2))
      const result = await io.run()
      expect(result).toBe(42)
    })

    it("should short-circuit on failure", async () => {
      const io = IO.fail<Error, number>(new Error("first")).flatMap(() => IO.fail(new Error("second")))
      await expect(io.run()).rejects.toThrow("first")
    })

    it("should propagate failure from chained effect", async () => {
      const io = IO.succeed(21).flatMap(() => IO.fail(new Error("chained error")))
      await expect(io.run()).rejects.toThrow("chained error")
    })
  })

  describe("tap", () => {
    it("should execute side effect without changing value", async () => {
      let sideEffect = 0
      const io = IO.succeed(42).tap((x) => {
        sideEffect = x
      })
      const result = await io.run()
      expect(result).toBe(42)
      expect(sideEffect).toBe(42)
    })
  })

  describe("tapEffect", () => {
    it("should execute effectful side effect without changing value", async () => {
      let sideEffect = 0
      const io = IO.succeed(42).tapEffect((x) =>
        IO.sync(() => {
          sideEffect = x
        }),
      )
      const result = await io.run()
      expect(result).toBe(42)
      expect(sideEffect).toBe(42)
    })
  })

  // ============================================
  // Error Handling
  // ============================================

  describe("mapError", () => {
    it("should transform the error", async () => {
      const io = IO.fail("raw error").mapError((e) => new Error(`Wrapped: ${e}`))
      await expect(io.run()).rejects.toThrow("Wrapped: raw error")
    })

    it("should not affect success", async () => {
      const io = IO.succeed(42).mapError(() => new Error("should not happen"))
      const result = await io.run()
      expect(result).toBe(42)
    })
  })

  describe("recover", () => {
    it("should recover from failure with fallback value", async () => {
      const io = IO.fail<Error, number>(new Error("oops")).recover(42)
      const result = await io.run()
      expect(result).toBe(42)
    })

    it("should not affect success", async () => {
      const io = IO.succeed(42).recover(0)
      const result = await io.run()
      expect(result).toBe(42)
    })
  })

  describe("recoverWith", () => {
    it("should recover from failure with another IO", async () => {
      const io = IO.fail<Error, number>(new Error("oops")).recoverWith(() => IO.succeed(42))
      const result = await io.run()
      expect(result).toBe(42)
    })

    it("should provide error to recovery function", async () => {
      const io = IO.fail<string, number>("original").recoverWith((e) => IO.succeed(e.length))
      const result = await io.run()
      expect(result).toBe(8) // "original".length
    })
  })

  describe("fold", () => {
    it("should handle success case", async () => {
      const io = IO.succeed(42).fold(
        () => "failed",
        (x) => `success: ${x}`,
      )
      const result = await io.run()
      expect(result).toBe("success: 42")
    })

    it("should handle failure case", async () => {
      const io = IO.fail<Error, number>(new Error("oops")).fold(
        (e) => `failed: ${e.message}`,
        (x) => `success: ${x}`,
      )
      const result = await io.run()
      expect(result).toBe("failed: oops")
    })
  })

  describe("match", () => {
    it("should pattern match on success", async () => {
      const io = IO.succeed(42).match({
        failure: () => "failed",
        success: (x) => `success: ${x}`,
      })
      const result = await io.run()
      expect(result).toBe("success: 42")
    })

    it("should pattern match on failure", async () => {
      const io = IO.fail<Error, number>(new Error("oops")).match({
        failure: (e) => `failed: ${e.message}`,
        success: (x) => `success: ${x}`,
      })
      const result = await io.run()
      expect(result).toBe("failed: oops")
    })
  })

  // ============================================
  // Combinators
  // ============================================

  describe("zip", () => {
    it("should combine two IOs into a tuple", async () => {
      const io = IO.succeed(1).zip(IO.succeed("a"))
      const result = await io.run()
      expect(result).toEqual([1, "a"])
    })

    it("should fail if first fails", async () => {
      const io = IO.fail<Error, number>(new Error("first")).zip(IO.succeed("a"))
      await expect(io.run()).rejects.toThrow("first")
    })

    it("should fail if second fails", async () => {
      const io = IO.succeed(1).zip(IO.fail<Error, string>(new Error("second")))
      await expect(io.run()).rejects.toThrow("second")
    })
  })

  describe("zipLeft", () => {
    it("should keep the first value", async () => {
      const io = IO.succeed(1).zipLeft(IO.succeed("a"))
      const result = await io.run()
      expect(result).toBe(1)
    })
  })

  describe("zipRight", () => {
    it("should keep the second value", async () => {
      const io = IO.succeed(1).zipRight(IO.succeed("a"))
      const result = await io.run()
      expect(result).toBe("a")
    })
  })

  describe("flatten", () => {
    it("should flatten nested IOs", async () => {
      const nested = IO.succeed(IO.succeed(42))
      const io = nested.flatten()
      const result = await io.run()
      expect(result).toBe(42)
    })
  })

  // ============================================
  // Execution
  // ============================================

  describe("runSync", () => {
    it("should run synchronous effects", () => {
      const io = IO.sync(() => 42)
      const result = io.runSync()
      expect(result).toBe(42)
    })

    it("should throw on async effects", () => {
      const io = IO.async(() => Promise.resolve(42))
      expect(() => io.runSync()).toThrow("Cannot run async effect synchronously")
    })

    it("should throw on failure", () => {
      const io = IO.fail(new Error("oops"))
      expect(() => io.runSync()).toThrow("oops")
    })
  })

  describe("runEither", () => {
    it("should return Right on success", async () => {
      const io = IO.succeed(42)
      const result = await io.runEither()
      expect(result.isRight()).toBe(true)
      expect(result.orElse(0)).toBe(42)
    })

    it("should return Left on failure", async () => {
      const io = IO.fail<Error, number>(new Error("oops"))
      const result = await io.runEither()
      expect(result.isLeft()).toBe(true)
    })
  })

  describe("runExit", () => {
    it("should return Success Exit on success", async () => {
      const io = IO.succeed(42)
      const exit = await io.runExit()
      expect(exit.isSuccess()).toBe(true)
      expect(exit.orThrow()).toBe(42)
    })

    it("should return Failure Exit on failure", async () => {
      const io = IO.fail<Error, number>(new Error("oops"))
      const exit = await io.runExit()
      expect(exit.isFailure()).toBe(true)
    })
  })

  // ============================================
  // Utilities
  // ============================================

  describe("pipe", () => {
    it("should pipe the IO through a function", async () => {
      const io = IO.succeed(42).pipe((io) => io.map((x) => x * 2))
      const result = await io.run()
      expect(result).toBe(84)
    })
  })

  describe("delay", () => {
    it("should delay execution", async () => {
      const start = Date.now()
      const io = IO.succeed(42).delay(50)
      await io.run()
      const elapsed = Date.now() - start
      expect(elapsed).toBeGreaterThanOrEqual(45) // Allow some timing variance
    })
  })

  describe("toString", () => {
    it("should return a string representation", () => {
      const io = IO.succeed(42)
      expect(io.toString()).toContain("IO")
    })
  })

  // ============================================
  // Lifting Functions
  // ============================================

  describe("liftSync", () => {
    it("should lift a sync function to IO-returning function", async () => {
      const add = (a: number, b: number) => a + b
      const liftedAdd = IO.liftSync(add)
      const io = liftedAdd(20, 22)
      const result = await io.run()
      expect(result).toBe(42)
    })
  })

  describe("liftPromise", () => {
    it("should lift a Promise function to IO-returning function", async () => {
      const asyncAdd = (a: number, b: number) => Promise.resolve(a + b)
      const liftedAdd = IO.liftPromise(asyncAdd)
      const io = liftedAdd(20, 22)
      const result = await io.run()
      expect(result).toBe(42)
    })
  })

  // ============================================
  // Integration with Other Types
  // ============================================

  describe("fromEither", () => {
    it("should create IO from Right", async () => {
      const either = Right<Error, number>(42)
      const io = IO.fromEither(either)
      const result = await io.run()
      expect(result).toBe(42)
    })

    it("should create IO from Left", async () => {
      const either = Left<Error, number>(new Error("oops"))
      const io = IO.fromEither(either)
      await expect(io.run()).rejects.toThrow("oops")
    })
  })

  describe("fromOption", () => {
    it("should create IO from Some", async () => {
      const option = Some(42)
      const io = IO.fromOption(option)
      const result = await io.run()
      expect(result).toBe(42)
    })

    it("should create failing IO from None", async () => {
      const option = None<number>()
      const io = IO.fromOption(option)
      const exit = await io.runExit()
      expect(exit.isFailure()).toBe(true)
    })
  })

  describe("fromOptionOrFail", () => {
    it("should use custom error for None", async () => {
      const option = None<number>()
      const io = IO.fromOptionOrFail(option, () => new Error("custom error"))
      await expect(io.run()).rejects.toThrow("custom error")
    })
  })

  describe("fromTry", () => {
    it("should create IO from successful Try", async () => {
      const t = Try(() => 42)
      const io = IO.fromTry(t)
      const result = await io.run()
      expect(result).toBe(42)
    })

    it("should create IO from failed Try", async () => {
      const t = Try<number>(() => {
        throw new Error("oops")
      })
      const io = IO.fromTry(t)
      await expect(io.run()).rejects.toThrow("oops")
    })
  })

  // ============================================
  // Combinators
  // ============================================

  describe("IO.all", () => {
    it("should collect all successful results", async () => {
      const io = IO.all([IO.succeed(1), IO.succeed(2), IO.succeed(3)])
      const result = await io.run()
      expect(result).toEqual([1, 2, 3])
    })

    it("should fail on first failure", async () => {
      const io = IO.all([IO.succeed(1), IO.fail(new Error("oops")), IO.succeed(3)])
      await expect(io.run()).rejects.toThrow("oops")
    })

    it("should return empty array for empty input", async () => {
      const io = IO.all([])
      const result = await io.run()
      expect(result).toEqual([])
    })
  })

  describe("IO.firstSuccessOf", () => {
    it("should return first success", async () => {
      const io = IO.firstSuccessOf([IO.fail(new Error("first")), IO.succeed(42), IO.succeed(43)])
      const result = await io.run()
      expect(result).toBe(42)
    })

    it("should fail if all fail", async () => {
      const io = IO.firstSuccessOf([IO.fail(new Error("first")), IO.fail(new Error("second"))])
      await expect(io.run()).rejects.toThrow("second")
    })
  })

  describe("IO.sleep", () => {
    it("should delay for specified time", async () => {
      const start = Date.now()
      await IO.sleep(50).run()
      const elapsed = Date.now() - start
      expect(elapsed).toBeGreaterThanOrEqual(45)
    })
  })

  describe("IO.unit", () => {
    it("should return undefined", async () => {
      const result = await IO.unit.run()
      expect(result).toBeUndefined()
    })
  })

  describe("IO.fromNullable", () => {
    it("should succeed for non-null value", async () => {
      const io = IO.fromNullable(42)
      const result = await io.run()
      expect(result).toBe(42)
    })

    it("should fail for null", async () => {
      const io = IO.fromNullable(null)
      const exit = await io.runExit()
      expect(exit.isFailure()).toBe(true)
    })

    it("should fail for undefined", async () => {
      const io = IO.fromNullable(undefined)
      const exit = await io.runExit()
      expect(exit.isFailure()).toBe(true)
    })
  })

  // ============================================
  // Generator Syntax
  // ============================================

  describe("IO.gen", () => {
    it("should support generator do-notation", async () => {
      const program = IO.gen(function* () {
        const a = yield* IO.succeed(1)
        const b = yield* IO.succeed(2)
        return a + b
      })
      const result = await program.run()
      expect(result).toBe(3)
    })

    it("should short-circuit on failure", async () => {
      const program = IO.gen(function* () {
        const a = yield* IO.succeed(1)
        yield* IO.fail(new Error("oops"))
        return a + 1 // Should not reach here
      })
      await expect(program.run()).rejects.toThrow("oops")
    })
  })
})

// ============================================
// Exit Tests
// ============================================

describe("Exit", () => {
  describe("Exit.succeed", () => {
    it("should create a success exit", () => {
      const exit = Exit.succeed(42)
      expect(exit.isSuccess()).toBe(true)
      expect(exit.orThrow()).toBe(42)
    })
  })

  describe("Exit.fail", () => {
    it("should create a failure exit", () => {
      const exit = Exit.fail(new Error("oops"))
      expect(exit.isFailure()).toBe(true)
      expect(() => exit.orThrow()).toThrow("oops")
    })
  })

  describe("Exit.interrupt", () => {
    it("should create an interrupted exit", () => {
      const exit = Exit.interrupt("fiber-123")
      expect(exit.isInterrupted()).toBe(true)
      expect(() => exit.orThrow()).toThrow("interrupted")
    })
  })

  describe("map", () => {
    it("should transform success value", () => {
      const exit = Exit.succeed(21).map((x) => x * 2)
      expect(exit.orThrow()).toBe(42)
    })

    it("should not transform failure", () => {
      const exit = Exit.fail<Error, number>(new Error("oops")).map((x) => x * 2)
      expect(exit.isFailure()).toBe(true)
    })
  })

  describe("mapError", () => {
    it("should transform error value", () => {
      const exit = Exit.fail("raw").mapError((e) => new Error(`Wrapped: ${e}`))
      expect(exit.isFailure()).toBe(true)
    })

    it("should not transform success", () => {
      const exit = Exit.succeed(42).mapError(() => new Error("should not happen"))
      expect(exit.orThrow()).toBe(42)
    })
  })

  describe("flatMap", () => {
    it("should chain success exits", () => {
      const exit = Exit.succeed(21).flatMap((x) => Exit.succeed(x * 2))
      expect(exit.orThrow()).toBe(42)
    })

    it("should short-circuit on failure", () => {
      const exit = Exit.fail<Error, number>(new Error("first")).flatMap(() => Exit.succeed(42))
      expect(exit.isFailure()).toBe(true)
    })
  })

  describe("fold", () => {
    it("should handle success", () => {
      const result = Exit.succeed(42).fold(
        () => "failed",
        (x) => `success: ${x}`,
      )
      expect(result).toBe("success: 42")
    })

    it("should handle failure", () => {
      const result = Exit.fail<Error, number>(new Error("oops")).fold(
        (e) => `failed: ${e.message}`,
        (x) => `success: ${x}`,
      )
      expect(result).toBe("failed: oops")
    })
  })

  describe("match", () => {
    it("should pattern match all cases", () => {
      const successExit = Exit.succeed(42)
      const failureExit = Exit.fail<Error, number>(new Error("oops"))
      const interruptedExit = Exit.interrupt<Error, number>("fiber-123")

      expect(
        successExit.match({
          Success: (v) => `success: ${v}`,
          Failure: (e) => `failure: ${e}`,
          Interrupted: (id) => `interrupted: ${id}`,
        }),
      ).toBe("success: 42")

      expect(
        failureExit.match({
          Success: (v) => `success: ${v}`,
          Failure: (e) => `failure: ${e.message}`,
          Interrupted: (id) => `interrupted: ${id}`,
        }),
      ).toBe("failure: oops")

      expect(
        interruptedExit.match({
          Success: (v) => `success: ${v}`,
          Failure: (e) => `failure: ${e}`,
          Interrupted: (id) => `interrupted: ${id}`,
        }),
      ).toBe("interrupted: fiber-123")
    })
  })

  describe("toOption", () => {
    it("should return Some for success", () => {
      const option = Exit.succeed(42).toOption()
      expect(option.isSome()).toBe(true)
      expect(option.orElse(0)).toBe(42)
    })

    it("should return None for failure", () => {
      const option = Exit.fail<Error, number>(new Error("oops")).toOption()
      expect(option.isNone()).toBe(true)
    })
  })

  describe("toEither", () => {
    it("should return Right for success", () => {
      const either = Exit.succeed(42).toEither()
      expect(either.isRight()).toBe(true)
    })

    it("should return Left for failure", () => {
      const either = Exit.fail<Error, number>(new Error("oops")).toEither()
      expect(either.isLeft()).toBe(true)
    })

    it("should throw for interrupted", () => {
      expect(() => Exit.interrupt<Error, number>("fiber-123").toEither()).toThrow()
    })
  })

  describe("Exit.zip", () => {
    it("should combine two success exits", () => {
      const exit = Exit.zip(Exit.succeed(1), Exit.succeed("a"))
      expect(exit.isSuccess()).toBe(true)
      expect(exit.orThrow()).toEqual([1, "a"])
    })

    it("should fail if first fails", () => {
      const exit = Exit.zip(Exit.fail(new Error("first")), Exit.succeed("a"))
      expect(exit.isFailure()).toBe(true)
    })
  })

  describe("Exit.all", () => {
    it("should collect all success exits", () => {
      const exit = Exit.all([Exit.succeed(1), Exit.succeed(2), Exit.succeed(3)])
      expect(exit.isSuccess()).toBe(true)
      expect(exit.orThrow()).toEqual([1, 2, 3])
    })

    it("should fail on first failure", () => {
      const exit = Exit.all([Exit.succeed(1), Exit.fail(new Error("oops")), Exit.succeed(3)])
      expect(exit.isFailure()).toBe(true)
    })
  })

  describe("Exit.fromEither", () => {
    it("should create success from Right", () => {
      const exit = Exit.fromEither(Right(42))
      expect(exit.isSuccess()).toBe(true)
    })

    it("should create failure from Left", () => {
      const exit = Exit.fromEither(Left(new Error("oops")))
      expect(exit.isFailure()).toBe(true)
    })
  })
})
