import { describe, expect, it, vi } from "vitest"

import { Throwable } from "@/core"
import { formatError, createErrorSerializer, formatErrorChain } from "@/error"

// A failure in a named step, wrapping the error below it as its cause.
const stepError = (name: string, message: string, cause?: Error, description = ""): Error =>
  Throwable.apply(new Error(message, { cause }), undefined, { name, description })

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

  it("demonstrates named step errors when directly logged", () => {
    const output = mockConsoleAndRun(() => {
      // Wrap in try/catch to avoid failing the test
      try {
        throw stepError("UserService", "User validation failed", undefined, "Handles user operations")
      } catch (error) {
        console.log("Step Error object:", error)
        console.log("Step Error toString:", (error as Error).toString())
        console.error("Step Error in console.error:", error)
      }
    })

    expect(output.some((line) => line.includes("UserService"))).toBe(true)
    console.log("\nStep Error outputs:")
    console.log(output.join("\n").substring(0, 500) + "...")
  })

  it("demonstrates how error chain formatting improves clarity", () => {
    const output = mockConsoleAndRun(() => {
      // Create a nested step error
      const inner = stepError("DbQuery", "Database connection failed", undefined, "Database query operation")
      const outer = stepError("UserFetch", "Fetch user data failed", inner, "Fetch user data")

      // Raw error output
      console.log("Raw nested error:", JSON.stringify(outer))
      console.log("Error message:", outer.message)
      console.log("Error name:", outer.name)

      // Use the error chain formatter
      const formattedError = formatErrorChain(outer, {
        includeTasks: true,
        includeStackTrace: false,
      })

      console.log("\nFormatted Error Chain:")
      console.log(formattedError)
    })

    // In the mock console environment, check that we have some outputs
    expect(output.length).toBeGreaterThan(2)
    expect(output.some((line) => line.includes("Formatted Error Chain"))).toBe(true)
    expect(output.some((line) => line.includes("[DbQuery] Database connection failed"))).toBe(true)
    console.log("\nNested Step Error with formatting:")
    console.log(output.join("\n"))
  })

  it("demonstrates improved error display format from ErrorFormatter", () => {
    const output = mockConsoleAndRun(() => {
      // Create a deep error chain
      const level3 = stepError("DbConnection", "Connection timeout")
      const level2 = stepError("DbQuery", "Query failed", level3)
      const level1 = stepError("UserService", "User lookup failed", level2)
      const error = stepError("ApiHandler", "Request failed", level1)

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
    expect(output.some((line) => line.includes("ApiHandler"))).toBe(true)
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

    // Create a nested step error
    const inner = stepError("DbQuery", "Query syntax error in users table")
    const error = stepError("UserService", "Failed to load user", inner)

    // Standard Pino error logging
    pinoLogger.error({ err: error }, "Failed to fetch user data")

    // Enhanced Pino error logging
    pinoLogger.error(
      {
        err: error,
        errorChain: formatErrorChain(error, { includeTasks: true }),
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
    // Create a single-level step error
    const error = stepError("UserFetch", "Connection failed")

    // Get serialized error using the provided serializer
    const errorSerializer = createErrorSerializer()
    const serialized = errorSerializer(error)

    // Output the serialized error
    console.log("\nSerialized Error for Loggers:")
    console.log(safeStringify(serialized))

    expect(serialized).toHaveProperty("message")
    // The single-level error won't have errorChain populated
    expect(serialized).toHaveProperty("stack")
    expect(serialized).toHaveProperty("name", "UserFetch")
  })
})
