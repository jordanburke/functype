import { describe, expect, it } from "vitest"

import { Either, Left, Right } from "@/either"

describe("Either pipeEither", () => {
  it("should pipe Right value through function", () => {
    const right = Right<string, number>(42)
    const result = right.pipeEither<number>(
      (_error) => 0, // Never called for Right
      (value) => value * 2,
    )
    expect(result).toBe(84)
  })

  it("should pipe Left value through function", () => {
    const left = Left<string, number>("error")
    const result = left.pipeEither(
      (error) => error.toUpperCase(),
      (value) => value.toString(),
    )
    expect(result).toBe("ERROR")
  })

  it("should pipe Right through complex functions", () => {
    const right = Right<string, string>("hello")
    const result = right.pipeEither(
      (error) => error,
      (value) => value.toUpperCase().split("").reverse().join(""),
    )
    expect(result).toBe("OLLEH")
  })

  it("should pipe Left through complex functions", () => {
    type ErrorObj = { code: number; message: string }
    const left = Left<ErrorObj, number>({
      code: 404,
      message: "not found",
    })

    type ResponseObj = {
      statusCode: number
      errorMessage: string
      timestamp: string
    }

    const result = left.pipeEither<ResponseObj>(
      (error) => ({
        statusCode: error.code,
        errorMessage: error.message,
        timestamp: "2025-05-03",
      }),
      (_value) => ({
        statusCode: 200,
        errorMessage: "",
        timestamp: "2025-05-03",
      }),
    )

    expect(result).toEqual({
      statusCode: 404,
      errorMessage: "not found",
      timestamp: "2025-05-03",
    })
  })

  it("should allow transforming Either values to different types", () => {
    const right = Right<Error, number>(42)
    const left = Left<Error, number>(new Error("Something went wrong"))

    // Transform to same result type
    const rightResult = right.pipeEither(
      (error) => `Error: ${error.message}`,
      (value) => `Value: ${value}`,
    )
    expect(rightResult).toBe("Value: 42")

    const leftResult = left.pipeEither(
      (error) => `Error: ${error.message}`,
      (value) => `Value: ${value}`,
    )
    expect(leftResult).toBe("Error: Something went wrong")
  })

  it("should work with Either helper functions", () => {
    const eitherFromNullable = Either.fromNullable<string, number>(42, "error")
    const result = eitherFromNullable.pipeEither(
      (error) => error.toUpperCase(),
      (value) => value.toString(),
    )
    expect(result).toBe("42")

    const errorCase = Either.fromNullable<string, number>(null, "error")
    const errorResult = errorCase.pipeEither(
      (error) => error.toUpperCase(),
      (value) => value.toString(),
    )
    expect(errorResult).toBe("ERROR")
  })

  it("should work like fold but with type flexibility", () => {
    const right = Right<string, number>(42)

    // fold requires both functions to return the same type
    const foldResult = right.fold(
      (error) => error.length,
      (value) => value,
    )
    expect(foldResult).toBe(42)

    // pipeEither works the same way
    const pipeResult = right.pipeEither(
      (error) => error.length,
      (value) => value,
    )
    expect(pipeResult).toBe(42)
  })
})
