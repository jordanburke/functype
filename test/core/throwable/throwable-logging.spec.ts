import { describe, expect, it, vi } from "vitest"

import { Task, Throwable } from "@/core"
import { formatError, createErrorSerializer } from "@/error"

/**
 * This test file demonstrates how functype errors appear in various logging contexts
 * and explores ways to improve error display formats for better debugging.
 *
 * Run with: pnpm vitest run test/core/throwable/throwable-logging.spec.ts
 */

// Helper function to safely stringify data including BigInt values
function safeStringify(obj: unknown): string {
  return JSON.stringify(obj, (_, value) => (typeof value === "bigint" ? value.toString() + "n" : value), 2)
}

// Mock console.log to capture output
function mockConsoleAndRun(fn: () => void): string[] {
  const output: string[] = []
  const originalLog = console.log
  const originalError = console.error

  console.log = vi.fn((...args) => {
    output.push(args.map((arg) => (typeof arg === "string" ? arg : safeStringify(arg))).join(" "))
  })

  console.error = vi.fn((...args) => {
    output.push(args.map((arg) => (typeof arg === "string" ? arg : safeStringify(arg))).join(" "))
  })

  try {
    fn()
    return output
  } finally {
    console.log = originalLog
    console.error = originalError
  }
}

describe("Throwable Logging Display", () => {
  it("demonstrates how standard errors display in console.log (JSON representation)", () => {
    const output = mockConsoleAndRun(() => {
      const error = new Error("Standard error message")
      console.log("Error:", error)
    })

    // In Node.js, Error objects are shown as empty objects in console.log
    expect(output[0]).toContain("Error:")
    console.log("\nStandard Error in console.log:")
    console.log(output[0])
  })

  it("demonstrates how throwable errors display in console.log (JSON representation)", () => {
    const output = mockConsoleAndRun(() => {
      const error = Throwable.apply(new Error("Throwable wrapped error"))
      console.log("Error:", error)
    })

    // Shows that Throwable attributes are serialized
    expect(output[0]).toContain("_tag")
    expect(output[0]).toContain("Throwable")
    console.log("\nThrowable Error in console.log:")
    console.log(output[0])
  })

  it("demonstrates that error.toString() only shows the message", () => {
    const output = mockConsoleAndRun(() => {
      const error = new Error("Standard error message")
      console.log("Error toString:", error.toString())

      const throwable = Throwable.apply(new Error("Throwable wrapped error"))
      console.log("Throwable toString:", throwable.toString())
    })

    expect(output[0]).toContain("Standard error message")
    expect(output[1]).toContain("Throwable wrapped error")
    console.log("\nError toString() results:")
    console.log(output.join("\n"))
  })

  it("demonstrates error.toString vs console.error", () => {
    const output = mockConsoleAndRun(() => {
      const error = new Error("Standard error message")
      // Use toString to get the error message
      console.log(error.toString())

      const throwable = Throwable.apply(new Error("Throwable wrapped error"))
      console.log(throwable.toString())
    })

    expect(output[0]).toContain("Standard error message")
    expect(output[1]).toContain("Throwable wrapped error")
    console.log("\nError string representations:")
    console.log(output.join("\n"))
  })

  it("demonstrates task errors when directly logged", () => {
    const output = mockConsoleAndRun(() => {
      // Wrap in try/catch to avoid failing the test
      try {
        // Throw inside a task
        throw Task({ name: "UserService", description: "Handles user operations" }).Sync(() => {
          throw new Error("User validation failed")
        }).value
      } catch (error) {
        console.log("Task Error object:", error)
        console.log("Task Error toString:", (error as Error).toString())
        console.error("Task Error in console.error:", error)
      }
    })

    expect(output.some((line) => line.includes("UserService"))).toBe(true)
    console.log("\nTask Error outputs:")
    console.log(output.join("\n").substring(0, 500) + "...")
  })

  it("demonstrates how error chain formatting improves clarity", () => {
    const output = mockConsoleAndRun(() => {
      // Create a nested task error
      const innerTask = Task({ name: "DbQuery", description: "Database query operation" }).Sync(() => {
        throw new Error("Database connection failed")
      })

      const outerTask = Task({ name: "UserFetch", description: "Fetch user data" }).Sync(() => {
        return innerTask.value
      })

      // Raw error output
      console.log("Raw nested error:", JSON.stringify(outerTask.value))
      console.log("Error message:", (outerTask.value as Error).message)
      console.log("Error name:", (outerTask.value as Error).name)

      // Use the error chain formatter
      const formattedError = Task.formatErrorChain(outerTask.value as Error, {
        includeTasks: true,
        includeStackTrace: false,
      })

      console.log("\nFormatted Error Chain:")
      console.log(formattedError)
    })

    // In the mock console environment, check that we have some outputs
    expect(output.length).toBeGreaterThan(2)
    expect(output.some((line) => line.includes("Formatted Error Chain"))).toBe(true)
    console.log("\nNested Task Error with formatting:")
    console.log(output.join("\n"))
  })

  it("demonstrates improved error display format from ErrorFormatter", () => {
    const output = mockConsoleAndRun(() => {
      // Create a deep error chain
      const level3Task = Task({ name: "DbConnection" }).Sync(() => {
        throw new Error("Connection timeout")
      })

      const level2Task = Task({ name: "DbQuery" }).Sync(() => {
        return level3Task.value
      })

      const level1Task = Task({ name: "UserService" }).Sync(() => {
        return level2Task.value
      })

      const mainTask = Task({ name: "ApiHandler" }).Sync(() => {
        return level1Task.value
      })

      const error = mainTask.value as Error

      // Log with standard console
      console.log("Standard error display:", error)

      // Log with improved formatter
      console.log("\nImproved error display:")
      console.log(
        formatError(error, {
          includeTasks: true,
          includeStackTrace: true,
          includeData: true,
          maxStackFrames: 2,
          title: "API Error",
          colors: false,
        }),
      )
    })

    expect(output.some((line) => line.includes("Improved error display"))).toBe(true)
    expect(output.some((line) => line.includes("API Error"))).toBe(true)
    expect(output.some((line) => line.includes("DbConnection"))).toBe(true)
    console.log("\nImproved Error Display Format:")
    console.log(output.join("\n"))
  })

  it("mock Pino logger error display", () => {
    // Mock a typical Pino logger setup
    const createMockPinoLogger = () => {
      const logs: any[] = []

      const logger = {
        error: (obj: unknown, msg?: string) => {
          if (typeof obj === "object" && obj !== null && msg) {
            logs.push({ ...obj, msg })
          } else {
            logs.push({ msg: obj })
          }
        },
        warn: (obj: unknown, msg?: string) => {
          if (typeof obj === "object" && obj !== null && msg) {
            logs.push({ level: "warn", ...obj, msg })
          } else {
            logs.push({ level: "warn", msg: obj })
          }
        },
        getLogs: () => logs,
      }

      return logger
    }

    const pinoLogger = createMockPinoLogger()

    // Create a task error
    const innerTask = Task({ name: "DbQuery" }).Sync(() => {
      throw new Error("Query syntax error in users table")
    })

    const outerTask = Task({ name: "UserService" }).Sync(() => {
      return innerTask.value
    })

    const error = outerTask.value as Error

    // Standard Pino error logging
    pinoLogger.error({ err: error }, "Failed to fetch user data")

    // Enhanced Pino error logging
    pinoLogger.error(
      {
        err: error,
        errorChain: Task.formatErrorChain(error, { includeTasks: true }),
        service: "user-api",
        userId: "user123",
        operation: "get-profile",
      },
      "Failed to fetch user data",
    )

    // Output the logs
    console.log("\nPino Logger Error Display:")
    pinoLogger.getLogs().forEach((log, i) => {
      console.log(`\nLog entry ${i + 1}:`)
      console.log(safeStringify(log))
    })

    expect(pinoLogger.getLogs().length).toBe(2)
    expect(pinoLogger.getLogs()[1]).toHaveProperty("errorChain")
  })

  it("demonstrates the error serializer from ErrorFormatter", () => {
    // Create a nested task error
    const level3 = Task({ name: "DbConnection" }).Sync(() => {
      throw new Error("Connection failed")
    })

    const level2 = Task({ name: "UserFetch" }).Sync(() => {
      return level3.value
    })

    // Create level1 and get its error for testing
    Task({ name: "ApiRequest" }).Sync(() => {
      return level2.value
    })

    // Get serialized error using the provided serializer
    const errorSerializer = createErrorSerializer()
    const error = level2.value as Error
    const serialized = errorSerializer(error)

    // Output the serialized error
    console.log("\nSerialized Error for Loggers:")
    console.log(safeStringify(serialized))

    expect(serialized).toHaveProperty("message")
    // The single-level error won't have errorChain populated
    expect(serialized).toHaveProperty("stack")
    expect(serialized).toHaveProperty("name", "DbConnection")
  })
})
