import { describe, expect, it } from "vitest"

import { Left, Right } from "@/either"

describe("Either standard pipe", () => {
  it("should pipe Right value through function", () => {
    const right = Right<string, number>(42)
    const result = right.pipe((value) => {
      if (typeof value === "number") {
        return value * 2
      }
      return 0
    })
    expect(result).toBe(84)
  })

  it("should pipe Left value through function", () => {
    const left = Left<string, number>("error")
    const result = left.pipe((value) => {
      if (typeof value === "string") {
        return value.toUpperCase()
      }
      return ""
    })
    expect(result).toBe("ERROR")
  })

  it("should pipe Either values with type guards", () => {
    const right = Right<Error, string>("hello")
    const left = Left<Error, string>(new Error("Something went wrong"))

    // Function using type guards
    const processEither = (value: Error | string) => {
      if (value instanceof Error) {
        return `Error: ${value.message}`
      } else {
        return `Success: ${value.toUpperCase()}`
      }
    }

    const rightResult = right.pipe(processEither)
    expect(rightResult).toBe("Success: HELLO")

    const leftResult = left.pipe(processEither)
    expect(leftResult).toBe("Error: Something went wrong")
  })

  it("should allow common operations on both types", () => {
    const right = Right<number, number>(42)
    const left = Left<number, number>(24)

    // A function that works on both Left and Right values
    const calculateSomething = (value: number) => value * 2

    const rightResult = right.pipe(calculateSomething)
    expect(rightResult).toBe(84)

    const leftResult = left.pipe(calculateSomething)
    expect(leftResult).toBe(48)
  })

  it("works with JSON serializable objects", () => {
    type User = { name: string; id: number }
    type ApiError = { code: number; message: string }

    const successResponse = Right<ApiError, User>({ name: "Alice", id: 1 })
    const errorResponse = Left<ApiError, User>({ code: 404, message: "User not found" })

    const serialize = (value: ApiError | User) => JSON.stringify(value)

    const successJson = successResponse.pipe(serialize)
    expect(successJson).toBe('{"name":"Alice","id":1}')

    const errorJson = errorResponse.pipe(serialize)
    expect(errorJson).toBe('{"code":404,"message":"User not found"}')
  })
})
