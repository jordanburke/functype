import { describe, expect, test, vi } from "vitest"

import { Task, Throwable } from "@/core"

describe("Task Robustness Tests", () => {
  describe("Task Async with nested errors", () => {
    test("should handle errors in nested async operations", async () => {
      const nestedError = new Error("Nested operation failed")

      try {
        await Task({ name: "OuterTask" }).Async(async () => {
          return Task({ name: "InnerTask" }).Async(async () => {
            throw nestedError
          })
        })
        expect.fail("Should throw error")
      } catch (error) {
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

      try {
        await Task({ name: "MainTask" }).Async(
          async () => {
            throw originalError
          },
          async () => {
            throw handlerError
          },
        )
        expect.fail("Should throw error")
      } catch (error) {
        // The error handler's error should take precedence
        expect((error as Error).message).toBe("Error handler failed")
        expect((error as unknown as Throwable).taskInfo?.name).toBe("MainTask")
      }
    })
  })

  describe("Task with complex finally scenarios", () => {
    test("should handle async errors in finally blocks", async () => {
      const finallyError = new Error("Async finally error")

      try {
        await Task({ name: "ComplexTask" }).Async(
          async () => "success",
          async (error: unknown) => error,
          async () => {
            await new Promise((resolve) => setTimeout(resolve, 10))
            throw finallyError
          },
        )
        expect.fail("Should throw error")
      } catch (error) {
        expect((error as Error).message).toBe("Async finally error")
        expect((error as unknown as Throwable).taskInfo?.name).toBe("ComplexTask")
      }
    })

    test("should handle promises that reject in finally", async () => {
      const finallyError = new Error("Finally promise rejected")

      try {
        await Task({ name: "PromiseTask" }).Async(
          async () => "success",
          async (error: unknown) => error,
          async () => Promise.reject(finallyError),
        )
        expect.fail("Should throw error")
      } catch (error) {
        expect((error as Error).message).toBe("Finally promise rejected")
        expect((error as unknown as Throwable).taskInfo?.name).toBe("PromiseTask")
      }
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

      try {
        await taskFn()
        expect.fail("Should throw error")
      } catch (error) {
        expect((error as Error).message).toBe("Synchronous throw in promise function")
        expect((error as unknown as Throwable).taskInfo?.name).toBe("SyncErrorTask")
      }
    })
  })

  describe("Task chaining", () => {
    test("should maintain task context when chaining operations", async () => {
      const initialTask = Task({ name: "Initial" })
      const result = await initialTask.Async(async () => {
        const secondResult = await Task({ name: "Second" }).Async(async () => {
          return "success"
        })
        return secondResult
      })

      expect(result).toBe("success")
    })

    test("should propagate errors correctly in nested chains", async () => {
      try {
        await Task({ name: "Outer" }).Async(async () => {
          return Task({ name: "Middle" }).Async(async () => {
            return Task({ name: "Inner" }).Async(async () => {
              throw new Error("Inner error")
            })
          })
        })
        expect.fail("Should throw error")
      } catch (error) {
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
      expect(result).toBe(null)
    })

    test("should handle undefined return values", async () => {
      const result = await Task().Async(async () => undefined)
      expect(result).toBe(undefined)
    })

    test("should handle null errors", async () => {
      try {
        await Task().Async(async () => {
          throw null
        })
        expect.fail("Should throw error")
      } catch (error) {
        expect(error).toBeTruthy() // Should convert null to a Throwable
        expect((error as unknown as Throwable)._tag).toBe("Throwable")
      }
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
})
