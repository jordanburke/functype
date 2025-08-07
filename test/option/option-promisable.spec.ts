import { describe, expect, it } from "vitest"
import { Some, None } from "@/option/Option"

describe("Option Promisable", () => {
  describe("Some.toPromise()", () => {
    it("should resolve with the Some value", async () => {
      const some = Some(42)
      const promise = some.toPromise()
      
      expect(promise).toBeInstanceOf(Promise)
      await expect(promise).resolves.toBe(42)
    })

    it("should work with complex types", async () => {
      const data = { id: 1, name: "test" }
      const some = Some(data)
      const promise = some.toPromise()
      
      await expect(promise).resolves.toEqual(data)
    })
  })

  describe("None.toPromise()", () => {
    it("should reject with error", async () => {
      const none = None<number>()
      const promise = none.toPromise()
      
      expect(promise).toBeInstanceOf(Promise)
      await expect(promise).rejects.toThrow("Cannot convert None to Promise")
    })

    it("should work with try/catch", async () => {
      const none = None<string>()
      
      try {
        await none.toPromise()
        expect.fail("Should have thrown")
      } catch (error) {
        expect(error).toBeInstanceOf(Error)
        expect((error as Error).message).toBe("Cannot convert None to Promise")
      }
    })
  })
})