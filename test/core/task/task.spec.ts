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
    const result = TaskException<string>(error, data, {})

    expect(isLeft(result)).toBe(true)
    expect(result._tag).toBe("TaskException")
    expect(result.value instanceof Throwable).toBe(true)
    expect((result.value as unknown as Throwable).data).toEqual(data)
  })

  test("should include task name in the error", () => {
    const error = new Error("Test error")
    const taskName = "CustomTaskName"
    const result = TaskException<string>(error, undefined, { name: taskName })

    expect(isLeft(result)).toBe(true)
    // TaskException has _task property
    expect((result as any)._task.name).toBe(taskName)
    // The throwable should have the task name
    expect((result.value as unknown as Throwable).taskInfo?.name).toBe(taskName)
    // The Error's name should also be set to the task name
    expect((result.value as Error).name).toBe(taskName)
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

  test("should include task name in error when using named task", () => {
    const error = new Error("Sync failed")
    const taskName = "CustomTaskName"
    const result = Task({ name: taskName }).Sync(() => {
      throw error
    })

    expect(isLeft(result)).toBe(true)
    // TaskException has _task property
    expect((result as any)._task.name).toBe(taskName)
    expect((result.value as unknown as Throwable).taskInfo?.name).toBe(taskName)
    expect((result.value as Error).name).toBe(taskName)
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
    const result = Task.success("data")

    expect(isRight(result)).toBe(true)
    expect(result.value).toBe("data")
  })

  test("Sync.fail should create failure result", () => {
    const error = new Error("Failed")
    const result = Task.fail(error)

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

  test("should include task name in async error when using named task", async () => {
    const error = new Error("Async failed")
    const taskName = "AsyncTaskName"
    try {
      await Task({ name: taskName }).Async(async () => {
        throw error
      })
      expect.fail("Should throw error")
    } catch (error) {
      expect((error as unknown as Throwable).taskInfo?.name).toBe(taskName)
      expect((error as Error).name).toBe(taskName)
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
    const result = Task.success("data")

    expect(isRight(result)).toBe(true)
    expect(result.value).toBe("data")
  })

  test("Async.fail should create failure result", () => {
    const error = new Error("Failed")
    const result = Task.fail(error)

    expect(isLeft(result)).toBe(true)
    expect((result.value as unknown as Throwable)._tag).toBe("Throwable")
    expect((result.value as Error).message).toBe("Failed")
  })

  test("Task.fail should include task name in the error", () => {
    const error = new Error("Failed")
    const taskName = "CustomFailTaskName"
    const result = Task.fail(error, undefined, { name: taskName })

    expect(isLeft(result)).toBe(true)
    // TaskException has _task property
    expect((result as any)._task.name).toBe(taskName)
    expect((result.value as unknown as Throwable).taskInfo?.name).toBe(taskName)
    expect((result.value as Error).name).toBe(taskName)
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
        (error: unknown) => error,
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
        (error: unknown) => error,
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
        (error: unknown) => error,
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
        (error: unknown) => error,
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
        async (error: unknown) => error,
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
        async (error: unknown) => error,
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
        async (error: unknown) => {
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
        async (error: unknown) => error,
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
        async (error: unknown) => error,
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
        async (error: unknown) => error,
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

describe("Promise Adapter Methods", () => {
  test("should convert promise-returning function to Task", async () => {
    const promiseFn = (value: string): Promise<string> => Promise.resolve(value + " processed")

    const taskFn = Task.fromPromise(promiseFn)
    const result = await taskFn("test")

    expect(result).toEqual("test processed")
  })

  test("should handle errors in promise adapter", async () => {
    const error = new Error("promise error")
    const promiseFn = (): Promise<string> => Promise.reject(error)

    const taskFn = Task.fromPromise(promiseFn)

    try {
      await taskFn()
      expect.fail("Should throw error")
    } catch (e) {
      expect((e as Throwable)._tag).toBe("Throwable")
      expect((e as Error).message).toBe("promise error")
    }
  })

  test("should pass through arguments to the promise function", async () => {
    const promiseFn = (a: number, b: number): Promise<number> => Promise.resolve(a + b)

    const taskFn = Task.fromPromise(promiseFn)
    const result = await taskFn(40, 2)

    expect(result).toEqual(42)
  })

  test("should convert TaskResult to Promise", async () => {
    const taskResult = Task.success(42)

    const promise = Task.toPromise(taskResult)
    const result = await promise

    expect(result).toEqual(42)
  })

  test("should convert TaskException to rejected Promise", async () => {
    const error = new Error("task error")
    const taskException = Task.fail(error)

    try {
      await Task.toPromise(taskException)
      expect.fail("Should throw error")
    } catch (e) {
      expect((e as Throwable)._tag).toBe("Throwable")
      expect((e as Error).message).toBe("task error")
    }
  })
})
