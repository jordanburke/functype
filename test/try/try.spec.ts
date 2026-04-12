import { describe, expect, it } from "vitest"

import { Try } from "@/try"

describe("Try", () => {
  describe("Try.of()", () => {
    it("should wrap a successful operation", () => {
      const myTry = Try(() => 1 + 1)
      expect(myTry.isSuccess()).toBe(true)
      expect(myTry.isFailure()).toBe(false)
    })

    it("should wrap a failed operation", () => {
      const myTry = Try(() => {
        throw new Error("Something went wrong")
      })
      expect(myTry.isSuccess()).toBe(false)
      expect(myTry.isFailure()).toBe(true)
    })
  })

  describe("getOrElse()", () => {
    it("should return the value on success", () => {
      const myTry = Try(() => 1 + 1)
      expect(myTry.orElse(0)).toBe(2)
    })

    it("should return the default value on failure", () => {
      const myTry = Try<number>(() => {
        throw new Error("Something went wrong")
      })
      expect(myTry.orElse(0)).toBe(0)
    })
  })

  describe("or()", () => {
    it("should return itself if successful", () => {
      const myTry = Try(() => 1 + 1)
      const alternative = Try(() => 2 + 2)
      expect(myTry.or(alternative).orElse(0)).toBe(2)
    })

    it("should return the alternative if failed", () => {
      const myTry = Try<number>(() => {
        throw new Error("Something went wrong")
      })
      const alternative = Try(() => 2 + 2)
      expect(myTry.or(alternative).orElse(0)).toBe(4)
    })
  })

  describe("toEither()", () => {
    it("should convert to Right on success", () => {
      const myTry = Try(() => 1 + 1)
      const either = myTry.toEither("error")
      expect(either.isRight()).toBe(true)
    })

    it("should convert to Left on failure", () => {
      const myTry = Try(() => {
        throw new Error("Something went wrong")
      })
      const either = myTry.toEither("error")
      expect(either.isLeft()).toBe(true)
    })
  })

  describe("get()", () => {
    it("should return the value on success", () => {
      const myTry = Try(() => 1 + 1)
      expect(myTry.orThrow()).toBe(2)
    })

    it("should throw the error on failure", () => {
      const errorMessage = "Something went wrong"
      const myTry = Try(() => {
        throw new Error(errorMessage)
      })
      expect(() => myTry.orThrow()).toThrow(errorMessage)
    })
  })

  describe("orThrow()", () => {
    it("should return the value on success", () => {
      const myTry = Try(() => 1 + 1)
      expect(myTry.orThrow(new Error("New Error"))).toBe(2)
    })

    it("should throw the error on failure", () => {
      const errorMessage = "New Error"
      const myTry = Try(() => {
        throw new Error(errorMessage)
      })
      expect(() => myTry.orThrow(new Error(errorMessage))).toThrow(errorMessage)
    })
  })

  describe("Try.success()", () => {
    it("should create a Success directly", () => {
      const result = Try.success(42)
      expect(result.isSuccess()).toBe(true)
      expect(result.orElse(0)).toBe(42)
    })

    it("should preserve the type parameter", () => {
      const result = Try.success<string>("hello")
      expect(result.orElse("default")).toBe("hello")
    })
  })

  describe("Try.failure()", () => {
    it("should create a Failure from an Error", () => {
      const result = Try.failure<number>(new Error("boom"))
      expect(result.isFailure()).toBe(true)
      expect(result.orElse(0)).toBe(0)
    })

    it("should create a Failure from a string", () => {
      const result = Try.failure<number>("boom")
      expect(result.isFailure()).toBe(true)
      if (result.isFailure()) {
        expect(result.error.message).toBe("boom")
      }
    })

    it("should allow typed Failure without throw workaround", () => {
      const result: Try<string> = Try.failure("something went wrong")
      expect(result.isFailure()).toBe(true)
      expect(result.orElse("fallback")).toBe("fallback")
    })
  })

  describe("Try.fromPromise()", () => {
    it("should create Success from resolved promise", async () => {
      const result = await Try.fromPromise(Promise.resolve(42))
      expect(result.isSuccess()).toBe(true)
      expect(result.orElse(0)).toBe(42)
    })

    it("should create Failure from rejected promise", async () => {
      const result = await Try.fromPromise<number>(Promise.reject(new Error("async error")))
      expect(result.isFailure()).toBe(true)
      expect(result.orElse(0)).toBe(0)
    })

    it("should wrap non-Error rejections", async () => {
      const result = await Try.fromPromise<number>(Promise.reject("string error"))
      expect(result.isFailure()).toBe(true)
      if (result.isFailure()) {
        expect(result.error.message).toBe("string error")
      }
    })
  })

  describe("recover()", () => {
    it("should not change a Success", () => {
      const result = Try.success(42).recover(() => 0)
      expect(result.orElse(-1)).toBe(42)
    })

    it("should recover a Failure with a value", () => {
      const result = Try.failure<number>("boom").recover((err) => err.message.length)
      expect(result.isSuccess()).toBe(true)
      expect(result.orElse(-1)).toBe(4)
    })

    it("should produce Failure if recovery function throws", () => {
      const result = Try.failure<number>("boom").recover(() => {
        throw new Error("recovery failed")
      })
      expect(result.isFailure()).toBe(true)
    })
  })

  describe("recoverWith()", () => {
    it("should not change a Success", () => {
      const result = Try.success(42).recoverWith(() => Try.success(0))
      expect(result.orElse(-1)).toBe(42)
    })

    it("should recover a Failure with another Try", () => {
      const result = Try.failure<number>("boom").recoverWith(() => Try.success(99))
      expect(result.isSuccess()).toBe(true)
      expect(result.orElse(-1)).toBe(99)
    })

    it("should allow recovery to Failure", () => {
      const result = Try.failure<number>("boom").recoverWith(() => Try.failure("still broken"))
      expect(result.isFailure()).toBe(true)
    })

    it("should catch exceptions in recovery function", () => {
      const result = Try.failure<number>("boom").recoverWith(() => {
        throw new Error("recovery exploded")
      })
      expect(result.isFailure()).toBe(true)
      if (result.isFailure()) {
        expect(result.error.message).toBe("recovery exploded")
      }
    })
  })

  describe("foldAsync", () => {
    it("awaits an async onSuccess", async () => {
      const t = Try(() => 21)
      const result = await t.foldAsync(
        (_e) => 0,
        async (v) => v * 2,
      )
      expect(result).toBe(42)
    })

    it("awaits an async onFailure", async () => {
      const t = Try<number>(() => {
        throw new Error("nope")
      })
      const result = await t.foldAsync(
        async (e) => e.message,
        (_v) => "ok",
      )
      expect(result).toBe("nope")
    })
  })
})
