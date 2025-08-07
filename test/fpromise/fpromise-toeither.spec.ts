import { describe, expect, it } from "vitest"
import { FPromise } from "@/fpromise/FPromise"

describe("FPromise.toEither", () => {
  it("should return Promise<Either<E, T>> for successful values", async () => {
    const fpromise = FPromise.resolve(42)
    const either = await fpromise.toEither()

    expect(either.isRight()).toBe(true)
    expect(either.isLeft()).toBe(false)
    expect(either.get()).toBe(42)
  })

  it("should handle errors properly", async () => {
    const fpromise = FPromise.reject<number, string>("error message")
    const either = await fpromise.toEither()

    expect(either.isLeft()).toBe(true)
    expect(either.isRight()).toBe(false)

    const folded = either.fold(
      (err) => err,
      (val) => `success: ${val}`,
    )
    expect(folded).toBe("error message")
  })

  it("should work with complex error types", async () => {
    type CustomError = { code: number; message: string }
    const error: CustomError = { code: 404, message: "Not found" }

    const fpromise = FPromise.reject<string, CustomError>(error)
    const either = await fpromise.toEither()

    expect(either.isLeft()).toBe(true)
    const result = either.fold(
      (err) => err,
      (val) => null,
    )
    expect(result).toEqual({ code: 404, message: "Not found" })
  })

  it("should preserve the async nature of FPromise while returning Either", async () => {
    const fpromise = FPromise.resolve(42)
      .map((x) => x * 2)
      .map((x) => x + 1)

    const either = await fpromise.toEither()

    expect(either.isRight()).toBe(true)
    expect(either.get()).toBe(85)
  })

  it("should work with async operations", async () => {
    const promise = (async () => {
      await new Promise((resolve) => setTimeout(resolve, 10))
      return "async result"
    })()

    const fpromise = FPromise.from(promise)
    const either = await fpromise.toEither()

    expect(either.isRight()).toBe(true)
    expect(either.get()).toBe("async result")
  })
})
