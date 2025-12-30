import { describe, expect, it } from "vitest"

import { Throwable } from "@/core"
import { mergeObjects } from "@/util"

/**
 * This test file demonstrates and documents the output format of various error types
 * when processed through the Throwable class.
 *
 * Run with: npm test -- test/core/throwable/throwable-examples.spec.ts
 */

// Helper function to safely stringify data including BigInt values
function safeStringify(obj: unknown): string {
  return JSON.stringify(obj, (_, value) => (typeof value === "bigint" ? value.toString() + "n" : value), 2)
}

// Helper function to print error information
function printErrorInfo(name: string, error: unknown): void {
  const throwable = Throwable.apply(error)
  console.log(`\n=== ${name} ===`)
  console.log("Message:", throwable.message)
  console.log("Name:", throwable.name)
  console.log("Data:", safeStringify(throwable.data))

  // Show stack trace (first line only)
  if (throwable.stack) {
    const firstStackLine = throwable.stack.split("\n")[0]
    console.log("Stack (first line):", firstStackLine)
  }
  console.log("---")
}

describe("Throwable Examples", () => {
  it("prints examples of all error types", () => {
    console.log("\nTHROWABLE ERROR EXAMPLES")
    console.log("======================")

    // Standard Error
    printErrorInfo("Standard Error", new Error("This is a standard error"))

    // Custom Error with properties
    const customError = new Error("Custom error with properties")
    mergeObjects(customError, { code: "E123", details: "Additional details" })
    printErrorInfo("Custom Error", customError)

    // String
    printErrorInfo("String", "This is a string error")

    // Number
    printErrorInfo("Number", 42)

    // Special Numbers
    printErrorInfo("NaN", NaN)
    printErrorInfo("Infinity", Infinity)
    printErrorInfo("Negative Infinity", -Infinity)

    // Boolean
    printErrorInfo("Boolean (true)", true)
    printErrorInfo("Boolean (false)", false)

    // Undefined and Null
    printErrorInfo("Undefined", undefined)
    printErrorInfo("Null", null)

    // Object
    printErrorInfo("Plain Object", { id: 123, message: "Object with message", status: "failed" })
    printErrorInfo("Object without message", { id: 456, status: "error", code: "NOT_FOUND" })

    // Function
    function testFunction() {
      return "test"
    }

    printErrorInfo("Named Function", testFunction)
    printErrorInfo("Anonymous Function", () => "anonymous")

    // Symbol
    printErrorInfo("Symbol with description", Symbol("test symbol"))
    printErrorInfo("Symbol without description", Symbol())

    // BigInt
    printErrorInfo("BigInt", BigInt(9007199254740991))

    // Array
    printErrorInfo("Array", [1, 2, 3, "error"])

    // Complex nested object
    printErrorInfo("Complex Object", {
      error: {
        code: 500,
        message: "Server error",
        details: {
          service: "api",
          time: new Date().toISOString(),
          request: { path: "/users", method: "GET" },
        },
      },
    })

    // This test doesn't actually assert anything, it just prints examples
    // But we need to have at least one assertion for the test to be valid
    expect(true).toBe(true)
  })
})
