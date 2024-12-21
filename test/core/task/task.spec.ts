import { AppException, AppResult, AsyncTask, isLeft, isRight, Task, Throwable } from "../../../src"

describe("AppException", () => {
  test("should create an AppException with error", () => {
    const error = new Error("Test error")
    const result = AppException<string>(error)

    expect(isLeft(result)).toBe(true)
    expect(result._tag).toBe("AppException")
    expect((result.value as Throwable)._tag).toBe("Throwable")
    expect((result.value as Error).message).toBe("Test error")
  })

  test("should create an AppException with error and additional data", () => {
    const error = new Error("Test error")
    const data = { additionalInfo: "extra data" }
    const result = AppException<string>(error, data)

    expect(isLeft(result)).toBe(true)
    expect(result._tag).toBe("AppException")
    expect(result.value instanceof Error).toBe(false)
    expect((result.value as unknown as Throwable).data).toEqual(data)
  })
})

describe("AppResult", () => {
  test("should create a successful AppResult", () => {
    const data = "test data"
    const result = AppResult(data)
    expect(isRight(result)).toBe(true)
    expect(result._tag).toBe("AppResult")
    expect(result.value).toBe(data)
  })

  test("should work with different data types", () => {
    const numberResult = AppResult(42)
    const objectResult = AppResult({ key: "value" })
    const arrayResult = AppResult([1, 2, 3])

    expect(isRight(numberResult)).toBe(true)
    expect(numberResult.value).toBe(42)
    expect(isRight(objectResult)).toBe(true)
    expect(objectResult.value).toEqual({ key: "value" })
    expect(isRight(arrayResult)).toBe(true)
    expect(arrayResult.value).toEqual([1, 2, 3])
  })
})

describe("Task", () => {
  test("should handle successful operations", () => {
    const result = Task(() => "success")

    expect(isRight(result)).toBe(true)
    expect(result.value).toBe("success")
  })

  test("should handle errors", () => {
    const error = new Error("Task failed")
    const result = Task(() => {
      throw error
    })

    expect(isLeft(result)).toBe(true)
    expect(result.value._tag).toBe("Throwable")
    expect((result.value as Error).message).toBe("Task failed")
  })

  test("should use custom error handler", () => {
    const error = new Error("Original error")
    const customError = "Custom error message"
    const result = Task(
      () => {
        throw error
      },
      () => customError,
    )

    expect(isLeft(result)).toBe(true)
    expect(result.value.message).toBe(customError)
  })

  test("Task.success should create successful result", () => {
    const result = Task.success("data")

    expect(isRight(result)).toBe(true)
    expect(result.value).toBe("data")
  })

  test("Task.fail should create failure result", () => {
    const error = new Error("Failed")
    const result = Task.fail(error)

    expect(isLeft(result)).toBe(true)
    expect((result.value as Throwable)._tag).toBe("Throwable")
    expect((result.value as Error).message).toBe("Failed")
  })
})

describe("AsyncTask", () => {
  test("should handle successful async operations", async () => {
    const result = await AsyncTask(async () => "success")

    expect(result).toBe("success")
  })

  test("should handle async errors", async () => {
    const error = new Error("Async task failed")
    try {
      await AsyncTask(async () => {
        throw error
      })
    } catch (error) {
      expect((error as unknown as Throwable).message).toBe("Async task failed")
    }
  })

  test("should use custom async error handler", async () => {
    const error = new Error("Original error")
    const customError = "Custom async error message"
    try {
      await AsyncTask(
        async () => {
          throw error
        },
        async () => customError,
      )
    } catch (error) {
      expect((error as unknown as Throwable).message).toBe(customError)
    }
  })

  test("AsyncTask.success should create successful result", () => {
    const result = AsyncTask.success("data")

    expect(isRight(result)).toBe(true)
    expect(result.value).toBe("data")
  })

  test("AsyncTask.fail should create failure result", () => {
    const error = new Error("Failed")
    const result = AsyncTask.fail(error)

    expect(isLeft(result)).toBe(true)
    expect((result.value as unknown as Throwable)._tag).toBe("Throwable")
    expect((result.value as Error).message).toBe("Failed")
  })

  test("should handle promises", async () => {
    const successPromise = Promise.resolve("success")
    const result = await AsyncTask(async () => successPromise)

    expect(result).toBe("success")
  })
})

