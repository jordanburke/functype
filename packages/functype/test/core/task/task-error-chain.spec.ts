import { describe, expect, test } from "vitest"

import { Task } from "@/core"

import type { Throwable } from "../../../src"

describe("Task Error Chain Tests", () => {
  test("should preserve error chain in nested task executions", async () => {
    // Create an inner task with a specific name
    const innerTask = Task({ name: "InnerTask", description: "This is the inner task" }).Async<string>(async () => {
      throw new Error("Inner task failed")
    })

    // Create an outer task that calls the inner task
    const outerTask = Task({ name: "OuterTask", description: "This is the outer task" }).Async<string>(async () => {
      const result = await innerTask
      if (result.isFailure()) {
        throw result.error // Re-throw the error to preserve chain
      }
      return result.orThrow()
    })

    const result = await outerTask
    expect(result.isFailure()).toBe(true)

    const error = result.error
    // The error should have the outer task's context
    expect((error as Throwable).taskInfo?.name).toBe("OuterTask")

    // But should also maintain a reference to the inner error as its cause
    expect((error as any).cause).toBeDefined()
    expect((error as any).cause.taskInfo?.name).toBe("InnerTask")
    expect((error as any).cause.message).toBe("Inner task failed")

    // Test the error chain utility
    const errorChain = Task.getErrorChain(error as Error)
    expect(errorChain.length).toBe(2)
    expect((errorChain[0] as any).taskInfo?.name).toBe("OuterTask")
    expect((errorChain[1] as any).taskInfo?.name).toBe("InnerTask")

    // Test the formatting utility
    const formattedError = Task.formatErrorChain(error as Error, { includeTasks: true })
    expect(formattedError).toContain("OuterTask")
    expect(formattedError).toContain("Inner task failed")
  })

  test("should support multiple levels of nesting with full context preservation", async () => {
    // Create a deeply nested chain of tasks
    const level3Task = Task({ name: "Level3Task" }).Async<string>(async () => {
      throw new Error("Level 3 failure")
    })

    const level2Task = Task({ name: "Level2Task" }).Async<string>(async () => {
      const result = await level3Task
      if (result.isFailure()) {
        throw result.error
      }
      return result.orThrow()
    })

    const level1Task = Task({ name: "Level1Task" }).Async<string>(async () => {
      const result = await level2Task
      if (result.isFailure()) {
        throw result.error
      }
      return result.orThrow()
    })

    const result = await level1Task
    expect(result.isFailure()).toBe(true)

    const error = result.error
    // Get the full error chain
    const errorChain = Task.getErrorChain(error as Error)

    // Should have 3 levels of errors
    expect(errorChain.length).toBe(3)

    // Check each level has the right context
    expect((errorChain[0] as any).taskInfo?.name).toBe("Level1Task")
    expect((errorChain[1] as any).taskInfo?.name).toBe("Level2Task")
    expect((errorChain[2] as any).taskInfo?.name).toBe("Level3Task")

    // The bottom-level error should have the original message
    expect((errorChain[2] as Error).message).toBe("Level 3 failure")

    // Format the error chain
    const formattedError = Task.formatErrorChain(error as Error, { includeTasks: true })

    // Should include all task names
    expect(formattedError).toContain("Level1Task")
    expect(formattedError).toContain("Level2Task")
    expect(formattedError).toContain("Level3Task")
    expect(formattedError).toContain("Level 3 failure")
  })

  test("should handle errors with custom data in the chain", async () => {
    // Create tasks with custom error data
    const dataTask = Task({ name: "DataTask" }).Async<string>(async () => {
      const error = new Error("Error with custom data")
      // Add custom data to the error
      Object.defineProperty(error, "customData", {
        value: { code: "DATA_ERROR", details: "Important context" },
        enumerable: true,
      })
      throw error
    })

    const wrapperTask = Task({ name: "WrapperTask" }).Async<string>(async () => {
      const result = await dataTask
      if (result.isFailure()) {
        throw result.error
      }
      return result.orThrow()
    })

    const result = await wrapperTask
    expect(result.isFailure()).toBe(true)

    const error = result.error
    // The cause should have the custom data
    expect((error as any).cause).toBeDefined()
    expect((error as any).cause.customData).toBeDefined()
    expect((error as any).cause.customData.code).toBe("DATA_ERROR")

    // The error chain should include both errors
    const errorChain = Task.getErrorChain(error as Error)
    expect(errorChain.length).toBe(2)

    // Test custom formatting
    const formattedError = Task.formatErrorChain(error as Error, {
      includeTasks: true,
      separator: " -> ",
    })
    expect(formattedError).toContain("WrapperTask")
    expect(formattedError).toContain("DataTask")
    expect(formattedError).toContain("->") // Custom separator
  })

  test("should handle non-throwable errors in the chain", async () => {
    // Create a task that throws a non-Throwable error
    const regularErrorTask = Task({ name: "RegularErrorTask" }).Async<string>(async () => {
      throw "This is a string error, not a proper Error object"
    })

    const wrapperTask = Task({ name: "WrapperTask" }).Async<string>(async () => {
      const result = await regularErrorTask
      if (result.isFailure()) {
        throw result.error
      }
      return result.orThrow()
    })

    const result = await wrapperTask
    expect(result.isFailure()).toBe(true)

    const error = result.error
    // The error chain should still work
    const errorChain = Task.getErrorChain(error as Error)
    expect(errorChain.length).toBeGreaterThanOrEqual(1)

    // Even with non-standard errors, we should have a formatted message
    const formattedError = Task.formatErrorChain(error as Error, { includeTasks: true })
    expect(formattedError).toBeTruthy()
  })
})
