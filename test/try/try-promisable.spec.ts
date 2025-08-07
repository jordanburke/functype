import { describe, expect, it } from "vitest"
import { Try } from "@/try/Try"

describe("Try Promisable", () => {
  describe("Success.toPromise()", () => {
    it("should resolve with the Success value", async () => {
      const success = Try(() => 42)
      const promise = success.toPromise()

      expect(promise).toBeInstanceOf(Promise)
      await expect(promise).resolves.toBe(42)
    })

    it("should work with complex types", async () => {
      const data = { result: "success", count: 5 }
      const success = Try(() => data)
      const promise = success.toPromise()

      await expect(promise).resolves.toEqual(data)
    })
  })

  describe("Failure.toPromise()", () => {
    it("should reject with the error", async () => {
      const error = new Error("Something went wrong")
      const failure = Try(() => {
        throw error
      })
      const promise = failure.toPromise()

      expect(promise).toBeInstanceOf(Promise)
      await expect(promise).rejects.toBe(error)
    })

    it("should work with try/catch", async () => {
      const customError = new Error("Custom error message")
      const failure = Try(() => {
        throw customError
      })

      try {
        await failure.toPromise()
        expect.fail("Should have thrown")
      } catch (error) {
        expect(error).toBe(customError)
        expect((error as Error).message).toBe("Custom error message")
      }
    })

    it("should reject with different error types", async () => {
      const failure = Try(() => {
        throw new TypeError("Type error")
      })

      await expect(failure.toPromise()).rejects.toThrow("Type error")
    })
  })
})
