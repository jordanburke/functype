import { describe, expect, test } from "vitest"

import { isLeft, isRight, Task, TaskException, TaskResult, Throwable } from "../../../src"

describe("AppException", () => {
  test("should create an AppException with error", () => {
    const error = new Error("Test error")
    const result = TaskException<string>(error)

    expect(isLeft(result)).toBe(true)
    expect(result._tag).toBe("TaskException")
    expect((result.value as Throwable)._tag).toBe("Throwable")
    expect((result.value as Error).message).toBe("Test error")
  })

  test("should create an AppException with error and additional data", () => {
    const error = new Error("Test error")
    const data = { additionalInfo: "extra data" }
    const result = TaskException<string>(error, {}, data)

    expect(isLeft(result)).toBe(true)
    expect(result._tag).toBe("TaskException")
    expect(result.value instanceof Throwable).toBe(true)
    expect((result.value as unknown as Throwable).data).toEqual(data)
  })
})

describe("TaskResult", () => {
  test("should create a successful TaskResult", () => {
    const data = "test data"
    const result = TaskResult(data)
    expect(isRight(result)).toBe(true)
    expect(result._tag).toBe("TaskResult")
    expect(result.value).toBe(data)
  })

  test("should work with different data types", () => {
    const numberResult = TaskResult(42)
    const objectResult = TaskResult({ key: "value" })
    const arrayResult = TaskResult([1, 2, 3])

    expect(isRight(numberResult)).toBe(true)
    expect(numberResult.value).toBe(42)
    expect(isRight(objectResult)).toBe(true)
    expect(objectResult.value).toEqual({ key: "value" })
    expect(isRight(arrayResult)).toBe(true)
    expect(arrayResult.value).toEqual([1, 2, 3])
  })
})

describe("Sync", () => {
  test("should handle successful operations", () => {
    const result = Task().Sync(() => "success")

    expect(isRight(result)).toBe(true)
    expect(result.value).toBe("success")
  })

  test("should handle errors", () => {
    const error = new Error("Sync failed")
    const result = Task().Sync(() => {
      throw error
    })

    expect(isLeft(result)).toBe(true)
    expect(result.value._tag).toBe("Throwable")
    expect((result.value as Error).message).toBe("Sync failed")
  })

  test("should use custom error handler", () => {
    const error = new Error("Original error")
    const customError = "Custom error message"
    const result = Task().Sync(
      () => {
        throw error
      },
      () => customError,
    )

    expect(isLeft(result)).toBe(true)
    expect(result.value.message).toBe(customError)
  })

  test("Sync.success should create successful result", () => {
    const result = Task().success("data")

    expect(isRight(result)).toBe(true)
    expect(result.value).toBe("data")
  })

  test("Sync.fail should create failure result", () => {
    const error = new Error("Failed")
    const result = Task().fail(error)

    expect(isLeft(result)).toBe(true)
    expect((result.value as Throwable)._tag).toBe("Throwable")
    expect((result.value as Error).message).toBe("Failed")
  })
})

describe("Async", () => {
  test("should handle successful async operations", async () => {
    const result = await Task().Async(async () => "success")

    expect(result).toBe("success")
  })

  test("should handle async errors", async () => {
    const error = new Error("Async Sync failed")
    try {
      await Task().Async(async () => {
        throw error
      })
    } catch (error) {
      expect((error as unknown as Throwable).message).toBe("Async Sync failed")
    }
  })

  test("should use custom async error handler", async () => {
    const error = new Error("Original error")
    const customError = "Custom async error message"
    try {
      await Task().Async(
        async () => {
          throw error
        },
        async () => customError,
      )
    } catch (error) {
      expect((error as unknown as Throwable).message).toBe(customError)
    }
  })

  test("Async.success should create successful result", () => {
    const result = Task().success("data")

    expect(isRight(result)).toBe(true)
    expect(result.value).toBe("data")
  })

  test("Async.fail should create failure result", () => {
    const error = new Error("Failed")
    const result = Task().fail(error)

    expect(isLeft(result)).toBe(true)
    expect((result.value as unknown as Throwable)._tag).toBe("Throwable")
    expect((result.value as Error).message).toBe("Failed")
  })

  test("should handle promises", async () => {
    const successPromise = Promise.resolve("success")
    const result = await Task().Async(async () => successPromise)

    expect(result).toBe("success")
  })
})

