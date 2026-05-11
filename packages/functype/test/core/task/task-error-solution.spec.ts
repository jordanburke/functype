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

    // Run multiple iterations to get more stable measurements
    const iterations = 5
    const regularTimes: number[] = []
    const enhancedTimes: number[] = []

    // Warm up JIT
    for (let i = 0; i < 100; i++) {
      await regularTask
      await enhancedTask
    }

    // Run test iterations
    for (let iter = 0; iter < iterations; iter++) {
      // Measure standard task performance
      const regularStart = performance.now()
      for (let i = 0; i < 1000; i++) {
        await regularTask
      }
      regularTimes.push(performance.now() - regularStart)

      // Measure enhanced task performance
      const enhancedStart = performance.now()
      for (let i = 0; i < 1000; i++) {
        await enhancedTask
      }
      enhancedTimes.push(performance.now() - enhancedStart)
    }

    // Calculate medians (more stable than averages)
    const median = (arr: number[]): number => {
      const sorted = [...arr].sort((a, b) => a - b)
      const mid = Math.floor(sorted.length / 2)
      return sorted.length % 2 ? sorted[mid]! : (sorted[mid - 1]! + sorted[mid]!) / 2
    }

    const regularMedian = median(regularTimes)
    const enhancedMedian = median(enhancedTimes)
    const ratio = enhancedMedian / regularMedian

    console.log(`Regular task times: ${regularTimes.map((t) => t.toFixed(1)).join(", ")}ms`)
    console.log(`Enhanced task times: ${enhancedTimes.map((t) => t.toFixed(1)).join(", ")}ms`)
    console.log(`Regular median: ${regularMedian.toFixed(2)}ms`)
    console.log(`Enhanced median: ${enhancedMedian.toFixed(2)}ms`)
    console.log(`Performance ratio: ${ratio.toFixed(2)}x`)

    // Only fail if it's significantly slower (>3x) using median times
    expect(enhancedMedian).toBeLessThan(regularMedian * 3)
  })
})
