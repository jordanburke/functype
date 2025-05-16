import { afterEach, beforeEach, describe, expect, test, vi } from "vitest"

import { Task } from "@/core"
import { FPromise } from "@/fpromise/FPromise"

describe("Task Extensions", () => {
  describe("Task.race", () => {
    beforeEach(() => {
      vi.useFakeTimers()
    })

    afterEach(() => {
      vi.useRealTimers()
    })

    test("should resolve with the first task to complete", async () => {
      // Create task functions
      const slowTaskFn = () =>
        Task().Async(async () => {
          await new Promise((resolve) => setTimeout(resolve, 100))
          return "slow"
        })

      const fastTaskFn = () =>
        Task().Async(async () => {
          await new Promise((resolve) => setTimeout(resolve, 50))
          return "fast"
        })

      // Execute task functions to get FPromises with consistent types
      const tasks: FPromise<string>[] = [slowTaskFn(), fastTaskFn()]
      const racedTask = Task.race(tasks)

      // Fast-forward time to complete the fast task
      vi.advanceTimersByTime(50)

      const result = await racedTask
      expect(result).toBe("fast")

      // Complete all pending tasks
      vi.runAllTimers()
    })

    test("should reject if all tasks fail", async () => {
      const task1 = Task().Async(async () => {
        await new Promise((resolve) => setTimeout(resolve, 50))
        throw new Error("Task 1 failed")
      })

      const task2 = Task().Async(async () => {
        await new Promise((resolve) => setTimeout(resolve, 100))
        throw new Error("Task 2 failed")
      })

      const racedTask = Task.race([task1, task2])

      // Fast-forward time to complete the first failing task
      vi.advanceTimersByTime(50)

      try {
        await racedTask
        expect.fail("Should throw an error")
      } catch (error) {
        expect((error as Error).message).toBe("Task 1 failed")
      }

      // Complete all pending tasks
      vi.runAllTimers()
    })

    test("should include task name in errors", async () => {
      const task1 = Task().Async(async () => {
        await new Promise((resolve) => setTimeout(resolve, 50))
        throw new Error("Task 1 failed")
      })

      const racedTask = Task.race([task1], undefined, { name: "CustomRaceTask" })

      // Fast-forward time to complete the failing task
      vi.advanceTimersByTime(50)

      try {
        await racedTask
        expect.fail("Should throw an error")
      } catch (error) {
        expect((error as Error).name).toBe("CustomRaceTask")
      }

      // Complete all pending tasks
      vi.runAllTimers()
    })

    test("should timeout if specified", async () => {
      const slowTask = Task().Async(async () => {
        await new Promise((resolve) => setTimeout(resolve, 200))
        return "slow"
      })

      const racedTask = Task.race([slowTask], 100, { name: "TimeoutRaceTask" })

      // Fast-forward time to timeout
      vi.advanceTimersByTime(100)

      try {
        await racedTask
        expect.fail("Should throw a timeout error")
      } catch (error) {
        expect((error as Error).message).toContain("timed out after 100ms")
        expect((error as Error).name).toBe("TimeoutRaceTask")
      }

      // Complete all pending tasks
      vi.runAllTimers()
    })

    test("should resolve with result even if other tasks would throw later", async () => {
      // Create task functions, not executing them yet
      const successTaskFn = () =>
        Task().Async(async () => {
          await new Promise((resolve) => setTimeout(resolve, 50))
          return "success"
        })

      const failTaskFn = () =>
        Task().Async(async () => {
          await new Promise((resolve) => setTimeout(resolve, 100))
          throw new Error("Task failed but should not affect result")
        })

      // Execute task functions to get FPromises with consistent types
      // Cast failTaskFn() to FPromise<string> since runtime behavior takes care of errors
      const tasks: FPromise<string>[] = [successTaskFn(), failTaskFn() as unknown as FPromise<string>]
      const racedTask = Task.race(tasks)

      // Fast-forward time to complete the successful task
      vi.advanceTimersByTime(50)

      const result = await racedTask
      expect(result).toBe("success")

      // Complete all pending tasks
      vi.runAllTimers()
    })
  })

  describe("Task.fromNodeCallback", () => {
    test("should convert a node-style callback to a Task", async () => {
      // Simulate a Node.js callback-style function
      const nodeReadFile = (path: string, callback: (error: Error | null, data: string) => void) => {
        if (path === "valid-path") {
          callback(null, "file contents")
        } else {
          callback(new Error("File not found"), "")
        }
      }

      const readFileTask = Task.fromNodeCallback<string, [string]>(nodeReadFile)

      // Test success case
      const successResult = await readFileTask("valid-path")
      expect(successResult).toBe("file contents")

      // Test error case
      try {
        await readFileTask("invalid-path")
        expect.fail("Should throw an error")
      } catch (error) {
        expect((error as Error).message).toBe("File not found")
      }
    })

    test("should handle synchronous errors in the node function", async () => {
      // Simulate a Node.js callback-style function that throws synchronously
      const nodeFunctionWithSyncError = (_: string, callback: (error: Error | null, data: string) => void) => {
        throw new Error("Synchronous error")
        // eslint-disable-next-line no-unreachable
        callback(null, "never reached")
      }

      const taskFn = Task.fromNodeCallback<string, [string]>(nodeFunctionWithSyncError, { name: "SyncErrorNodeTask" })

      try {
        await taskFn("test")
        expect.fail("Should throw an error")
      } catch (error) {
        expect((error as Error).message).toBe("Synchronous error")
        expect((error as Error).name).toBe("SyncErrorNodeTask")
      }
    })

    test("should include task name in errors", async () => {
      const nodeFunction = (_: string, callback: (error: Error | null, data: string) => void) => {
        callback(new Error("Node error"), "")
      }

      const taskFn = Task.fromNodeCallback<string, [string]>(nodeFunction, { name: "CustomNodeTask" })

      try {
        await taskFn("test")
        expect.fail("Should throw an error")
      } catch (error) {
        expect((error as Error).message).toBe("Node error")
        expect((error as Error).name).toBe("CustomNodeTask")
      }
    })

    test("should pass through multiple arguments", async () => {
      // Simulate a Node.js callback-style function with multiple arguments
      const nodeMultiArgFunction = (
        arg1: string,
        arg2: number,
        arg3: boolean,
        callback: (error: Error | null, result: string) => void,
      ) => {
        const result = `${arg1}-${arg2}-${arg3}`
        callback(null, result)
      }

      const taskFn = Task.fromNodeCallback<string, [string, number, boolean]>(nodeMultiArgFunction)

      const result = await taskFn("test", 42, true)
      expect(result).toBe("test-42-true")
    })
  })
})
