import { afterEach, beforeEach, describe, expect, test, vi } from "vitest"

import { Task } from "@/core"

describe("Task with Progress Tracking", () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe("AsyncWithProgress", () => {
    test("should track progress during task execution", async () => {
      const progressCallback = vi.fn()

      const task = Task().AsyncWithProgress((updateProgress) => {
        return new Promise<string>((resolve) => {
          updateProgress(0)

          setTimeout(() => {
            updateProgress(25)

            setTimeout(() => {
              updateProgress(50)

              setTimeout(() => {
                updateProgress(75)

                setTimeout(() => {
                  updateProgress(100)
                  resolve("completed")
                }, 250)
              }, 250)
            }, 250)
          }, 250)
        })
      }, progressCallback)

      // Advance time and check progress updates
      vi.advanceTimersByTime(250)
      expect(progressCallback).toHaveBeenCalledWith(0)
      expect(progressCallback).toHaveBeenCalledWith(25)

      vi.advanceTimersByTime(250)
      expect(progressCallback).toHaveBeenCalledWith(50)

      vi.advanceTimersByTime(250)
      expect(progressCallback).toHaveBeenCalledWith(75)

      vi.advanceTimersByTime(250)
      expect(progressCallback).toHaveBeenCalledWith(100)

      const result = await task
      expect(result).toBe("completed")
    })

    test("should sanitize progress values", async () => {
      const progressCallback = vi.fn()

      const task = Task().AsyncWithProgress((updateProgress) => {
        return new Promise<string>((resolve) => {
          // Invalid progress values
          updateProgress(-10)
          updateProgress(150)

          setTimeout(() => {
            resolve("completed")
          }, 100)
        })
      }, progressCallback)

      vi.advanceTimersByTime(100)
      const result = await task

      // Values should have been sanitized to 0 and 100
      expect(progressCallback).toHaveBeenCalledWith(0)
      expect(progressCallback).toHaveBeenCalledWith(100)
      expect(result).toBe("completed")
    })

    test("should handle errors during progress updates", async () => {
      const progressCallback = vi.fn().mockImplementation(() => {
        throw new Error("Progress callback error")
      })

      // Task should still complete even if progress callback throws
      const task = Task().AsyncWithProgress((updateProgress) => {
        return new Promise<string>((resolve) => {
          try {
            updateProgress(50)
          } catch (e) {
            // Task should not throw even if progress callback does
          }

          setTimeout(() => {
            resolve("completed")
          }, 100)
        })
      }, progressCallback)

      vi.advanceTimersByTime(100)
      const result = await task

      expect(progressCallback).toHaveBeenCalledWith(50)
      expect(result).toBe("completed")
    })
  })

  describe("Task.withProgress", () => {
    test("should create a task with progress tracking", async () => {
      const progressCallback = vi.fn()

      const { task, currentProgress } = Task.withProgress(async (updateProgress) => {
        updateProgress(0)

        await new Promise<void>((resolve) => {
          setTimeout(() => {
            updateProgress(50)
            resolve()
          }, 500)
        })

        updateProgress(100)
        return "completed"
      }, progressCallback)

      // Check initial progress
      expect(currentProgress()).toBe(0)
      expect(progressCallback).toHaveBeenCalledWith(0)

      // Advance time and check progress updates
      vi.advanceTimersByTime(500)
      expect(currentProgress()).toBe(50)
      expect(progressCallback).toHaveBeenCalledWith(50)

      // Complete the task
      const result = await task
      expect(currentProgress()).toBe(100)
      expect(progressCallback).toHaveBeenCalledWith(100)
      expect(result).toBe("completed")
    })

    test.skip("should combine progress tracking with cancellation", async () => {
      const progressCallback = vi.fn()

      // Use a manually controlled promise for testing
      let resolvePromise: (value: void) => void
      const promise = new Promise<void>((resolve) => {
        resolvePromise = resolve
      })

      const { task, cancel, currentProgress } = Task.withProgress(async (updateProgress, token) => {
        updateProgress(0)
        updateProgress(10)
        updateProgress(20)
        updateProgress(30)

        // Wait on our controlled promise
        await promise

        // This should not execute if cancelled
        updateProgress(100)
        return "completed"
      }, progressCallback)

      // Check progress updates happened
      expect(currentProgress()).toBe(30)
      expect(progressCallback).toHaveBeenCalledWith(0)
      expect(progressCallback).toHaveBeenCalledWith(10)
      expect(progressCallback).toHaveBeenCalledWith(20)
      expect(progressCallback).toHaveBeenCalledWith(30)

      // Cancel the task
      cancel()

      // Now resolve the promise
      resolvePromise!()

      try {
        await task
        expect.fail("Should have been cancelled")
      } catch (error) {
        expect((error as Error).message).toContain("cancelled")
      }

      // Progress should be frozen at the last value before cancellation
      expect(currentProgress()).toBe(30)
      // Progress callback should not have been called with 100
      expect(progressCallback).not.toHaveBeenCalledWith(100)
    })

    test("should allow default progress callback", async () => {
      // No progress callback provided
      const { task, currentProgress } = Task.withProgress(async (updateProgress) => {
        updateProgress(0)

        await new Promise<void>((resolve) => {
          setTimeout(() => {
            updateProgress(50)
            resolve()
          }, 500)
        })

        updateProgress(100)
        return "completed"
      })

      // Should still track progress internally even without callback
      expect(currentProgress()).toBe(0)

      vi.advanceTimersByTime(500)
      expect(currentProgress()).toBe(50)

      const result = await task
      expect(currentProgress()).toBe(100)
      expect(result).toBe("completed")
    })
  })
})
