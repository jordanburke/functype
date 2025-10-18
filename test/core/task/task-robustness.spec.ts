import { describe, expect, test, vi } from "vitest"

import { Task, Throwable } from "@/core"

describe("Task Robustness Tests", () => {
  describe("Task Async with nested errors", () => {
    test("should handle errors in nested async operations", async () => {
      const nestedError = new Error("Nested operation failed")

      const outerResult = await Task({ name: "OuterTask" }).Async(async () => {
        const innerResult = await Task({ name: "InnerTask" }).Async(async () => {
          throw nestedError
        })
        if (innerResult.isFailure()) {
          throw innerResult.error
        }
        return innerResult.orThrow()
      })

      expect(outerResult.isFailure()).toBe(true)
      const error = outerResult.error
      {
        // With enhanced error chaining, the error messages are combined
        expect((error as Error).message).toBe("OuterTask: Nested operation failed")

        // The original error context is preserved in the cause
        expect((error as any).cause).toBeDefined()
        expect((error as any).cause.message).toBe("Nested operation failed")

        // Each level maintains its own task context
        expect((error as unknown as Throwable).taskInfo?.name).toBe("OuterTask")
        expect((error as any).cause.taskInfo?.name).toBe("InnerTask")

        // We can get the full error chain
        const errorChain = Task.getErrorChain(error as Error)
        expect(errorChain.length).toBe(2)
      }
    })

    test("should properly handle errors in error handlers", async () => {
      const originalError = new Error("Original error")
      const handlerError = new Error("Error handler failed")

      const result = await Task({ name: "MainTask" }).Async(
        async () => {
          throw originalError
        },
        async () => {
          throw handlerError
        },
      )

      expect(result.isFailure()).toBe(true)
      // The error handler's error should take precedence
      expect((result.error as Error).message).toBe("Error handler failed")
      expect((result.error as unknown as Throwable).taskInfo?.name).toBe("MainTask")
    })
  })

  describe("Task with complex finally scenarios", () => {
    test("should handle async errors in finally blocks", async () => {
      const finallyError = new Error("Async finally error")

      const result = await Task({ name: "ComplexTask" }).Async(
        async () => "success",
        async (error: unknown) => error,
        async () => {
          await new Promise((resolve) => setTimeout(resolve, 10))
          throw finallyError
        },
      )

      expect(result.isFailure()).toBe(true)
      const error = result.error
      {
        expect((error as Error).message).toBe("Async finally error")
        expect((error as unknown as Throwable).taskInfo?.name).toBe("ComplexTask")
      }
    })

    test("should handle promises that reject in finally", async () => {
      const finallyError = new Error("Finally promise rejected")

      const result = await Task({ name: "PromiseTask" }).Async(
        async () => "success",
        async (error: unknown) => error,
        async () => Promise.reject(finallyError),
      )

      expect(result.isFailure()).toBe(true)
      expect((result.error as Error).message).toBe("Finally promise rejected")
      expect((result.error as unknown as Throwable).taskInfo?.name).toBe("PromiseTask")
    })
  })

  describe("Task promise adapter edge cases", () => {
    test("should handle promise functions that throw synchronously", async () => {
      const syncError = new Error("Synchronous throw in promise function")
      const throwingFn = () => {
        throw syncError
        // eslint-disable-next-line no-unreachable
        return Promise.resolve("never reached")
      }

      const taskFn = Task.fromPromise(throwingFn, { name: "SyncErrorTask" })

      const result = await taskFn()
      expect(result.isFailure()).toBe(true)
      expect((result.error as Error).message).toBe("Synchronous throw in promise function")
      expect((result.error as unknown as Throwable).taskInfo?.name).toBe("SyncErrorTask")
    })
  })

  describe("Task chaining", () => {
    test("should maintain task context when chaining operations", async () => {
      const initialTask = Task({ name: "Initial" })
      const result = await initialTask.Async(async () => {
        const secondResult = await Task({ name: "Second" }).Async(async () => {
          return "success"
        })
        if (secondResult.isSuccess()) {
          return secondResult.value
        }
        throw secondResult.error
      })

      expect(result.isSuccess()).toBe(true)
      expect(result.value).toBe("success")
    })

    test("should propagate errors correctly in nested chains", async () => {
      const outerResult = await Task({ name: "Outer" }).Async(async () => {
        const middleResult = await Task({ name: "Middle" }).Async(async () => {
          const innerResult = await Task({ name: "Inner" }).Async(async () => {
            throw new Error("Inner error")
          })
          if (innerResult.isFailure()) {
            throw innerResult.error
          }
          return innerResult.orThrow()
        })
        if (middleResult.isFailure()) {
          throw middleResult.error
        }
        return middleResult.orThrow()
      })

      expect(outerResult.isFailure()).toBe(true)
      const error = outerResult.error
      {
        // With enhanced error chaining, the error messages are combined
        expect((error as Error).message).toBe("Outer: Middle: Inner error")

        // The original error context is preserved in the cause chain
        expect((error as any).cause).toBeDefined()
        expect((error as any).cause.message).toBe("Middle: Inner error")
        expect((error as any).cause.cause).toBeDefined()
        expect((error as any).cause.cause.message).toBe("Inner error")

        // Each level maintains its own task context
        expect((error as unknown as Throwable).taskInfo?.name).toBe("Outer")
        expect((error as any).cause.taskInfo?.name).toBe("Middle")
        expect((error as any).cause.cause.taskInfo?.name).toBe("Inner")

        // We can get and format the full error chain
        const errorChain = Task.getErrorChain(error as Error)
        expect(errorChain.length).toBe(3)

        // Format the error chain to see the complete path
        const formattedError = Task.formatErrorChain(error as Error, { includeTasks: true })
        expect(formattedError).toContain("Outer")
        expect(formattedError).toContain("Middle")
        expect(formattedError).toContain("Inner")
      }
    })
  })

  describe("Task with nullish values", () => {
    test("should handle null return values", async () => {
      const result = await Task().Async(async () => null)
      expect(result.isSuccess()).toBe(true)
      expect(result.value).toBe(null)
    })

    test("should handle undefined return values", async () => {
      const result = await Task().Async(async () => undefined)
      expect(result.isSuccess()).toBe(true)
      expect(result.value).toBe(undefined)
    })

    test("should handle null errors", async () => {
      const result = await Task().Async(async () => {
        throw null
      })

      expect(result.isFailure()).toBe(true)
      expect(result.error).toBeTruthy() // Should convert null to a Throwable
      expect((result.error as unknown as Throwable)._tag).toBe("Throwable")
    })
  })

  describe("Task memory and resource handling", () => {
    test("should not leak resources when task fails", async () => {
      // Mock resource management
      const openResource = vi.fn()
      const closeResource = vi.fn()

      try {
        await Task().Async(
          async () => {
            openResource()
            throw new Error("Task failed")
          },
          async (error: unknown) => error,
          async () => {
            closeResource()
          },
        )
        expect.fail("Should throw error")
      } catch (error) {
        expect(openResource).toHaveBeenCalledTimes(1)
        expect(closeResource).toHaveBeenCalledTimes(1)
      }
    })
  })

  describe("Task error handler invocation", () => {
    test("should always call error handler even for TaggedThrowable errors", async () => {
      // Create a mock error handler
      const errorHandler = vi.fn().mockImplementation((error) => error)

      // Create a TaggedThrowable error
      const throwableError = Task.fail(new Error("Throwable error"), undefined, { name: "InnerTask" }).error

      const result = await Task({ name: "OuterTask" }).Async(
        async () => {
          // Directly throw a TaggedThrowable
          throw throwableError
        },
        errorHandler, // Use the mock error handler
      )

      expect(result.isFailure()).toBe(true)
      const error = result.error

      // Verify the error handler was called
      expect(errorHandler).toHaveBeenCalledTimes(1)

      // Verify it was called with the throwable error
      expect(errorHandler).toHaveBeenCalledWith(throwableError)

      // Verify error chain is preserved
      expect((error as unknown as Throwable).taskInfo?.name).toBe("OuterTask")
      expect((error as any).cause).toBeDefined()
      expect((error as any).cause.taskInfo?.name).toBe("InnerTask")
    })

    test("should always call error handler for errors from nested tasks", async () => {
      // Create a mock error handler
      const errorHandler = vi.fn().mockImplementation((error) => error)

      const result = await Task({ name: "OuterTask" }).Async(
        async () => {
          // Return a task that will fail
          const innerResult = await Task({ name: "InnerTask" }).Async(async () => {
            throw new Error("Inner task error")
          })
          if (innerResult.isFailure()) {
            throw innerResult.error
          }
          return innerResult.orThrow()
        },
        errorHandler, // Use the mock error handler
      )

      expect(result.isFailure()).toBe(true)
      const error = result.error

      // Verify the error handler was called
      expect(errorHandler).toHaveBeenCalledTimes(1)

      // Verify error chain is preserved
      expect((error as unknown as Throwable).taskInfo?.name).toBe("OuterTask")
      expect((error as any).cause).toBeDefined()
      expect((error as any).cause.taskInfo?.name).toBe("InnerTask")
    })
  })
})