describe("Task with finally", () => {
  test("should execute finally block on success", async () => {
    let finallyExecuted = false
    try {
      const result = await Task(
        () => "success",
        (error) => error,
        () => {
          finallyExecuted = true
        },
      )
      expect(result).toBe("success")
      expect(finallyExecuted).toBe(true)
    } catch (error) {
      fail("Should not throw error")
    }
  })

  test("should execute finally block on error", async () => {
    let finallyExecuted = false
    const error = new Error("Task failed")

    try {
      await Task(
        () => {
          throw error
        },
        (error) => error,
        () => {
          finallyExecuted = true
        },
      )
      fail("Should throw error")
    } catch (error) {
      expect((error as Throwable)._tag).toBe("Throwable")
      expect((error as Error).message).toBe("Task failed")
      expect(finallyExecuted).toBe(true)
    }
  })

  test("should execute finally block even if error handler throws", async () => {
    let finallyExecuted = false
    const error = new Error("Task failed")

    try {
      await Task(
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
      fail("Should throw error")
    } catch (error) {
      expect((error as Error).message).toBe("Error handler failed")
      expect(finallyExecuted).toBe(true)
    }
  })

  test("should throw error when finally throws", async () => {
    try {
      await Task(
        () => "success",
        (error) => error,
        () => {
          throw new Error("Finally failed")
        },
      )
      fail("Should throw error from finally block")
    } catch (error) {
      expect((error as Error).message).toBe("Finally failed")
    }
  })

  test("should throw finally error even when operation fails", async () => {
    try {
      await Task(
        () => {
          throw new Error("Operation failed")
        },
        (error) => error,
        () => {
          throw new Error("Finally failed")
        },
      )
      fail("Should throw error from finally block")
    } catch (error) {
      expect((error as Error).message).toBe("Finally failed")
    }
  })
})

describe("AsyncTask with finally", () => {
  test("should execute finally block on success", async () => {
    let finallyExecuted = false
    try {
      const result = await AsyncTask(
        async () => "success",
        async (error) => error,
        () => {
          finallyExecuted = true
        },
      )
      expect(result).toBe("success")
      expect(finallyExecuted).toBe(true)
    } catch (error) {
      fail("Should not throw error")
    }
  })

  test("should execute finally block on error", async () => {
    let finallyExecuted = false
    const error = new Error("AsyncTask failed")

    try {
      await AsyncTask(
        async () => {
          throw error
        },
        async (error) => error,
        () => {
          finallyExecuted = true
        },
      )
      fail("Should throw error")
    } catch (error) {
      expect((error as Throwable)._tag).toBe("Throwable")
      expect((error as Error).message).toBe("AsyncTask failed")
      expect(finallyExecuted).toBe(true)
    }
  })

  test("should execute finally block even if error handler throws", async () => {
    let finallyExecuted = false
    const error = new Error("AsyncTask failed")

    try {
      await AsyncTask(
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
      fail("Should throw error")
    } catch (error) {
      expect((error as Error).message).toBe("Error handler failed")
      expect(finallyExecuted).toBe(true)
    }
  })

  test("should execute finally block with async operations", async () => {
    let finallyExecuted = false
    try {
      const result = await AsyncTask(
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
      fail("Should not throw error")
    }
  })

  test("should throw error when finally throws", async () => {
    try {
      await AsyncTask(
        async () => "success",
        async (error) => error,
        () => {
          throw new Error("Finally failed")
        },
      )
      fail("Should throw error from finally block")
    } catch (error) {
      expect((error as Error).message).toBe("Finally failed")
    }
  })

  test("should throw finally error even when operation fails", async () => {
    try {
      await AsyncTask(
        async () => {
          throw new Error("Operation failed")
        },
        async (error) => error,
        () => {
          throw new Error("Finally failed")
        },
      )
      fail("Should throw error from finally block")
    } catch (error) {
      expect((error as Error).message).toBe("Finally failed")
    }
  })
})