describe("Sync with finally", () => {
  test("should execute finally block on success", async () => {
    let finallyExecuted = false
    try {
      const result = await Task().Sync(
        () => "success",
        (error) => error,
        () => {
          finallyExecuted = true
        },
      )
      expect(result).toBe("success")
      expect(finallyExecuted).toBe(true)
    } catch (error) {
      expect.fail("Should not throw error")
    }
  })

  test("should execute finally block on error", async () => {
    let finallyExecuted = false
    const error = new Error("Sync failed")

    try {
      await Task().Sync(
        () => {
          throw error
        },
        (error) => error,
        () => {
          finallyExecuted = true
        },
      )
      expect.fail("Should throw error")
    } catch (error) {
      expect((error as Throwable)._tag).toBe("Throwable")
      expect((error as Error).message).toBe("Sync failed")
      expect(finallyExecuted).toBe(true)
    }
  })

  test("should execute finally block even if error handler throws", async () => {
    let finallyExecuted = false
    const error = new Error("Sync failed")

    try {
      await Task().Sync(
        () => {
          throw error
        },
        () => {
          throw new Error("Error handler failed")
        },
        () => {
          finallyExecuted = true
        },
      )
      expect.fail("Should throw error")
    } catch (error) {
      expect((error as Error).message).toBe("Error handler failed")
      expect(finallyExecuted).toBe(true)
    }
  })

  test("should throw error when finally throws", async () => {
    try {
      await Task().Sync(
        () => "success",
        (error) => error,
        () => {
          throw new Error("Finally failed")
        },
      )
      expect.fail("Should throw error from finally block")
    } catch (error) {
      expect((error as Error).message).toBe("Finally failed")
    }
  })

  test("should throw finally error even when operation fails", async () => {
    try {
      await Task().Sync(
        () => {
          throw new Error("Operation failed")
        },
        (error) => error,
        () => {
          throw new Error("Finally failed")
        },
      )
      expect.fail("Should throw error from finally block")
    } catch (error) {
      expect((error as Error).message).toBe("Finally failed")
    }
  })
})

describe("Async with finally", () => {
  test("should execute finally block on success", async () => {
    let finallyExecuted = false
    try {
      const result = await Task().Async(
        async () => "success",
        async (error) => error,
        () => {
          finallyExecuted = true
        },
      )
      expect(result).toBe("success")
      expect(finallyExecuted).toBe(true)
    } catch (error) {
      expect.fail("Should not throw error")
    }
  })

  test("should execute finally block on error", async () => {
    let finallyExecuted = false
    const error = new Error("Async failed")

    try {
      await Task().Async(
        async () => {
          throw error
        },
        async (error) => error,
        () => {
          finallyExecuted = true
        },
      )
      expect.fail("Should throw error")
    } catch (error) {
      expect((error as Throwable)._tag).toBe("Throwable")
      expect((error as Error).message).toBe("Async failed")
      expect(finallyExecuted).toBe(true)
    }
  })

  test("should execute finally block even if error handler throws", async () => {
    let finallyExecuted = false
    const error = new Error("Async failed")

    try {
      await Task().Async(
        async () => {
          throw error
        },
        async () => {
          throw new Error("Error handler failed")
        },
        () => {
          finallyExecuted = true
        },
      )
      expect.fail("Should throw error")
    } catch (error) {
      expect((error as Error).message).toBe("Error handler failed")
      expect(finallyExecuted).toBe(true)
    }
  })

  test("should execute finally block with async operations", async () => {
    let finallyExecuted = false
    try {
      const result = await Task().Async(
        async () => "success",
        async (error) => error,
        async () => {
          await new Promise((resolve) => setTimeout(resolve, 100))
          finallyExecuted = true
        },
      )
      expect(result).toBe("success")
      expect(finallyExecuted).toBe(true)
    } catch (error) {
      console.log(error)
      expect.fail("Should not throw error")
    }
  })

  test("should throw error when finally throws", async () => {
    try {
      await Task().Async(
        async () => "success",
        async (error) => error,
        () => {
          throw new Error("Finally failed")
        },
      )
      expect.fail("Should throw error from finally block")
    } catch (error) {
      expect((error as Error).message).toBe("Finally failed")
    }
  })

  test("should throw finally error even when operation fails", async () => {
    try {
      await Task().Async(
        async () => {
          throw new Error("Operation failed")
        },
        async (error) => error,
        () => {
          throw new Error("Finally failed")
        },
      )
      expect.fail("Should throw error from finally block")
    } catch (error) {
      expect((error as Error).message).toBe("Finally failed")
    }
  })
})
