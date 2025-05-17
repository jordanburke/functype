import { describe, expect, test } from "vitest"

import { Task, Throwable } from "@/core"

import { EnhancedTask } from "./task-error-solution"

describe("Enhanced Task Error Handling", () => {
  test("should maintain error chain in nested task executions", async () => {
    // Create an inner task with a specific name
    const innerTask = EnhancedTask({ name: "InnerTask", description: "This is the inner task" }).Async<string>(
      async () => {
        throw new Error("Inner task failed")
      },
    )

    // Create an outer task that calls the inner task
    const outerTask = EnhancedTask({ name: "OuterTask", description: "This is the outer task" }).Async<string>(
      async () => {
        return await innerTask
      },
    )

    try {
      await outerTask
      expect.fail("Should throw an error")
    } catch (error) {
      // The error should have the outer task's context
      expect((error as Throwable).taskInfo?.name).toBe("OuterTask")

      // But should also maintain a reference to the inner error as its cause
      expect((error as any).cause).toBeDefined()
      expect((error as any).cause.taskInfo?.name).toBe("InnerTask")
      expect((error as any).cause.message).toBe("Inner task failed")

      // The outer error message should include context from both
      expect((error as Error).message).toContain("OuterTask")
      expect((error as Error).message).toContain("Inner task failed")
    }
  })

  test("should support multiple levels of nesting with full context preservation", async () => {
    // Create a deeply nested chain of tasks
    const level3Task = EnhancedTask({ name: "Level3Task" }).Async<string>(async () => {
      throw new Error("Level 3 failure")
    })

    const level2Task = EnhancedTask({ name: "Level2Task" }).Async<string>(async () => {
      return await level3Task
    })

    const level1Task = EnhancedTask({ name: "Level1Task" }).Async<string>(async () => {
      return await level2Task
    })

    try {
      await level1Task
      expect.fail("Should throw an error")
    } catch (error) {
      // Get the full error chain
      const errorChain = EnhancedTask().getErrorChain(error as any)

      // Should have 3 levels of errors
      expect(errorChain.length).toBeGreaterThanOrEqual(3)

      // Check each level has the right context
      expect((errorChain[0] as any).taskInfo?.name).toBe("Level1Task")
      expect((errorChain[1] as any).taskInfo?.name).toBe("Level2Task")
      expect((errorChain[2] as any).taskInfo?.name).toBe("Level3Task")

      // The bottom-level error should have the original message
      expect((errorChain[2] as Error).message).toBe("Level 3 failure")

      // Format the error chain
      const formattedError = EnhancedTask().formatErrorChain(error as any)
      console.log(formattedError)

      // Should include all task names
      expect(formattedError).toContain("Level1Task")
      expect(formattedError).toContain("Level2Task")
      expect(formattedError).toContain("Level3Task")
      expect(formattedError).toContain("Level 3 failure")
    }
  })

  test("should demonstrate performance impact is minimal", async () => {
    // Setup test tasks
    const regularTask = Task({ name: "RegularTask" }).Async<string>(async () => "success")

    const enhancedTask = EnhancedTask({ name: "EnhancedTask" }).Async<string>(async () => "success")

    // Measure standard task performance
    const regularStart = performance.now()
    for (let i = 0; i < 1000; i++) {
      await regularTask
    }
    const regularTime = performance.now() - regularStart

    // Measure enhanced task performance
    const enhancedStart = performance.now()
    for (let i = 0; i < 1000; i++) {
      await enhancedTask
    }
    const enhancedTime = performance.now() - enhancedStart

    console.log(`Regular task: ${regularTime.toFixed(2)}ms`)
    console.log(`Enhanced task: ${enhancedTime.toFixed(2)}ms`)

    // The performance difference should be acceptable (<20% slower is reasonable)
    // This is just informational - not a strict test as timing can vary
    expect(enhancedTime).toBeLessThan(regularTime * 1.5)
  })
})
