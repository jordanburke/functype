import { describe, expect, test } from "vitest"

import { Task, Throwable } from "../../../src"

describe("Task Nested Error Handling", () => {
  test("should preserve context from inner task errors", async () => {
    // Create an inner task with a specific name
    const innerTask = Task({ name: "InnerTask", description: "This is the inner task" }).Async<string>(async () => {
      throw new Error("Inner task failed")
    })

    // Create an outer task that calls the inner task
    const outerTask = Task({ name: "OuterTask", description: "This is the outer task" }).Async<string>(async () => {
      // Awaiting inner task directly - need to handle TaskOutcome
      const result = await innerTask
      if (result.isFailure()) {
        throw result.value // Re-throw to preserve error chain
      }
      return result.value
    })

    const result = await outerTask
    expect(result.isFailure()).toBe(true)

    const error = result.value
    // With our improved implementation:
    // The error should have the outer task's context in the main error
    expect((error as Throwable).taskInfo?.name).toBe("OuterTask")
    // The message now includes the outer task name
    expect((error as Error).message).toBe("OuterTask: Inner task failed")

    // But the inner error context is preserved as the cause
    expect((error as any).cause).toBeDefined()
    expect((error as any).cause.taskInfo?.name).toBe("InnerTask")
    expect((error as any).cause.message).toBe("Inner task failed")

    // We can also access the full error chain
    const errorChain = Task.getErrorChain(error as Error)
    expect(errorChain.length).toBe(2)
    expect((errorChain[0] as any).taskInfo?.name).toBe("OuterTask")
    expect((errorChain[1] as any).taskInfo?.name).toBe("InnerTask")
  })

  test("should preserve inner error context when using proper error handling", async () => {
    // Create an inner task with a specific name
    const innerTask = Task({ name: "InnerTask", description: "This is the inner task" }).Async<string>(async () => {
      throw new Error("Inner task failed")
    })

    // Create an outer task with proper error handling for the inner task
    const outerTask = Task({ name: "OuterTask", description: "This is the outer task" }).Async<string>(async () => {
      const result = await innerTask
      if (result.isFailure()) {
        // Properly handle the error to preserve context
        throw new Error(`Outer task failed because: ${(result.value as Error).message}`)
      }
      return result.value
    })

    const result = await outerTask
    expect(result.isFailure()).toBe(true)

    const error = result.value
    // With manual handling, we at least get a reference to the inner error message
    expect((error as Throwable).taskInfo?.name).toBe("OuterTask")
    expect((error as Error).message).toBe("Outer task failed because: Inner task failed")
  })

  test("should demonstrate an improved approach with error chaining (proposed solution)", async () => {
    // This test demonstrates how things would work with a better error handling mechanism
    // that preserves the error chain

    // Mock implementation of improved Task error handling
    const mockTaskWithErrorChaining = (name: string) => {
      return {
        Async: <T>(fn: () => Promise<T>) => {
          return async () => {
            try {
              return await fn()
            } catch (error) {
              // In a proper implementation, this would preserve the error chain
              // by wrapping the inner error while maintaining its context
              const enhancedError = new Error(`${name} failed: ${(error as Error).message}`)

              // This would be added to maintain the error chain
              Object.defineProperty(enhancedError, "cause", {
                value: error,
                enumerable: false,
                writable: false,
              })

              throw enhancedError
            }
          }
        },
      }
    }

    // Using our mock implementation
    const innerMockTask = mockTaskWithErrorChaining("InnerTask").Async(async () => {
      throw new Error("Original inner error")
    })

    const outerMockTask = mockTaskWithErrorChaining("OuterTask").Async(async () => {
      return await innerMockTask()
    })

    try {
      await outerMockTask()
      expect.fail("Should throw an error")
    } catch (error) {
      // The error message should include both contexts
      expect((error as Error).message).toBe("OuterTask failed: InnerTask failed: Original inner error")

      // And we should be able to access the cause (though we can't test this here
      // as it's just a mock implementation)
    }
  })
})
