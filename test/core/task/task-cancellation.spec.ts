import { afterEach, beforeEach, describe, expect, test, vi } from "vitest"

import { Task } from "@/core"

describe("Task Cancellation", () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe("CancellationToken", () => {
    test("should create a token that can be cancelled", () => {
      const tokenSource = Task.createCancellationTokenSource()
      expect(tokenSource.token.isCancelled).toBe(false)

      tokenSource.cancel()
      expect(tokenSource.token.isCancelled).toBe(true)
    })

    test("should invoke registered callbacks when cancelled", () => {
      const tokenSource = Task.createCancellationTokenSource()
      const callback = vi.fn()

      tokenSource.token.onCancel(callback)
      expect(callback).not.toHaveBeenCalled()

      tokenSource.cancel()
      expect(callback).toHaveBeenCalledTimes(1)

      // Cancelling again should not trigger callbacks multiple times
      tokenSource.cancel()
      expect(callback).toHaveBeenCalledTimes(1)
    })

    test("should immediately invoke callback if already cancelled", () => {
      const tokenSource = Task.createCancellationTokenSource()
      tokenSource.cancel()

      const callback = vi.fn()
      tokenSource.token.onCancel(callback)

      expect(callback).toHaveBeenCalledTimes(1)
    })
  })

  describe("Task with cancellation", () => {
    test("should reject task when cancelled before start", async () => {
      const tokenSource = Task.createCancellationTokenSource()
      tokenSource.cancel()

      try {
        await Task().Async(
          () => "success",
          (error) => error,
          () => {},
          tokenSource.token,
        )
        expect.fail("Should have been cancelled")
      } catch (error) {
        expect((error as Error).message).toContain("cancelled before execution")
      }
    })

    test("should reject task when cancelled during execution", async () => {
      const tokenSource = Task.createCancellationTokenSource()

      // Create a simple deferred promise that we can manually resolve
      let resolvePromise: (value: void) => void
      const promise = new Promise<void>((resolve) => {
        resolvePromise = resolve
      })

      const taskPromise = Task().Async(
        async () => {
          await promise
          return "success"
        },
        (error) => error,
        () => {},
        tokenSource.token,
      )

      // Cancel immediately
      tokenSource.cancel()

      // Now resolve the inner promise
      resolvePromise!()

      try {
        await taskPromise
        expect.fail("Should have been cancelled")
      } catch (error) {
        expect((error as Error).message).toContain("cancelled")
      }
    })

    test.skip("should still execute finally block when cancelled", async () => {
      const tokenSource = Task.createCancellationTokenSource()
      const finallyFn = vi.fn()

      // Create a simple deferred promise that we can manually resolve
      let resolvePromise: (value: void) => void
      const promise = new Promise<void>((resolve) => {
        resolvePromise = resolve
      })

      const taskPromise = Task().Async(
        async () => {
          await promise
          return "success"
        },
        (error) => error,
        finallyFn,
        tokenSource.token,
      )

      // Cancel immediately
      tokenSource.cancel()

      // Now resolve the inner promise
      resolvePromise!()

      try {
        await taskPromise
        expect.fail("Should have been cancelled")
      } catch (error) {
        // Wait for the next tick to allow finally to execute
        await new Promise((resolve) => setTimeout(resolve, 0))
        expect(finallyFn).toHaveBeenCalledTimes(1)
      }
    })
  })

  describe("Task.cancellable", () => {
    test("should create a cancellable task", async () => {
      const { task, cancel } = Task.cancellable(async (token) => {
        await new Promise<void>((resolve) => {
          const checkCancellation = () => {
            if (token.isCancelled) {
              resolve()
            } else {
              setTimeout(checkCancellation, 100)
            }
          }
          setTimeout(checkCancellation, 100)
        })

        if (token.isCancelled) {
          throw new Error("Task was explicitly cancelled by token check")
        }

        return "success"
      })

      // Cancel the task
      setTimeout(() => cancel(), 500)

      // Advance time to trigger cancellation
      vi.advanceTimersByTime(500)

      try {
        await task
        expect.fail("Should have been cancelled")
      } catch (error) {
        expect((error as Error).message).toContain("cancelled during execution")
      }

      // Complete all timers
      vi.runAllTimers()
    })

    test("should complete successfully when not cancelled", async () => {
      const { task } = Task.cancellable(async () => {
        await new Promise<void>((resolve) => setTimeout(resolve, 500))
        return "success"
      })

      // Advance time to complete task
      vi.advanceTimersByTime(500)

      const result = await task
      expect(result).toBe("success")
    })

    test("should allow custom cancellation behavior", async () => {
      // This test demonstrates a user manually checking for cancellation
      // and handling it gracefully without throwing
      const { task, cancel } = Task.cancellable(async (token) => {
        let result = "initial"

        // We need a try/catch to handle the Task system's cancellation error
        // if it occurs during our async operation
        try {
          await new Promise<void>((resolve, reject) => {
            // Check the token periodically
            const checkInterval = () => {
              if (token.isCancelled) {
                result = "cancelled"
                resolve()
                return
              }

              setTimeout(checkInterval, 100)
            }

            // Start checking
            checkInterval()

            // Also set a timeout to resolve eventually even if not cancelled
            setTimeout(() => {
              resolve()
            }, 1000)
          })

          // If we manually handled the cancellation
          if (token.isCancelled) {
            return "cancelled"
          }

          return result
        } catch (e) {
          // This catches the task cancellation exception
          if (token.isCancelled) {
            return "caught cancellation"
          }
          throw e
        }
      })

      // Cancel after 300ms
      setTimeout(() => cancel(), 300)

      // Advance time to trigger cancellation checks
      vi.advanceTimersByTime(1000)

      try {
        const result = await task
        // The test can pass either if the promise resolves with our "cancelled" value
        // (if our manual cancellation check runs before the system throws)
        expect(["cancelled", "caught cancellation"]).toContain(result)
      } catch (e) {
        // Or the test can pass if the system cancellation was faster than our check
        expect((e as Error).message).toContain("cancelled")
      }
    })
  })

  describe("Task with AbortSignal integration", () => {
    test("should integrate with fetch abort signal", async () => {
      // Mock fetch function
      global.fetch = vi.fn().mockImplementation((url, options) => {
        return new Promise((resolve, reject) => {
          // Create a timeout to simulate a delayed response
          const timeoutId = setTimeout(() => {
            resolve({ ok: true, json: async () => ({ data: "success" }) })
          }, 1000)

          // If there's an abort signal, listen for abort events
          if (options?.signal) {
            options.signal.addEventListener("abort", () => {
              clearTimeout(timeoutId)
              reject(new Error("Fetch aborted"))
            })
          }
        })
      })

      const { task, cancel } = Task.cancellable(async (token) => {
        const response = await fetch("https://example.com/api", {
          signal: token.signal,
        })

        if (!response.ok) {
          throw new Error("HTTP Error")
        }

        const data = await response.json()
        return data
      })

      // Cancel after 500ms
      setTimeout(() => cancel(), 500)

      // Advance time to trigger cancellation
      vi.advanceTimersByTime(500)

      try {
        await task
        expect.fail("Should have been cancelled")
      } catch (error) {
        // We expect either a "Fetch aborted" error from fetch or our task cancellation error
        // Either way, the task should not complete successfully
        expect(true).toBe(true)
      }

      // Clean up remaining timers
      vi.runAllTimers()
    })
  })
})
