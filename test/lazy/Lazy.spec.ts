import { describe, expect, it, vi } from "vitest"

import { Either, Left, Right } from "@/either"
import { Lazy } from "@/lazy"
import { None, Option, Some } from "@/option"
import { Try } from "@/try"

describe("Lazy", () => {
  describe("construction", () => {
    it("should create a lazy value with constructor", () => {
      const lazy = Lazy(() => 42)
      expect(lazy._tag).toBe("Lazy")
      expect(lazy.isEvaluated).toBe(false)
    })

    it("should create a lazy value with Lazy.of", () => {
      const lazy = Lazy.of(() => 42)
      expect(lazy._tag).toBe("Lazy")
      expect(lazy.isEvaluated).toBe(false)
    })

    it("should create a lazy value from immediate value", () => {
      const lazy = Lazy.fromValue(42)
      expect(lazy._tag).toBe("Lazy")
      expect(lazy.orThrow()).toBe(42)
    })

    it("should create a lazy value that throws", () => {
      const error = new Error("boom")
      const lazy = Lazy.fail<number>(error)
      expect(() => lazy.orThrow()).toThrow(error)
    })
  })

  describe("evaluation", () => {
    it("should defer computation until get is called", () => {
      const spy = vi.fn(() => 42)
      const lazy = Lazy(spy)

      expect(spy).not.toHaveBeenCalled()
      expect(lazy.isEvaluated).toBe(false)

      const result = lazy.orThrow()

      expect(result).toBe(42)
      expect(spy).toHaveBeenCalledTimes(1)
      expect(lazy.isEvaluated).toBe(true)
    })

    it("should memoize the result", () => {
      const spy = vi.fn(() => 42)
      const lazy = Lazy(spy)

      const result1 = lazy.orThrow()
      const result2 = lazy.orThrow()
      const result3 = lazy.orThrow()

      expect(result1).toBe(42)
      expect(result2).toBe(42)
      expect(result3).toBe(42)
      expect(spy).toHaveBeenCalledTimes(1)
    })

    it("should memoize errors", () => {
      const error = new Error("boom")
      const spy = vi.fn(() => {
        throw error
      })
      const lazy = Lazy(spy)

      expect(() => lazy.orThrow()).toThrow(error)
      expect(() => lazy.orThrow()).toThrow(error)
      expect(() => lazy.orThrow()).toThrow(error)
      expect(spy).toHaveBeenCalledTimes(1)
      expect(lazy.isEvaluated).toBe(true)
    })
  })

  describe("safe access methods", () => {
    it("should return value with getOrElse when successful", () => {
      const lazy = Lazy(() => 42)
      expect(lazy.orElse(0)).toBe(42)
    })

    it("should return default with getOrElse when computation fails", () => {
      const lazy = Lazy<number>(() => {
        throw new Error("boom")
      })
      expect(lazy.orElse(0)).toBe(0)
    })

    it("should return value with orNull when successful", () => {
      const lazy = Lazy(() => 42)
      expect(lazy.orNull()).toBe(42)
    })

    it("should return null with orNull when computation fails", () => {
      const lazy = Lazy(() => {
        throw new Error("boom")
      })
      expect(lazy.orNull()).toBeNull()
    })

    it("should return value with getOrThrow when successful", () => {
      const lazy = Lazy(() => 42)
      expect(lazy.orThrow(new Error("custom"))).toBe(42)
    })

    it("should throw custom error with getOrThrow when computation fails", () => {
      const customError = new Error("custom")
      const lazy = Lazy(() => {
        throw new Error("boom")
      })
      expect(() => lazy.orThrow(customError)).toThrow(customError)
    })
  })

  describe("map operations", () => {
    it("should map over successful computation", () => {
      const lazy = Lazy(() => 42)
        .map((x) => x * 2)
        .map((x) => x + 1)

      expect(lazy.orThrow()).toBe(85)
    })

    it("should propagate errors through map", () => {
      const error = new Error("boom")
      const lazy = Lazy<number>(() => {
        throw error
      }).map((x) => x * 2)

      expect(() => lazy.orThrow()).toThrow(error)
    })

    it("should handle async map", async () => {
      const lazy = await Lazy(() => 42).mapAsync(async (x) => x * 2)

      expect(lazy.orThrow()).toBe(84)
    })
  })

  describe("flatMap operations", () => {
    it("should chain lazy computations", () => {
      const lazy = Lazy(() => 42)
        .flatMap((x) => Lazy(() => x * 2))
        .flatMap((x) => Lazy(() => x + 1))

      expect(lazy.orThrow()).toBe(85)
    })

    it("should propagate errors through flatMap", () => {
      const error = new Error("boom")
      const lazy = Lazy(() => 42).flatMap((x) =>
        Lazy<number>(() => {
          throw error
        }),
      )

      expect(() => lazy.orThrow()).toThrow(error)
    })

    it("should handle async flatMap", async () => {
      const lazy = await Lazy(() => 42).flatMapAsync(async (x) => Lazy(() => x * 2))

      expect(lazy.orThrow()).toBe(84)
    })
  })

  describe("filter", () => {
    it("should return Some when predicate is satisfied", () => {
      const lazy = Lazy(() => 42).filter((x) => x > 40)
      const option = lazy.orThrow()

      expect(option._tag).toBe("Some")
      expect(option.value).toBe(42)
    })

    it("should return None when predicate is not satisfied", () => {
      const lazy = Lazy(() => 42).filter((x) => x < 40)
      const option = lazy.orThrow()

      expect(option).toEqual(None)
    })
  })

  describe("error recovery", () => {
    it("should recover from error with alternative value", () => {
      const lazy = Lazy<number>(() => {
        throw new Error("boom")
      }).recover((err) => 42)

      expect(lazy.orThrow()).toBe(42)
    })

    it("should not use recovery when computation succeeds", () => {
      const spy = vi.fn()
      const lazy = Lazy(() => 42).recover((err) => {
        spy(err)
        return 0
      })

      expect(lazy.orThrow()).toBe(42)
      expect(spy).not.toHaveBeenCalled()
    })

    it("should recover with another Lazy", () => {
      const lazy = Lazy<number>(() => {
        throw new Error("boom")
      }).recoverWith((err) => Lazy(() => 42))

      expect(lazy.orThrow()).toBe(42)
    })
  })

  describe("conversions", () => {
    describe("toOption", () => {
      it("should return Some for successful computation", () => {
        const lazy = Lazy(() => 42)
        const option = lazy.toOption()
        expect(option._tag).toBe("Some")
        expect(option.value).toBe(42)
      })

      it("should return None for failed computation", () => {
        const lazy = Lazy(() => {
          throw new Error("boom")
        })
        expect(lazy.toOption()).toEqual(None)
      })
    })

    describe("toEither", () => {
      it("should return Right for successful computation", () => {
        const lazy = Lazy(() => 42)
        const either = lazy.toEither()
        expect(either._tag).toBe("Right")
        expect(either.value).toBe(42)
      })

      it("should return Left for failed computation", () => {
        const error = new Error("boom")
        const lazy = Lazy(() => {
          throw error
        })
        const either = lazy.toEither()
        expect(either._tag).toBe("Left")
        expect(either.value).toBe(error)
      })

      it("should map error with toEitherWith", () => {
        const lazy = Lazy(() => {
          throw new Error("boom")
        })
        const either = lazy.toEitherWith((err) => (err as Error).message)
        expect(either._tag).toBe("Left")
        expect(either.value).toBe("boom")
      })
    })

    describe("toTry", () => {
      it("should return Success for successful computation", () => {
        const lazy = Lazy(() => 42)
        const tryValue = lazy.toTry()
        expect(tryValue.isSuccess()).toBe(true)
        expect(tryValue.orThrow()).toBe(42)
      })

      it("should return Failure for failed computation", () => {
        const error = new Error("boom")
        const lazy = Lazy(() => {
          throw error
        })
        const tryValue = lazy.toTry()
        expect(tryValue.isFailure()).toBe(true)
        expect(() => tryValue.orThrow()).toThrow(error)
      })
    })
  })

  describe("from conversions", () => {
    it("should create Lazy from Some Option", () => {
      const option: Option<number> = Some(42)
      const lazy = Lazy.fromOption(option, () => 0)
      expect(lazy.orThrow()).toBe(42)
    })

    it("should create Lazy from None Option", () => {
      const option: Option<number> = None as unknown as Option<number>
      const lazy = Lazy.fromOption(option, () => 0)
      expect(lazy.orThrow()).toBe(0)
    })

    it("should create Lazy from successful Try", () => {
      const tryValue = Try(() => 42)
      const lazy = Lazy.fromTry(tryValue)
      expect(lazy.orThrow()).toBe(42)
    })

    it("should create Lazy from failed Try", () => {
      const error = new Error("boom")
      const tryValue = Try(() => {
        throw error
      })
      const lazy = Lazy.fromTry(tryValue)
      expect(() => lazy.orThrow()).toThrow(error)
    })

    it("should create Lazy from Right Either", () => {
      const either: Either<string, number> = Right(42)
      const lazy = Lazy.fromEither(either)
      expect(lazy.orThrow()).toBe(42)
    })

    it("should create Lazy from Left Either", () => {
      const either: Either<string, number> = Left("error")
      const lazy = Lazy.fromEither(either)
      expect(() => lazy.orThrow()).toThrow("error")
    })
  })

  describe("side effects", () => {
    it("should apply tap function on success", () => {
      const spy = vi.fn()
      const lazy = Lazy(() => 42).tap(spy)

      const result = lazy.orThrow()

      expect(result).toBe(42)
      expect(spy).toHaveBeenCalledWith(42)
    })

    it("should not apply tap function on failure", () => {
      const spy = vi.fn()
      const lazy = Lazy<number>(() => {
        throw new Error("boom")
      }).tap(spy)

      expect(() => lazy.orThrow()).toThrow()
      expect(spy).not.toHaveBeenCalled()
    })

    it("should apply tapError function on failure", () => {
      const spy = vi.fn()
      const error = new Error("boom")
      const lazy = Lazy<number>(() => {
        throw error
      }).tapError(spy)

      expect(() => lazy.orThrow()).toThrow(error)
      expect(spy).toHaveBeenCalledWith(error)
    })

    it("should not apply tapError function on success", () => {
      const spy = vi.fn()
      const lazy = Lazy(() => 42).tapError(spy)

      expect(lazy.orThrow()).toBe(42)
      expect(spy).not.toHaveBeenCalled()
    })
  })

  describe("fold operations", () => {
    it("should fold over successful value", () => {
      const lazy = Lazy(() => 42)
      const result = lazy.fold((x) => x * 2)
      expect(result).toBe(84)
    })

    it("should throw on fold with failed computation", () => {
      const error = new Error("boom")
      const lazy = Lazy<number>(() => {
        throw error
      })
      expect(() => lazy.fold((x) => x * 2)).toThrow(error)
    })

    it("should handle foldWith for success", () => {
      const lazy = Lazy(() => 42)
      const result = lazy.foldWith(
        (err) => -1,
        (value) => value * 2,
      )
      expect(result).toBe(84)
    })

    it("should handle foldWith for failure", () => {
      const lazy = Lazy<number>(() => {
        throw new Error("boom")
      })
      const result = lazy.foldWith(
        (err) => -1,
        (value) => value * 2,
      )
      expect(result).toBe(-1)
    })

    it("should support foldLeft", () => {
      const lazy = Lazy(() => 5)
      const result = lazy.foldLeft(10)((acc, x) => acc + x)
      expect(result).toBe(15)
    })

    it("should support foldRight", () => {
      const lazy = Lazy(() => 5)
      const result = lazy.foldRight(10)((x, acc) => x + acc)
      expect(result).toBe(15)
    })
  })

  describe("pattern matching", () => {
    it("should match Lazy pattern", () => {
      const lazy = Lazy(() => 42)
      const result = lazy.match({
        Lazy: (value) => value * 2,
      })
      expect(result).toBe(84)
    })
  })

  describe("toString", () => {
    it("should show not evaluated for unevaluated lazy", () => {
      const lazy = Lazy(() => 42)
      expect(lazy.toString()).toBe("Lazy(<not evaluated>)")
    })

    it("should show value for evaluated lazy", () => {
      const lazy = Lazy(() => 42)
      lazy.orThrow()
      expect(lazy.toString()).toBe("Lazy(42)")
    })

    it("should show error for failed lazy", () => {
      const lazy = Lazy(() => {
        throw new Error("boom")
      })
      try {
        lazy.orThrow()
      } catch {}
      expect(lazy.toString()).toContain("Lazy(<error:")
      expect(lazy.toString()).toContain("boom")
    })
  })

  describe("toValue", () => {
    it("should return unevaluated state", () => {
      const lazy = Lazy(() => 42)
      expect(lazy.toValue()).toEqual({
        _tag: "Lazy",
        evaluated: false,
      })
    })

    it("should return evaluated state with value", () => {
      const lazy = Lazy(() => 42)
      lazy.orThrow()
      expect(lazy.toValue()).toEqual({
        _tag: "Lazy",
        evaluated: true,
        value: 42,
      })
    })

    it("should return evaluated state without value for errors", () => {
      const lazy = Lazy(() => {
        throw new Error("boom")
      })
      try {
        lazy.orThrow()
      } catch {}
      expect(lazy.toValue()).toEqual({
        _tag: "Lazy",
        evaluated: false,
      })
    })
  })

  describe("serialization", () => {
    it("should serialize unevaluated lazy", () => {
      const lazy = Lazy(() => 42)
      const serialized = lazy.serialize()

      expect(serialized.toJSON()).toBe('{"_tag":"Lazy","evaluated":false}')
      expect(serialized.toYAML()).toBe("_tag: Lazy\nevaluated: false")
    })

    it("should serialize evaluated lazy", () => {
      const lazy = Lazy(() => 42)
      lazy.orThrow()
      const serialized = lazy.serialize()

      expect(serialized.toJSON()).toBe('{"_tag":"Lazy","evaluated":true,"value":42}')
      expect(serialized.toYAML()).toContain("_tag: Lazy\nevaluated: true\nvalue: 42")
    })
  })

  describe("pipe", () => {
    it("should support pipe operation", () => {
      const lazy = Lazy(() => 42)
      const result = lazy.pipe((x: number) => x * 2)
      expect(result).toBe(84)
    })
  })

  describe("typeable", () => {
    it("should have typeable property", () => {
      const lazy = Lazy(() => 42)
      expect((lazy as any).typeable).toBe("Lazy")
    })
  })
})
