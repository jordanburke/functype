import { AppException, AppResult, AsyncTask, isLeft, isRight, Task } from "../../../src"
import { Throwable } from "../../../src/core/error/Throwable"

describe("AppException", () => {
  test("should create an AppException with error", () => {
    const error = new Error("Test error")
    const result = AppException<string>(error)

    expect(isLeft(result)).toBe(true)
    expect(result._tag).toBe("Left")
    expect((result.value as Throwable)._tag).toBe("Throwable")
    expect((result.value as Error).message).toBe("Test error")
  })

  test("should create an AppException with error and additional data", () => {
    const error = new Error("Test error")
    const data = { additionalInfo: "extra data" }
    const result = AppException<string>(error, data)

    expect(isLeft(result)).toBe(true)
    expect(result._tag).toBe("Left")
    expect(result.value instanceof Error).toBe(false)
    expect((result.value as unknown as Throwable).data).toEqual(data)
  })
})

describe("AppResult", () => {
  test("should create a successful AppResult", () => {
    const data = "test data"
    const result = AppResult(data)

    expect(isRight(result)).toBe(true)
    expect(result._tag).toBe("Right")
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
