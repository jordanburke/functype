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
      expect(either.value).toBe(2)
    })

    it("should convert to Left with the eager value on failure", () => {
      const myTry = Try<number>(() => {
        throw new Error("yaml: bad colon")
      })
      const either = myTry.toEither("parse error")
      expect(either.isLeft()).toBe(true)
      expect(either.value).toBe("parse error")
    })

    it("should convert to Left using the builder on failure", () => {
      const myTry = Try<number>(() => {
        throw new Error("yaml: bad colon")
      })
      const either = myTry.toEither((e) => `parse error: ${e.message}`)
      expect(either.isLeft()).toBe(true)
      expect(either.value).toBe("parse error: yaml: bad colon")
    })

    it("should not invoke the builder on success", () => {
      const calls: Error[] = []
      const myTry = Try(() => 42)
      const either = myTry.toEither((e) => {
        calls.push(e)
        return "unreachable"
      })
      expect(either.isRight()).toBe(true)
      expect(calls).toEqual([])
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

  describe("Try.sequence", () => {
    it("returns Success with array when all elements are Success", () => {
      const result = Try.sequence([Try.success(1), Try.success(2), Try.success(3)])
      expect(result.isSuccess()).toBe(true)
      expect(
        result.fold(
          () => [] as number[],
          (vs) => vs,
        ),
      ).toEqual([1, 2, 3])
    })

    it("returns first Failure with original error", () => {
      const err = new Error("boom")
      const result = Try.sequence<number>([Try.success(1), Try.failure(err), Try.success(3)])
      expect(result.isFailure()).toBe(true)
      expect(result.error).toBe(err)
    })

    it("returns Success with empty array for empty input", () => {
      const result = Try.sequence<number>([])
      expect(result.isSuccess()).toBe(true)
      expect(
        result.fold(
          () => [] as number[],
          (vs) => vs,
        ),
      ).toEqual([])
    })
  })

  describe("Try.traverse", () => {
    it("maps and sequences when all results are Success", () => {
      const result = Try.traverse([1, 2, 3], (x) => Try.success(x * 2))
      expect(result.isSuccess()).toBe(true)
      expect(
        result.fold(
          () => [] as number[],
          (vs) => vs,
        ),
      ).toEqual([2, 4, 6])
    })

    it("short-circuits on first Failure", () => {
      const calls: number[] = []
      const err = new Error("stop at 2")
      const result = Try.traverse([1, 2, 3, 4], (x) => {
        calls.push(x)
        return x === 2 ? Try.failure<number>(err) : Try.success(x * 2)
      })
      expect(result.isFailure()).toBe(true)
      expect(result.error).toBe(err)
      expect(calls).toEqual([1, 2])
    })

    it("captures synchronous throws from f as Failure", () => {
      const result = Try.traverse([1, 2, 3], (x) => {
        if (x === 2) throw new Error("thrown")
        return Try.success(x * 2)
      })
      expect(result.isFailure()).toBe(true)
      expect(result.error?.message).toBe("thrown")
    })

    it("passes the index to the mapping function", () => {
      const indices: number[] = []
      Try.traverse(["a", "b", "c"], (_v, i) => {
        indices.push(i)
        return Try.success(i)
      })
      expect(indices).toEqual([0, 1, 2])
    })
  })
})
