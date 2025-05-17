import { describe, expect, it } from "vitest"

import { Task } from "@/core"
import { formatError, formatStackTrace, safeStringify } from "@/error"

describe("Stack Trace Formatting", () => {
  it("formats stack traces properly with formatStackTrace", () => {
    // Create an error with stack trace
    const error = new Error("Test error")
    const stackTrace = error.stack || ""

    // Format the stack trace
    const formattedStack = formatStackTrace(stackTrace)

    // Check that it still contains the error message
    expect(formattedStack).toContain("Test error")

    // Check that the stack frames are properly formatted
    const lines = formattedStack.split("\n")
    expect(lines.length).toBeGreaterThan(1)

    // Check that stack frames are properly indented
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i]
      // Make sure lines exist and have content
      if (line && line.length > 0) {
        // Stack frames should not have leading spaces (they're trimmed)
        expect(line.charAt(0)).not.toBe(" ")
        // Should start with "at"
        expect(line).toMatch(/^at /)
      }
    }

    // Output the formatted stack trace
    console.log("\nFormatted Stack Trace:")
    console.log(formattedStack)
  })

  it("formats stack traces in formatError output", () => {
    // Create an error
    const error = new Error("Test error")

    // Format the error with stack trace
    const formattedError = formatError(error, {
      includeStackTrace: true,
      maxStackFrames: 3,
    })

    // Check that the stack trace is properly formatted
    expect(formattedError).toContain("Test error")
    expect(formattedError).toContain("at ")

    // Output the formatted error
    console.log("\nFormatted Error with Stack Trace:")
    console.log(formattedError)
  })

  it("formats stack traces with safeStringify", () => {
    // Create an error with stack trace
    const error = new Error("Test error")

    // Manually add stack property to match what would happen in serialization
    const testObj = {
      message: "Test error",
      stack: error.stack,
    }

    // Serialize the object with safeStringify
    const serialized = safeStringify(testObj)

    // Parse it back to check formatting
    const parsed = JSON.parse(serialized)

    // Stack should be preserved
    expect(parsed).toHaveProperty("stack")
    expect(typeof parsed.stack).toBe("string")

    // Output the serialized error
    console.log("\nSerialized Object with Stack Trace:")
    console.log(serialized)
  })

  it("formats error messages with formatError", () => {
    // Create a task error to format
    const taskError = Task({ name: "ExampleTask" }).Sync(() => {
      throw new Error("Task failed with an error")
    }).value as Error

    // Format the error with stack trace
    const formattedError = formatError(taskError, {
      includeTasks: true,
      includeStackTrace: true,
      maxStackFrames: 3,
      title: "Error Report",
    })

    // Check that the formatted error contains task info
    expect(formattedError).toContain("ExampleTask")
    expect(formattedError).toContain("Task failed with an error")

    // Output the formatted error
    console.log("\nTask Error Formatted:")
    console.log(formattedError)

    // Try with colors option
    const coloredError = formatError(taskError, {
      includeTasks: true,
      includeStackTrace: true,
      maxStackFrames: 2,
      colors: true,
    })

    // Output the colored error
    console.log("\nColored Error Format:")
    console.log(coloredError)
  })
})
