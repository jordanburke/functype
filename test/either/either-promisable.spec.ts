import { describe, expect, it } from "vitest"
import { Right, Left } from "@/either/Either"

describe("Either Promisable", () => {
  describe("Right.toPromise()", () => {
    it("should resolve with the Right value", async () => {
      const right = Right<string, number>(42)
      const promise = right.toPromise()

      expect(promise).toBeInstanceOf(Promise)
      await expect(promise).resolves.toBe(42)
    })

    it("should work with complex types", async () => {
      const data = { id: 1, name: "test", values: [1, 2, 3] }
      const right = Right<Error, typeof data>(data)
      const promise = right.toPromise()

      await expect(promise).resolves.toEqual(data)
    })

    it("should work with string values", async () => {
      const right = Right<Error, string>("success")
      const promise = right.toPromise()

      await expect(promise).resolves.toBe("success")
    })
  })

  describe("Left.toPromise()", () => {
    it("should reject with the Left value", async () => {
      const left = Left<string, number>("error message")
      const promise = left.toPromise()

      expect(promise).toBeInstanceOf(Promise)
      await expect(promise).rejects.toBe("error message")
    })

    it("should reject with Error objects", async () => {
      const error = new Error("Something went wrong")
      const left = Left<Error, string>(error)
      const promise = left.toPromise()

      await expect(promise).rejects.toBe(error)
    })

    it("should reject with custom error types", async () => {
      type CustomError = { code: number; message: string }
      const customError: CustomError = { code: 404, message: "Not found" }
      const left = Left<CustomError, string>(customError)
      const promise = left.toPromise()

      await expect(promise).rejects.toEqual(customError)
    })
  })

  describe("Integration with async/await", () => {
    it("should work seamlessly with async/await for Right", async () => {
      const right = Right<string, number>(100)
      const result = await right.toPromise()

      expect(result).toBe(100)
    })

    it("should work with try/catch for Left", async () => {
      const left = Left<string, number>("failed")

      try {
        await left.toPromise()
        expect.fail("Should have thrown")
      } catch (error) {
        expect(error).toBe("failed")
      }
    })
  })

  describe("Chaining with Promise methods", () => {
    it("should chain with .then() for Right", async () => {
      const right = Right<string, number>(10)
      const result = await right.toPromise().then((x) => x * 2)

      expect(result).toBe(20)
    })

    it("should chain with .catch() for Left", async () => {
      const left = Left<string, number>("error")
      const result = await left.toPromise().catch((err) => `Caught: ${err}`)

      expect(result).toBe("Caught: error")
    })

    it("should work with Promise.all for multiple Rights", async () => {
      const rights = [Right<string, number>(1), Right<string, number>(2), Right<string, number>(3)]
      const promises = rights.map((r) => r.toPromise())
      const results = await Promise.all(promises)

      expect(results).toEqual([1, 2, 3])
    })
  })

  describe("Type safety", () => {
    it("should preserve type information", async () => {
      const right = Right<Error, { value: number }>({ value: 42 })
      const promise: Promise<{ value: number }> = right.toPromise()
      const result = await promise

      expect(result.value).toBe(42)
    })
  })
})
