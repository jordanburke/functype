import { describe, expect, test } from "vitest"

import type { Err } from "@/core"
import { Task, type TaskOutcome } from "@/core"

describe("Task Type Guards", () => {
  test("isSuccess should narrow type to Ok", () => {
    const result = Task().Sync(() => "success value")

    if (result.isSuccess()) {
      // TypeScript should know this is Ok<string>
      expect(result._tag).toBe("Ok")
      expect(result.value).toBe("success value")
      expect(result.error).toBeUndefined()
    } else {
      expect.fail("Should be success")
    }
  })

  test("isFailure should narrow type to Err", () => {
    const result = Task().Sync(() => {
      throw new Error("failure")
    })

    if (result.isFailure()) {
      // TypeScript should know this is Err<never>
      expect(result._tag).toBe("Err")
      expect(result.error).toBeDefined()
      expect(result.error.message).toBe("failure")
      // error property should be defined and not the value
      expect(result.value).toBeUndefined()
    } else {
      expect.fail("Should be failure")
    }
  })

  test("type guards work in conditional expressions", () => {
    const processResult = <T>(outcome: TaskOutcome<T>) => {
      // Using type guard in ternary
      const message = outcome.isSuccess()
        ? `Success: ${outcome.orThrow()}` // TypeScript knows this is Ok
        : `Error: ${outcome.error?.message}` // TypeScript knows outcome.error exists here

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
      : (result as Err<string>).recover("fallback") // Can use recover on failure

    expect(processed).toBeDefined()
  })

  test("negation of type guards also narrows", () => {
    const result = Task().Sync(() => "value")

    if (!result.isFailure()) {
      // TypeScript should know this is Ok<string>
      expect(result._tag).toBe("Ok")
      expect(result.orThrow()).toBe("value")
    }

    const failResult = Task().Sync<string>(() => {
      throw new Error("error")
    })

    if (!failResult.isSuccess()) {
      // TypeScript should know this is Err<string>
      expect(failResult._tag).toBe("Err")
      expect((failResult as Err<string>).error).toBeDefined()
    }
  })
})
