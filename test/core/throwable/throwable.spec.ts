import { describe, expect, it } from "vitest"

import { Throwable } from "@/core"

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

    expect(error.message).toBe("An unknown error occurred")
    expect(error.stack).toBeDefined()
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
})
