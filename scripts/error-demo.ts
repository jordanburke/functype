import { Throwable } from "@/core"
import { mergeObjects } from "@/util"

/**
 * This script demonstrates how different error types are displayed
 * when processed through the Throwable class.
 */

// Helper function to safely stringify data including BigInt values
function safeStringify(obj: unknown): string {
  return JSON.stringify(obj, (_, value) => (typeof value === "bigint" ? `${value.toString()}n` : value), 2)
}

// Helper function to demonstrate error handling
function demonstrateError<T>(name: string, errorValue: T): void {
  console.log(`\n=== ${name} ===`)
  try {
    // Simulate throwing the error
    throw errorValue
  } catch (error) {
    // Convert to Throwable
    const throwable = Throwable.apply(error)

    // Display error information
    console.log("Message:", throwable.message)
    console.log("Name:", throwable.name)
    console.log("Data:", safeStringify(throwable.data))

    // Show how it would look in a typical error log
    console.log("\nTypical error log:")
    console.log(`[ERROR] ${throwable.name}: ${throwable.message}`)

    // Show stack trace (first few lines)
    if (throwable.stack) {
      const stackLines = throwable.stack.split("\n").slice(0, 3)
      console.log("\nStack trace (first few lines):")
      console.log(stackLines.join("\n"))
    }
  }
}

// Demonstrate various error types
console.log("THROWABLE ERROR DEMONSTRATION")
console.log("============================")

// Standard Error
demonstrateError("Standard Error", new Error("This is a standard error"))

// Custom Error with properties
const customError = new Error("Custom error with properties")
mergeObjects(customError, { code: "E123", details: "Additional details" })
demonstrateError("Custom Error", customError)

// String
demonstrateError("String", "This is a string error")

// Number
demonstrateError("Number", 42)

// Special Numbers
demonstrateError("NaN", NaN)
demonstrateError("Infinity", Infinity)
demonstrateError("Negative Infinity", -Infinity)

// Boolean
demonstrateError("Boolean (true)", true)
demonstrateError("Boolean (false)", false)

// Undefined and Null
demonstrateError("Undefined", undefined)
demonstrateError("Null", null)

// Object
demonstrateError("Plain Object", { id: 123, message: "Object with message", status: "failed" })
demonstrateError("Object without message", { id: 456, status: "error", code: "NOT_FOUND" })

// Function
function testFunction() {
  return "test"
}
demonstrateError("Named Function", testFunction)
demonstrateError("Anonymous Function", () => "anonymous")

// Symbol
demonstrateError("Symbol with description", Symbol("test symbol"))
demonstrateError("Symbol without description", Symbol())

// BigInt
demonstrateError("BigInt", BigInt(9007199254740991))

// Array
demonstrateError("Array", [1, 2, 3, "error"])

// Complex nested object
demonstrateError("Complex Object", {
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
