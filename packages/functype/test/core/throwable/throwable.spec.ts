import { describe, expect, it } from "vitest"

import { Throwable } from "@/core"
import { mergeObjects } from "@/util"

describe("Throwable", () => {
  it("should create a Throwable from a string message", () => {
    const error = Throwable.apply("Test error")

    expect(error).toBeInstanceOf(Error)
    expect(error.message).toBe("Test error")
    expect(error.name).toBe(Throwable.name)
    expect(error._tag).toBe(Throwable.name)
    expect(error.stack).toBeDefined()
    expect(error.stack).toContain("throwable.spec.ts") // Checks if stack trace includes this file
  })

  it("should create a Throwable from an Error instance", () => {
    const originalError = new Error("Original error")
    const error = Throwable.apply(originalError)

    expect(error).toBeInstanceOf(Error)
    expect(error.message).toBe("Original error")
    expect(error.name).toBe(Throwable.name)
    expect(error._tag).toBe(Throwable.name)
    expect(error.stack).toBe(originalError.stack)
  })

  it("should create a Throwable with additional data", () => {
    const data = { details: "Additional info" }
    const error = Throwable.apply("Test error", data)

    expect(error.data).toBe(data)
    expect(error.data).toEqual({ details: "Additional info" })
  })

  it("should handle undefined error source with default message", () => {
    const error = Throwable.apply(undefined)

    expect(error.message).toBe("Undefined error: undefined")
    expect(error.stack).toBeDefined()
    expect(error.data).toEqual({
      errorType: "undefined",
      errorValue: "undefined",
      originalError: undefined,
    })
  })

  it("should handle null error source", () => {
    const error = Throwable.apply(null)

    expect(error.message).toBe("Object error: null")
    expect(error.stack).toBeDefined()
    expect(error.data).toEqual({
      errorType: "object",
      errorValue: "null",
      originalError: null,
    })
  })

  it("should handle number error source", () => {
    const error = Throwable.apply(42)

    expect(error.message).toBe("Number error: 42")
    expect(error.stack).toBeDefined()
    expect(error.data).toEqual({
      errorType: "number",
      errorValue: 42,
      originalError: 42,
    })
  })

  it("should handle NaN error source", () => {
    const error = Throwable.apply(NaN)

    expect(error.message).toBe("Number error: NaN")
    expect(error.stack).toBeDefined()
    expect(error.data).toEqual({
      errorType: "number",
      errorValue: NaN,
      originalError: NaN,
    })
  })

  it("should handle Infinity error source", () => {
    const error = Throwable.apply(Infinity)

    expect(error.message).toBe("Number error: Infinity")
    expect(error.stack).toBeDefined()
    expect(error.data).toEqual({
      errorType: "number",
      errorValue: Infinity,
      originalError: Infinity,
    })
  })

  it("should handle negative Infinity error source", () => {
    const error = Throwable.apply(-Infinity)

    expect(error.message).toBe("Number error: -Infinity")
    expect(error.stack).toBeDefined()
    expect(error.data).toEqual({
      errorType: "number",
      errorValue: -Infinity,
      originalError: -Infinity,
    })
  })

  it("should handle boolean error source - true", () => {
    const error = Throwable.apply(true)

    expect(error.message).toBe("Boolean error: true")
    expect(error.stack).toBeDefined()
    expect(error.data).toEqual({
      errorType: "boolean",
      errorValue: true,
      originalError: true,
    })
  })

  it("should handle boolean error source - false", () => {
    const error = Throwable.apply(false)

    expect(error.message).toBe("Boolean error: false")
    expect(error.stack).toBeDefined()
    expect(error.data).toEqual({
      errorType: "boolean",
      errorValue: false,
      originalError: false,
    })
  })

  it("should handle bigint error source", () => {
    const bigIntValue = BigInt(9007199254740991)
    const error = Throwable.apply(bigIntValue)

    expect(error.message).toBe("BigInt error: 9007199254740991n")
    expect(error.stack).toBeDefined()
    expect(error.data).toEqual({
      errorType: "bigint",
      errorValue: String(bigIntValue),
      originalError: bigIntValue,
    })
  })

  it("should handle symbol error source with description", () => {
    const symbolValue = Symbol("test symbol")
    const error = Throwable.apply(symbolValue)

    expect(error.message).toBe("Symbol error: Symbol(test symbol)")
    expect(error.stack).toBeDefined()
    expect(error.data).toEqual({
      errorType: "symbol",
      symbolDescription: "test symbol",
      originalError: symbolValue,
    })
  })

  it("should handle symbol error source without description", () => {
    const symbolValue = Symbol()
    const error = Throwable.apply(symbolValue)

    expect(error.message).toBe("Symbol error: Symbol(unnamed symbol)")
    expect(error.stack).toBeDefined()
    expect(error.data).toEqual({
      errorType: "symbol",
      symbolDescription: "unnamed symbol",
      originalError: symbolValue,
    })
  })

  it("should handle function error source", () => {
    function testFunction() {
      return "test"
    }
    const error = Throwable.apply(testFunction)

    expect(error.message).toBe("Function error: testFunction")
    expect(error.stack).toBeDefined()
    expect(error.data).toEqual({
      functionType: "function",
      functionName: "testFunction",
      functionString: expect.stringContaining("function testFunction"),
    })
  })

  it("should handle anonymous function error source", () => {
    const anonFunction = () => "test"
    const error = Throwable.apply(anonFunction)

    expect(error.message).toBe("Function error: anonFunction")
    expect(error.stack).toBeDefined()
    expect(error.data).toEqual({
      functionType: "function",
      functionName: "anonFunction",
      functionString: expect.stringContaining("=>"),
    })
  })

  it("should handle object without message or error properties", () => {
    const obj = { id: 123, status: "failed" }
    const error = Throwable.apply(obj)

    expect(error.message).toContain("Object error:")
    expect(error.message).toContain("id")
    expect(error.message).toContain("123")
    expect(error.message).toContain("status")
    expect(error.message).toContain("failed")
    expect(error.stack).toBeDefined()
    expect(error.data).toBe(obj)
  })

  it("should preserve stack trace line numbers", () => {
    function throwError() {
      throw new Error("Test error")
    }

    let originalStack: string | undefined
    try {
      throwError()
    } catch (e) {
      if (e instanceof Error) {
        originalStack = e.stack
        const throwable = Throwable.apply(e)
        expect(throwable.stack).toBe(originalStack)

        // Check if line numbers are present in stack trace
        const stackLines = throwable.stack?.split("\n") ?? []
        const lineWithNumber = stackLines.find((line) => line.includes("throwError"))
        expect(lineWithNumber).toMatch(/:\d+:\d+/)
      }
    }
  })

  it("should handle nested errors", () => {
    const innerError = new Error("Inner error")
    const outerError = new Error("Outer error")
    outerError.cause = innerError

    const throwable = Throwable.apply(outerError)
    expect(throwable.message).toBe("Outer error")
    expect(throwable.cause).toBe(innerError)
  })

  it("should handle Error with custom properties", () => {
    class CustomError extends Error {
      constructor(
        message: string,
        public code: number,
      ) {
        super(message)
        this.name = "CustomError"
      }
    }

    const customError = new CustomError("Custom error", 500)
    const throwable = Throwable.apply(customError)

    expect(throwable.message).toBe("Custom error")
    expect(throwable.name).toBe(Throwable.name) // Should still use Throwable name
  })

  it("should maintain immutability of properties", () => {
    const error = Throwable.apply("Test error")

    expect(() => {
      // @ts-expect-error - Testing that assignment to read-only property throws at runtime
      ;(error as never)._tag = "NewTag"
    }).toThrow()

    expect(() => {
      // @ts-expect-error - Testing that assignment to read-only property throws at runtime
      ;(error as never).data = { new: "data" }
    }).toThrow()
  })

  it("should handle async stack traces", async () => {
    async function asyncThrowError() {
      throw new Error("Async error")
    }

    try {
      await asyncThrowError()
    } catch (e) {
      if (e instanceof Error) {
        const throwable = Throwable.apply(e)
        expect(throwable.stack).toBeDefined()
        expect(throwable.stack).toContain("asyncThrowError")

        // Verify async stack trace contains line numbers
        const stackLines = throwable.stack?.split("\n") ?? []
        const asyncLine = stackLines.find((line) => line.includes("asyncThrowError"))
        expect(asyncLine).toMatch(/:\d+:\d+/)
      }
    }
  })

  it("should preserve custom properties from Error instances", () => {
    const originalError = new Error("Original error")
    // Add custom properties to the error
    const customError = mergeObjects(originalError, {
      code: "E123",
      details: "Some details",
      hint: "A helpful hint",
    })

    const throwable = Throwable.apply(customError)

    expect(throwable.message).toBe("Original error")
    expect(throwable.name).toBe(Throwable.name)
    expect(throwable._tag).toBe(Throwable.name)
    // Check that custom properties are preserved
    expect((throwable as Record<string, unknown>).code).toBe("E123")
    expect((throwable as Record<string, unknown>).details).toBe("Some details")
    expect((throwable as Record<string, unknown>).hint).toBe("A helpful hint")
  })

  it("should handle plain object errors (like from Supabase)", () => {
    // Simulate a Supabase-like error object
    const supabaseError = {
      code: "42804",
      details: null,
      hint: "You will need to rewrite or cast the expression.",
      message: 'column "role" is of type tenant_user_role but expression is of type text',
    }

    const throwable = Throwable.apply(supabaseError)

    expect(throwable).toBeInstanceOf(Error)
    expect(throwable.message).toBe('column "role" is of type tenant_user_role but expression is of type text')
    expect(throwable.name).toBe(Throwable.name)
    expect(throwable._tag).toBe(Throwable.name)
    // Check that all properties from the original object are preserved
    expect((throwable as Record<string, unknown>).code).toBe("42804")
    expect((throwable as Record<string, unknown>).details).toBeNull()
    expect((throwable as Record<string, unknown>).hint).toBe("You will need to rewrite or cast the expression.")
  })

  it("should handle object errors without a message property", () => {
    const errorObject = {
      code: "UNKNOWN",
      error: "Something went wrong", // Using 'error' instead of 'message'
      status: 500,
    }

    const throwable = Throwable.apply(errorObject)

    expect(throwable).toBeInstanceOf(Error)
    expect(throwable.message).toBe("Something went wrong") // Should use the 'error' property as message
    // Check that all properties from the original object are preserved
    expect((throwable as Record<string, unknown>).code).toBe("UNKNOWN")
    expect((throwable as Record<string, unknown>).error).toBe("Something went wrong")
    expect((throwable as Record<string, unknown>).status).toBe(500)
  })

  it("should handle nested object properties", () => {
    const complexError = {
      message: "Complex error",
      details: {
        field: "username",
        constraint: "unique",
        nested: {
          deeper: "value",
        },
      },
      errors: [
        { path: "field1", message: "Error 1" },
        { path: "field2", message: "Error 2" },
      ],
    }

    const throwable = Throwable.apply(complexError)

    expect(throwable.message).toBe("Complex error")
    // Check that complex nested properties are preserved
    expect((throwable as Record<string, unknown>).details).toEqual({
      field: "username",
      constraint: "unique",
      nested: {
        deeper: "value",
      },
    })
    expect((throwable as Record<string, unknown>).errors).toEqual([
      { path: "field1", message: "Error 1" },
      { path: "field2", message: "Error 2" },
    ])
  })

  it("should handle various custom error classes", () => {
    // Define a variety of custom error classes
    class DatabaseError extends Error {
      constructor(
        message: string,
        public readonly code: string,
        public readonly table: string,
      ) {
        super(message)
        this.name = "DatabaseError"
      }
    }

    class ValidationError extends Error {
      constructor(
        message: string,
        public readonly fields: string[],
      ) {
        super(message)
        this.name = "ValidationError"
      }
    }

    const dbError = new DatabaseError("DB connection failed", "CONNECTION_ERROR", "users")
    const throwable1 = Throwable.apply(dbError)

    expect(throwable1.message).toBe("DB connection failed")
    expect((throwable1 as Record<string, unknown>).code).toBe("CONNECTION_ERROR")
    expect((throwable1 as Record<string, unknown>).table).toBe("users")

    const validationError = new ValidationError("Invalid input", ["email", "password"])
    const throwable2 = Throwable.apply(validationError)

    expect(throwable2.message).toBe("Invalid input")
    expect((throwable2 as Record<string, unknown>).fields).toEqual(["email", "password"])
  })
})
