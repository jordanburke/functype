import { describe, expect, test } from "vitest"
import { Task } from "../../../src"

describe("Task Type Guards", () => {
  test("isSuccess should narrow type to TaskSuccess", () => {
    const result = Task().Sync(() => "success value")

    if (result.isSuccess()) {
      // TypeScript should know this is TaskSuccess<string>
      expect(result._tag).toBe("TaskSuccess")
      expect(result.value).toBe("success value")
      // @ts-expect-error - error property doesn't exist on TaskSuccess
      expect(result.error).toBeUndefined()
    } else {
      expect.fail("Should be success")
    }
  })

  test("isFailure should narrow type to TaskFailure", () => {
    const result = Task().Sync(() => {
      throw new Error("failure")
    })

    if (result.isFailure()) {
      // TypeScript should know this is TaskFailure<never>
      expect(result._tag).toBe("TaskFailure")
      expect(result.error).toBeDefined()
      expect(result.error.message).toBe("failure")
      // @ts-expect-error - value property exists but is Throwable, not the success type
      const val: string = result.value
      expect(val).toBeDefined() // This line won't actually run due to type error
    } else {
      expect.fail("Should be failure")
    }
  })

  test("type guards work in conditional expressions", () => {
    const processResult = <T>(outcome: TaskSuccess<T> | TaskFailure<T>) => {
      // Using type guard in ternary
      const message = outcome.isSuccess()
        ? `Success: ${outcome.get()}` // TypeScript knows this is TaskSuccess
        : `Error: ${outcome.error.message}` // TypeScript knows outcome.error exists here

      return message
    }

    const success = Task.success<string>("test")
    const failure = Task.fail<string>(new Error("test error"))

    expect(processResult(success)).toBe("Success: test")
    expect(processResult(failure)).toBe("Error: test error")
  })

  test("type guards enable proper method chaining", () => {
    const result = Task().Sync(() => "initial")

    // This should compile without type assertions
    const processed = result.isSuccess()
      ? result.map((v) => v.toUpperCase()) // Can use map on success
      : result.recover("fallback") // Can use recover on failure

    expect(processed).toBeDefined()
  })

  test("negation of type guards also narrows", () => {
    const result = Task().Sync(() => "value")

    if (!result.isFailure()) {
      // TypeScript should know this is TaskSuccess<string>
      expect(result._tag).toBe("TaskSuccess")
      expect(result.get()).toBe("value")
    }

    const failResult = Task().Sync<string>(() => {
      throw new Error("error")
    })

    if (!failResult.isSuccess()) {
      // TypeScript should know this is TaskFailure<string>
      expect(failResult._tag).toBe("TaskFailure")
      expect(failResult.error).toBeDefined()
    }
  })
})
