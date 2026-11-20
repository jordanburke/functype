import { describe, expect, it } from "vitest"

import { Throwable } from "@/core"
import { createErrorSerializer, formatError } from "@/error/ErrorFormatter"
import { mergeObjects } from "@/util"

// A failure in a named step, wrapping the error below it as its cause.
const stepError = (name: string, message: string, cause?: Error, description = ""): Error =>
  Throwable.apply(new Error(message, { cause }), undefined, { name, description })

/**
 * This test file demonstrates how to effectively log functype errors with Pino
 * and provides examples of improved error formatting for better debugging.
 *
 * Run with: pnpm vitest run test/error/error-formatter-pino.spec.ts
 */

// Mock Pino logger for testing
function createMockPinoLogger() {
  const logs: any[] = []

  return {
    error: (obj: unknown, msg?: string) => {
      if (typeof obj === "object" && obj !== null && msg) {
        logs.push({ level: "error", ...obj, msg })
      } else {
        logs.push({ level: "error", msg: obj })
      }
      return logs[logs.length - 1]
    },
    warn: (obj: unknown, msg?: string) => {
      if (typeof obj === "object" && obj !== null && msg) {
        logs.push({ level: "warn", ...obj, msg })
      } else {
        logs.push({ level: "warn", msg: obj })
      }
      return logs[logs.length - 1]
    },
    info: (obj: unknown, msg?: string) => {
      if (typeof obj === "object" && obj !== null && msg) {
        logs.push({ level: "info", ...obj, msg })
      } else {
        logs.push({ level: "info", msg: obj })
      }
      return logs[logs.length - 1]
    },
    debug: (obj: unknown, msg?: string) => {
      if (typeof obj === "object" && obj !== null && msg) {
        logs.push({ level: "debug", ...obj, msg })
      } else {
        logs.push({ level: "debug", msg: obj })
      }
      return logs[logs.length - 1]
    },
    getLogs: () => logs,
    clearLogs: () => {
      logs.length = 0
    },
  }
}

// Helper function to safely stringify data including BigInt values
function safeStringify(obj: unknown): string {
  return JSON.stringify(obj, (_, value) => (typeof value === "bigint" ? value.toString() + "n" : value), 2)
}

describe("Pino Error Logging with Functype", () => {
  it("demonstrates standard Pino error logging with functype errors", () => {
    const logger = createMockPinoLogger()

    // Create a simple error
    const error = new Error("Database connection failed")

    // Regular Pino logging with this error
    logger.error({ err: error }, "Failed to connect to database")

    // Wrap with Throwable and log
    const throwableError = Throwable.apply(error, {
      connectionId: "conn-123",
      dbHost: "db.example.com",
      retryCount: 3,
    })

    logger.error({ err: throwableError }, "Failed to connect to database with Throwable")

    // Show the logs
    console.log("\nStandard Pino Logging:")
    logger.getLogs().forEach((log, i) => {
      console.log(`\nLog entry ${i + 1}:`)
      console.log(safeStringify(log))
    })

    expect(logger.getLogs().length).toBe(2)
    expect(logger.getLogs()[1]).toHaveProperty("err")
  })

  it("demonstrates improved Pino error logging with error serializer", () => {
    const logger = createMockPinoLogger()

    // Create an error serializer
    const errorSerializer = createErrorSerializer()

    // Create a nested step error scenario
    const level3 = stepError("DbConnection", "Connection timeout after 30s")
    const level2 = stepError("DbQuery", "Query failed", level3)
    const error = stepError("UserService", "User lookup failed", level2)

    // Add custom context to the error
    mergeObjects(error, {
      requestId: "req-789",
      userId: "user-456",
      endpoint: "/api/users/profile",
    })

    // Log with standard approach
    logger.error({ err: error }, "Failed to fetch user data")

    // Log with serializer
    const serializedError = errorSerializer(error)
    logger.error({ err: serializedError, requestId: "req-789" }, "Failed to fetch user data (with serializer)")

    // Log with custom format string for human-readable console output
    const formattedError = formatError(error, {
      includeTasks: true,
      includeStackTrace: true,
      includeData: true,
      maxStackFrames: 2,
      title: "API Error",
      colors: false, // No colors in test output
    })

    logger.error(
      {
        formattedError,
        requestId: "req-789",
        // Also include serialized for machine parsing
        serializedError,
      },
      "Failed to fetch user data (with formatter)",
    )

    // Show the logs
    console.log("\nImproved Pino Logging with Error Serializer:")
    logger.getLogs().forEach((log, i) => {
      console.log(`\nLog entry ${i + 1}:`)
      console.log(safeStringify(log))
    })

    // Output the human-readable format to console for visual inspection
    console.log("\nHuman-readable formatted error for console:")
    console.log(formattedError)

    expect(logger.getLogs().length).toBe(3)
    expect(logger.getLogs()[1].err).toBeDefined()
    expect(logger.getLogs()[2]).toHaveProperty("formattedError")
  })

  it("demonstrates real-world error logging patterns with Pino", () => {
    const logger = createMockPinoLogger()
    const errorSerializer = createErrorSerializer()

    // Simulate a real-world error scenario in a REST API
    const dbError = new Error('ERROR: duplicate key value violates unique constraint "users_email_key"')
    // Add postgres-like error properties
    mergeObjects(dbError, {
      code: "23505",
      detail: "Key (email)=(user@example.com) already exists.",
      schema: "public",
      table: "users",
      column: "email",
      constraint: "users_email_key",
      dataType: "text",
    })
    const dbStep = Throwable.apply(dbError, undefined, {
      name: "DatabaseQuery",
      description: "Query user data from database",
    })
    const userStep = stepError("UserService", "Registration failed", dbStep, "User registration service")
    const error = stepError("UserController", "Registration failed", userStep, "User registration endpoint")

    // Add request context to the error
    mergeObjects(error, {
      request: {
        method: "POST",
        path: "/api/users",
        body: {
          name: "John Doe",
          email: "user@example.com",
          role: "user",
        },
        headers: {
          "content-type": "application/json",
          "user-agent": "Mozilla/5.0",
        },
      },
      timestamp: new Date().toISOString(),
      requestId: "req-123456",
    })

    // Log with full context and formatting
    logger.error(
      {
        err: errorSerializer(error),
        requestId: (error as any).requestId,
        path: (error as any).request?.path,
        method: (error as any).request?.method,
        userEmail: (error as any).request?.body?.email,
      },
      "User registration failed",
    )

    // Create a human-readable version for console output
    const readableError = formatError(error, {
      includeTasks: true,
      includeStackTrace: true,
      includeData: true,
      title: "Registration Error",
      colors: true,
    })

    // In a real application, you might log both:
    // 1. Structured JSON for machine processing
    // 2. Human-readable format for console/developers
    console.log("\nReal-world error scenario:")
    console.log("\nStructured log for machine processing:")
    console.log(safeStringify(logger.getLogs()[0]))

    console.log("\nHuman-readable log for console/developers:")
    console.log(readableError)

    expect(logger.getLogs().length).toBe(1)
    expect(logger.getLogs()[0]).toHaveProperty("err")
    expect(logger.getLogs()[0]).toHaveProperty("requestId", "req-123456")
  })
})
