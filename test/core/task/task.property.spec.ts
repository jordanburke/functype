import * as fc from "fast-check"
import { describe, test } from "vitest"

import { isLeft, isRight, Task, Throwable } from "../../../src"

describe("Task Property Tests", () => {
  describe("Task.success", () => {
    // Property: Task.success should always create a Right value
    test("should always create a Right value for any input", () => {
      fc.assert(
        fc.property(fc.anything(), (value) => {
          const result = Task.success(value)
          return isRight(result) && result.value === value
        }),
      )
    })

    // Property: Task.success should preserve the input value
    test("should preserve the input value", () => {
      fc.assert(
        fc.property(fc.string(), (value) => {
          const result = Task.success(value)
          return result.value === value
        }),
      )
    })
  })

  describe("Task.fail", () => {
    // Property: Task.fail should always create a Left value
    test("should always create a Left value for any error", () => {
      fc.assert(
        fc.property(fc.string(), (errorMsg) => {
          const error = new Error(errorMsg)
          const result = Task.fail(error)
          return isLeft(result) && (result.value as Error).message === errorMsg
        }),
      )
    })

    // Property: Task.fail should preserve the error message
    test("should preserve the error message", () => {
      fc.assert(
        fc.property(fc.string(), (errorMsg) => {
          const error = new Error(errorMsg)
          const result = Task.fail(error)
          return (result.value as Error).message === errorMsg
        }),
      )
    })
  })

  describe("Task.Sync", () => {
    // Property: Task.Sync should return a Right for successful operations
    test("should return a Right for successful operations", () => {
      fc.assert(
        fc.property(fc.string(), (value) => {
          const result = Task().Sync(() => value)
          return isRight(result) && result.value === value
        }),
      )
    })

    // Property: Task.Sync should return a Left for failing operations
    test("should return a Left for failing operations", () => {
      fc.assert(
        fc.property(fc.string(), (errorMsg) => {
          const result = Task().Sync(() => {
            throw new Error(errorMsg)
          })
          return isLeft(result) && (result.value as Error).message === errorMsg
        }),
      )
    })

    // Property: Task.Sync should use the error handler for failures
    test("should use the error handler for failures", () => {
      fc.assert(
        fc.property(fc.string(), fc.string(), (originalMsg, transformedMsg) => {
          const result = Task().Sync(
            () => {
              throw new Error(originalMsg)
            },
            () => new Error(transformedMsg),
          )
          return isLeft(result) && (result.value as Error).message === transformedMsg
        }),
      )
    })
  })

  describe("Task.Async monadic laws", () => {
    // Property: Left identity - Task.Async should obey the first monadic law
    // f(a) = return a >>= f, where >>= is the bind operation (chain/flatMap)
    test("Left identity: Task.Async(f) should equal f directly", async () => {
      await fc.assert(
        fc.asyncProperty(fc.string(), async (value) => {
          // Create a function that returns a value
          const f = async () => value

          // Use Task.Async as the return/pure operation
          const taskResult = await Task().Async(f)
          const directResult = await f()

          return taskResult === directResult
        }),
      )
    })

    // Property: Right identity - Task.Async should obey the second monadic law
    // m >>= return = m, where >>= is the bind operation (chain/flatMap)
    test("Right identity: Async then success should equal the original task", async () => {
      await fc.assert(
        fc.asyncProperty(fc.string(), async (value) => {
          // Start with a successful task
          const m = Task().Async(async () => value)

          // Chain with the identity function (return/pure)
          const chainedResult = await m.then((v) => v)
          const directResult = await m

          return chainedResult === directResult
        }),
      )
    })

    // Property: Associativity - Task.Async should obey the third monadic law
    // (m >>= f) >>= g = m >>= (x -> f(x) >>= g), where >>= is the bind operation
    test("Associativity: Nesting chains should give the same result regardless of grouping", async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string(),
          fc.string().map((s) => (v: string) => `${v}-${s}`),
          fc.string().map((s) => (v: string) => `${v}+${s}`),
          async (value, fMapper, gMapper) => {
            const f = async (x: string) => fMapper(x)
            const g = async (x: string) => gMapper(x)

            // (m >>= f) >>= g
            const m = Task().Async(async () => value)
            const leftGrouping = await m.then((x) => f(x)).then((y) => g(y))

            // m >>= (x -> f(x) >>= g)
            const rightGrouping = await m.then(async (x) => {
              const fx = await f(x)
              return g(fx)
            })

            return leftGrouping === rightGrouping
          },
        ),
      )
    })
  })

  describe("Task error handling properties", () => {
    // Property: finally block should always execute for both success and failure cases
    test("finally block should always execute", () => {
      fc.assert(
        fc.property(
          fc.boolean(), // Whether the task should succeed or fail
          fc.string(), // Value or error message
          (shouldSucceed, valueOrError) => {
            let finallyExecuted = false

            try {
              Task().Sync(
                () => {
                  if (!shouldSucceed) {
                    throw new Error(valueOrError)
                  }
                  return valueOrError
                },
                (error) => error,
                () => {
                  finallyExecuted = true
                },
              )
            } catch (error) {
              // Ignore error
            }

            return finallyExecuted
          },
        ),
      )
    })

    // Property: Error handler should be able to transform any type of error
    test("error handler should be able to transform any error", () => {
      fc.assert(
        fc.property(
          fc.oneof(fc.string(), fc.nat(), fc.constant(null), fc.constant(undefined)),
          fc.string(),
          (errorValue, transformedMessage) => {
            const result = Task().Sync(
              () => {
                throw errorValue
              },
              () => new Error(transformedMessage),
            )

            return (
              isLeft(result) &&
              result.value instanceof Throwable &&
              (result.value as Error).message === transformedMessage
            )
          },
        ),
      )
    })

    // Property: Task name should be included in errors
    test("task name should be included in errors", () => {
      fc.assert(
        fc.property(
          fc.string(), // Task name
          fc.string(), // Error message
          (taskName, errorMessage) => {
            // Skip empty task names
            if (taskName.trim() === "") return true

            const result = Task({ name: taskName }).Sync(() => {
              throw new Error(errorMessage)
            })

            return (
              isLeft(result) &&
              (result.value as Throwable).taskInfo?.name === taskName &&
              (result.value as Error).name === taskName
            )
          },
        ),
      )
    })
  })
})
