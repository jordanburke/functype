import { describe, expect, it } from "vitest"

import { Left, Right } from "@/either"
import { Exit, IO, InterruptedError, TimeoutError } from "@/io"
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

  // ============================================
  // Do-Builder Pattern
  // ============================================

  describe("IO.Do", () => {
    it("should support basic bind pattern", async () => {
      const program = IO.Do.bind("a", () => IO.succeed(1))
        .bind("b", () => IO.succeed(2))
        .map(({ a, b }) => a + b)

      const result = await program.run()
      expect(result).toBe(3)
    })

    it("should allow accessing previous bindings", async () => {
      const program = IO.Do.bind("x", () => IO.succeed(10))
        .bind("y", ({ x }) => IO.succeed(x * 2))
        .map(({ x, y }) => x + y)

      const result = await program.run()
      expect(result).toBe(30) // 10 + 20
    })

    it("should support let for pure values", async () => {
      const program = IO.Do.bind("a", () => IO.succeed(5))
        .let("b", ({ a }) => a * 2)
        .map(({ a, b }) => a + b)

      const result = await program.run()
      expect(result).toBe(15) // 5 + 10
    })

    it("should support mixing bind and let", async () => {
      const program = IO.Do.bind("fetched", () => IO.succeed(100))
        .let("doubled", ({ fetched }) => fetched * 2)
        .bind("async", ({ doubled }) => IO.succeed(doubled + 1))
        .map(({ fetched, doubled, async }) => ({ fetched, doubled, async }))

      const result = await program.run()
      expect(result).toEqual({ fetched: 100, doubled: 200, async: 201 })
    })

    it("should short-circuit on failure", async () => {
      const program = IO.Do.bind("a", () => IO.succeed(1))
        .bind("b", () => IO.fail(new Error("oops")))
        .bind("c", () => IO.succeed(3))
        .map(({ a, c }) => a + c)

      await expect(program.run()).rejects.toThrow("oops")
    })

    it("should support tap for side effects", async () => {
      let sideEffect = 0
      const program = IO.Do.bind("value", () => IO.succeed(42))
        .tap(({ value }) => {
          sideEffect = value
        })
        .map(({ value }) => value)

      const result = await program.run()
      expect(result).toBe(42)
      expect(sideEffect).toBe(42)
    })

    it("should support tapEffect for effectful side effects", async () => {
      let sideEffect = 0
      const program = IO.Do.bind("value", () => IO.succeed(42))
        .tapEffect(({ value }) =>
          IO.sync(() => {
            sideEffect = value
          }),
        )
        .map(({ value }) => value)

      const result = await program.run()
      expect(result).toBe(42)
      expect(sideEffect).toBe(42)
    })

    it("should support flatMap to chain to another IO", async () => {
      const program = IO.Do.bind("a", () => IO.succeed(10))
        .bind("b", () => IO.succeed(20))
        .flatMap(({ a, b }) => IO.succeed(a + b))

      const result = await program.run()
      expect(result).toBe(30)
    })

    it("should support done to return context as-is", async () => {
      const program = IO.Do.bind("name", () => IO.succeed("Alice"))
        .bind("age", () => IO.succeed(30))
        .done()

      const result = await program.run()
      expect(result).toEqual({ name: "Alice", age: 30 })
    })

    it("should have access to effect property", async () => {
      const builder = IO.Do.bind("x", () => IO.succeed(1))
      const effect = builder.effect
      const result = await effect.run()
      expect(result).toEqual({ x: 1 })
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

// ============================================
// Dependency Injection Tests
// ============================================

import { Context, Layer, Tag } from "@/io"

describe("Dependency Injection", () => {
  // Define test service interfaces
  interface Logger {
    log(message: string): string
  }

  interface Config {
    host: string
    port: number
  }

  // Create tags
  const Logger = Tag<Logger>("Logger")
  const Config = Tag<Config>("Config")

  describe("Tag", () => {
    it("should create a tag with an id", () => {
      expect(Logger.id).toBe("Logger")
      expect(Logger.toString()).toBe("Tag(Logger)")
    })
  })

  describe("Context", () => {
    it("should create empty context", () => {
      const ctx = Context.empty()
      expect(ctx.size).toBe(0)
    })

    it("should add and retrieve services", () => {
      const logger: Logger = { log: (msg) => msg }
      const ctx = Context.make(Logger, logger)

      expect(ctx.has(Logger)).toBe(true)
      expect(ctx.get(Logger).isSome()).toBe(true)
      expect(ctx.unsafeGet(Logger)).toBe(logger)
    })

    it("should merge contexts", () => {
      const logger: Logger = { log: (msg) => msg }
      const config: Config = { host: "localhost", port: 8080 }

      const ctx1 = Context.make(Logger, logger)
      const ctx2 = Context.make(Config, config)
      const merged = ctx1.merge(ctx2)

      expect(merged.has(Logger)).toBe(true)
      expect(merged.has(Config)).toBe(true)
    })

    it("should throw on missing service", () => {
      const ctx = Context.empty()
      expect(() => ctx.unsafeGet(Logger)).toThrow("Service not found: Logger")
    })
  })

  describe("IO.service", () => {
    it("should access provided service", async () => {
      const logger: Logger = { log: (msg) => `Logged: ${msg}` }

      const program = IO.service(Logger).flatMap((svc) => IO.sync(() => svc.log("Hello")))

      const result = await program.provideService(Logger, logger).run()
      expect(result).toBe("Logged: Hello")
    })

    it("should fail when service not provided", async () => {
      const program = IO.service(Logger)
      await expect(program.run()).rejects.toThrow("Service not found: Logger")
    })

    it("should work with serviceWith", async () => {
      const config: Config = { host: "localhost", port: 8080 }

      const program = IO.serviceWith(Config, (cfg) => `${cfg.host}:${cfg.port}`)

      const result = await program.provideService(Config, config).run()
      expect(result).toBe("localhost:8080")
    })

    it("should work with serviceWithIO", async () => {
      const config: Config = { host: "localhost", port: 8080 }

      const program = IO.serviceWithIO(Config, (cfg) => IO.succeed(`${cfg.host}:${cfg.port}`))

      const result = await program.provideService(Config, config).run()
      expect(result).toBe("localhost:8080")
    })
  })

  describe("provideContext", () => {
    it("should provide multiple services at once", async () => {
      const logger: Logger = { log: (msg) => `Logged: ${msg}` }
      const config: Config = { host: "localhost", port: 8080 }

      const program = IO.Do.bind("logger", () => IO.service(Logger))
        .bind("config", () => IO.service(Config))
        .map(({ logger: log, config: cfg }) => log.log(`${cfg.host}:${cfg.port}`))

      const ctx = Context.empty<Logger & Config>().add(Logger, logger).add(Config, config)

      const result = await program.provideContext(ctx).run()
      expect(result).toBe("Logged: localhost:8080")
    })
  })

  describe("Layer", () => {
    it("should create layer with succeed", async () => {
      const logger: Logger = { log: (msg) => `Logged: ${msg}` }
      const LoggerLive = Layer.succeed(Logger, logger)

      const program = IO.service(Logger).flatMap((svc) => IO.sync(() => svc.log("Test")))

      const result = await program.provideLayer(LoggerLive).run()
      expect(result).toBe("Logged: Test")
    })

    it("should create layer with sync", async () => {
      const LoggerLive = Layer.sync(Logger, () => ({
        log: (msg) => `Sync Logged: ${msg}`,
      }))

      const program = IO.service(Logger).flatMap((svc) => IO.sync(() => svc.log("Test")))

      const result = await program.provideLayer(LoggerLive).run()
      expect(result).toBe("Sync Logged: Test")
    })

    it("should create layer with effect", async () => {
      const LoggerLive = Layer.effect(Logger, async () => ({
        log: (msg) => `Async Logged: ${msg}`,
      }))

      const program = IO.service(Logger).flatMap((svc) => IO.sync(() => svc.log("Test")))

      const result = await program.provideLayer(LoggerLive).run()
      expect(result).toBe("Async Logged: Test")
    })

    it("should create layer from service dependency", async () => {
      const config: Config = { host: "localhost", port: 8080 }

      const ConfigLive = Layer.succeed(Config, config)

      const LoggerLive = Layer.fromService(Logger, Config, (cfg) => ({
        log: (msg) => `[${cfg.host}:${cfg.port}] ${msg}`,
      }))

      const program = IO.service(Logger).flatMap((svc) => IO.sync(() => svc.log("Hello")))

      // Need to provide both layers
      const fullLayer = ConfigLive.provideToAndMerge(LoggerLive)
      const result = await program.provideLayer(fullLayer).run()
      expect(result).toBe("[localhost:8080] Hello")
    })

    it("should merge independent layers", async () => {
      const logger: Logger = { log: (msg) => `Logged: ${msg}` }
      const config: Config = { host: "localhost", port: 8080 }

      const LoggerLive = Layer.succeed(Logger, logger)
      const ConfigLive = Layer.succeed(Config, config)
      const FullLayer = LoggerLive.merge(ConfigLive)

      const program = IO.Do.bind("logger", () => IO.service(Logger))
        .bind("config", () => IO.service(Config))
        .map(({ logger: log, config: cfg }) => log.log(`${cfg.host}:${cfg.port}`))

      const result = await program.provideLayer(FullLayer).run()
      expect(result).toBe("Logged: localhost:8080")
    })
  })

  describe("sync execution with services", () => {
    it("should work with runSync when services provided", () => {
      const logger: Logger = { log: (msg) => `Logged: ${msg}` }

      const program = IO.service(Logger).flatMap((svc) => IO.sync(() => svc.log("Sync")))

      const result = program.provideService(Logger, logger).runSync()
      expect(result).toBe("Logged: Sync")
    })
  })

  // ============================================
  // IO Constructor Auto-Detection
  // ============================================

  describe("IO constructor auto-detection", () => {
    it("should handle sync functions", async () => {
      const io = IO(() => 42)
      const result = await io.run()
      expect(result).toBe(42)
    })

    it("should auto-detect Promise and handle async", async () => {
      const io = IO(() => Promise.resolve(42))
      const result = await io.run()
      expect(result).toBe(42)
    })

    it("should be lazy - function not called until run", async () => {
      let called = false
      const io = IO(() => {
        called = true
        return 42
      })
      expect(called).toBe(false)
      await io.run()
      expect(called).toBe(true)
    })

    it("should work with runSync for sync functions", () => {
      const io = IO(() => 42)
      const result = io.runSync()
      expect(result).toBe(42)
    })

    it("should throw on runSync for async functions", () => {
      const io = IO(() => Promise.resolve(42))
      expect(() => io.runSync()).toThrow("Cannot run async effect synchronously")
    })

    it("should chain sync and async transparently", async () => {
      const io = IO(() => 10)
        .flatMap((x) => IO(() => Promise.resolve(x * 2)))
        .map((x) => x + 1)
      const result = await io.run()
      expect(result).toBe(21)
    })
  })

  // ============================================
  // IO.withServices
  // ============================================

  describe("IO.withServices", () => {
    it("should provide multiple services to a function", async () => {
      const logger: Logger = { log: (msg) => `Logged: ${msg}` }
      const config: Config = { host: "localhost", port: 8080 }

      const program = IO.withServices({ logger: Logger, config: Config }, ({ logger: log, config: cfg }) =>
        log.log(`${cfg.host}:${cfg.port}`),
      )

      const result = await program.provideService(Logger, logger).provideService(Config, config).run()
      expect(result).toBe("Logged: localhost:8080")
    })

    it("should work with async functions", async () => {
      const logger: Logger = { log: (msg) => `Logged: ${msg}` }

      const program = IO.withServices({ logger: Logger }, async ({ logger: log }) => {
        await Promise.resolve() // simulate async
        return log.log("async")
      })

      const result = await program.provideService(Logger, logger).run()
      expect(result).toBe("Logged: async")
    })

    it("should work with empty services", async () => {
      const program = IO.withServices({}, () => 42)
      const result = await program.run()
      expect(result).toBe(42)
    })

    it("should work with single service", async () => {
      const logger: Logger = { log: (msg) => `Logged: ${msg}` }

      const program = IO.withServices({ logger: Logger }, ({ logger: log }) => log.log("single"))

      const result = await program.provideService(Logger, logger).run()
      expect(result).toBe("Logged: single")
    })
  })

  // ============================================
  // Structured Concurrency
  // ============================================

  describe("IO.interrupt", () => {
    it("should create an interrupted effect", async () => {
      const io = IO.interrupt()
      const exit = await io.runExit()
      expect(exit.isInterrupted()).toBe(true)
    })

    it("should throw InterruptedError on runSync", () => {
      const io = IO.interrupt()
      expect(() => io.runSync()).toThrow(InterruptedError)
    })
  })

  describe("IO.bracket", () => {
    it("should acquire, use, and release resource", async () => {
      const events: string[] = []

      const program = IO.bracket(
        IO.sync(() => {
          events.push("acquire")
          return "resource"
        }),
        (resource) =>
          IO.sync(() => {
            events.push(`use:${resource}`)
            return "result"
          }),
        (resource) =>
          IO.sync(() => {
            events.push(`release:${resource}`)
          }),
      )

      const result = await program.run()
      expect(result).toBe("result")
      expect(events).toEqual(["acquire", "use:resource", "release:resource"])
    })

    it("should release even when use fails", async () => {
      const events: string[] = []

      const program = IO.bracket(
        IO.sync(() => {
          events.push("acquire")
          return "resource"
        }),
        () => IO.fail(new Error("use failed")),
        (resource) =>
          IO.sync(() => {
            events.push(`release:${resource}`)
          }),
      )

      await expect(program.run()).rejects.toThrow("use failed")
      expect(events).toEqual(["acquire", "release:resource"])
    })

    it("should work synchronously", () => {
      const events: string[] = []

      const program = IO.bracket(
        IO.sync(() => {
          events.push("acquire")
          return "resource"
        }),
        (resource) =>
          IO.sync(() => {
            events.push(`use:${resource}`)
            return "result"
          }),
        (resource) =>
          IO.sync(() => {
            events.push(`release:${resource}`)
          }),
      )

      const result = program.runSync()
      expect(result).toBe("result")
      expect(events).toEqual(["acquire", "use:resource", "release:resource"])
    })
  })

  describe("IO.race", () => {
    it("should return first effect to complete", async () => {
      const result = await IO.race([IO.sleep(100).map(() => "slow"), IO.sleep(10).map(() => "fast")]).run()
      expect(result).toBe("fast")
    })

    it("should handle empty array", async () => {
      const exit = await IO.race([]).runExit()
      expect(exit.isFailure()).toBe(true)
    })

    it("should work with immediate values", async () => {
      const result = await IO.race([IO.succeed("first"), IO.succeed("second")]).run()
      expect(result).toBe("first")
    })
  })

  describe("IO.any", () => {
    it("should return first success", async () => {
      const result = await IO.any([IO.fail("error1"), IO.succeed("success"), IO.fail("error2")]).run()
      expect(result).toBe("success")
    })

    it("should fail if all fail", async () => {
      await expect(IO.any([IO.fail("error1"), IO.fail("error2")]).run()).rejects.toBe("error2")
    })

    it("should handle empty array", async () => {
      const exit = await IO.any([]).runExit()
      expect(exit.isFailure()).toBe(true)
    })
  })

  describe("IO.forEach", () => {
    it("should execute effect for each element", async () => {
      const result = await IO.forEach([1, 2, 3], (n) => IO.sync(() => n * 2)).run()
      expect(result).toEqual([2, 4, 6])
    })

    it("should handle empty array", async () => {
      const result = await IO.forEach([], (n: number) => IO.sync(() => n * 2)).run()
      expect(result).toEqual([])
    })

    it("should fail fast on error", async () => {
      const executed: number[] = []
      const program = IO.forEach([1, 2, 3], (n) =>
        IO.sync(() => {
          executed.push(n)
          if (n === 2) throw new Error("fail at 2")
          return n * 2
        }),
      )

      await expect(program.run()).rejects.toThrow("fail at 2")
      expect(executed).toEqual([1, 2])
    })
  })

  describe("timeout", () => {
    it("should complete before timeout", async () => {
      const result = await IO.succeed(42).timeout(1000).run()
      expect(result).toBe(42)
    })

    it("should fail with TimeoutError when exceeded", async () => {
      const program = IO.sleep(100)
        .map(() => "done")
        .timeout(10)
      const exit = await program.runExit()
      expect(exit.isFailure()).toBe(true)
      if (exit.isFailure()) {
        const error = (exit.toValue() as { error: TimeoutError }).error
        expect(error).toBeInstanceOf(TimeoutError)
        expect(error.duration).toBe(10)
      }
    })

    it("should work with timeoutTo for fallback", async () => {
      const result = await IO.sleep(100)
        .map(() => "done")
        .timeoutTo(10, "fallback")
        .run()
      expect(result).toBe("fallback")
    })

    it("should return original value with timeoutTo when not exceeded", async () => {
      const result = await IO.succeed("original").timeoutTo(1000, "fallback").run()
      expect(result).toBe("original")
    })
  })

  describe("IO.timeout static method", () => {
    it("should work as static method", async () => {
      const result = await IO.timeout(IO.succeed(42), 1000).run()
      expect(result).toBe(42)
    })
  })

  // ============================================
  // Phase 5: Interface Implementation Tests
  // ============================================

  describe("catchTag", () => {
    interface TaggedError {
      readonly _tag: string
      readonly message: string
    }
    const NetworkError = (msg: string): TaggedError => ({ _tag: "NetworkError", message: msg })
    const ValidationError = (msg: string): TaggedError => ({ _tag: "ValidationError", message: msg })

    it("should catch errors with matching tag", async () => {
      const io = IO.fail(NetworkError("connection failed")).catchTag("NetworkError", (e) =>
        IO.succeed(`Recovered from: ${e.message}`),
      )
      const result = await io.run()
      expect(result).toBe("Recovered from: connection failed")
    })

    it("should not catch errors with different tag", async () => {
      const io = IO.fail(ValidationError("invalid input")).catchTag("NetworkError", () => IO.succeed("recovered"))
      const exit = await io.runExit()
      expect(exit.isFailure()).toBe(true)
    })

    it("should let success pass through", async () => {
      const io = IO.succeed<TaggedError, number>(42).catchTag("NetworkError", () => IO.succeed(0))
      const result = await io.run()
      expect(result).toBe(42)
    })
  })

  describe("catchAll", () => {
    it("should catch all errors", async () => {
      const io = IO.fail<string, number>("error").catchAll((e) => IO.succeed(e.length))
      const result = await io.run()
      expect(result).toBe(5)
    })

    it("should let success pass through", async () => {
      const io = IO.succeed<string, number>(42).catchAll(() => IO.succeed(0))
      const result = await io.run()
      expect(result).toBe(42)
    })
  })

  describe("retry", () => {
    it("should retry on failure up to n times", async () => {
      let attempts = 0
      const io = IO.sync(() => {
        attempts++
        if (attempts < 3) {
          throw new Error("not yet")
        }
        return "success"
      }).retry(5)

      const result = await io.run()
      expect(result).toBe("success")
      expect(attempts).toBe(3)
    })

    it("should fail after exhausting retries", async () => {
      let attempts = 0
      const io = IO.sync(() => {
        attempts++
        throw new Error("always fails")
      }).retry(2)

      await expect(io.run()).rejects.toThrow("always fails")
      expect(attempts).toBe(3) // 1 initial + 2 retries
    })

    it("should not retry on success", async () => {
      let attempts = 0
      const io = IO.sync(() => {
        attempts++
        return "immediate success"
      }).retry(5)

      const result = await io.run()
      expect(result).toBe("immediate success")
      expect(attempts).toBe(1)
    })
  })

  describe("retryWithDelay", () => {
    it("should retry with delay between attempts", async () => {
      let attempts = 0
      const timestamps: number[] = []

      const io = IO.sync(() => {
        timestamps.push(Date.now())
        attempts++
        if (attempts < 3) {
          throw new Error("not yet")
        }
        return "success"
      }).retryWithDelay(5, 50)

      const result = await io.run()
      expect(result).toBe("success")
      expect(attempts).toBe(3)

      // Check that there was a delay between attempts
      if (timestamps.length >= 2 && timestamps[1] !== undefined && timestamps[0] !== undefined) {
        expect(timestamps[1] - timestamps[0]).toBeGreaterThanOrEqual(40)
      }
    })
  })

  describe("runOption", () => {
    it("should return Some for success", async () => {
      const option = await IO.succeed(42).runOption()
      expect(option.isSome()).toBe(true)
      expect(option.orElse(0)).toBe(42)
    })

    it("should return None for failure", async () => {
      const option = await IO.fail(new Error("oops")).runOption()
      expect(option.isNone()).toBe(true)
    })
  })

  describe("runTry", () => {
    it("should return Success for success", async () => {
      const t = await IO.succeed(42).runTry()
      expect(t.isSuccess()).toBe(true)
      expect(t.orElse(0)).toBe(42)
    })

    it("should return Failure for failure", async () => {
      const t = await IO.fail<Error, number>(new Error("oops")).runTry()
      expect(t.isFailure()).toBe(true)
    })
  })

  // ============================================
  // Functor Laws
  // ============================================

  describe("Functor Laws", () => {
    it("should satisfy identity law: fa.map(x => x) === fa", async () => {
      const io = IO.succeed(42)
      const mapped = io.map((x) => x)

      const original = await io.run()
      const result = await mapped.run()
      expect(result).toBe(original)
    })

    it("should satisfy composition law: fa.map(f).map(g) === fa.map(x => g(f(x)))", async () => {
      const io = IO.succeed(5)
      const f = (x: number) => x * 2
      const g = (x: number) => x + 1

      const left = await io.map(f).map(g).run()
      const right = await io.map((x) => g(f(x))).run()

      expect(left).toBe(right)
      expect(left).toBe(11) // (5 * 2) + 1 = 11
    })
  })

  // ============================================
  // Monad Laws
  // ============================================

  describe("Monad Laws", () => {
    const f = (x: number) => IO.succeed(x * 2)
    const g = (x: number) => IO.succeed(x + 1)

    it("should satisfy left identity: IO.succeed(a).flatMap(f) === f(a)", async () => {
      const a = 5
      const left = await IO.succeed(a).flatMap(f).run()
      const right = await f(a).run()
      expect(left).toBe(right)
      expect(left).toBe(10)
    })

    it("should satisfy right identity: m.flatMap(IO.succeed) === m", async () => {
      const m = IO.succeed(42)
      const left = await m.flatMap(IO.succeed).run()
      const right = await m.run()
      expect(left).toBe(right)
    })

    it("should satisfy associativity: m.flatMap(f).flatMap(g) === m.flatMap(x => f(x).flatMap(g))", async () => {
      const m = IO.succeed(5)

      const left = await m.flatMap(f).flatMap(g).run()
      const right = await m.flatMap((x) => f(x).flatMap(g)).run()

      expect(left).toBe(right)
      expect(left).toBe(11) // (5 * 2) + 1 = 11
    })
  })
})
