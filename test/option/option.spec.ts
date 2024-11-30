import { None, Option } from "../../src"

describe("Option", () => {
  beforeEach(async () => {
    // Nothing
  })

  const something: Option<string> = Option<string>("hello")
  const nothing: Option<string> = Option<string>(undefined)

  it("parse valid number", () => {
    expect(something.getOrElse("world")).toBe("hello")
  })

  it("map on Some", () => {
    expect(something.map((s) => s.length).getOrElse(0)).toBe(5)
  })

  it("parse invalid number", () => {
    expect(nothing.getOrElse("world")).toBe("world")
  })

  it("map on None", () => {
    expect(nothing.map(() => 10)).toEqual(None())
  })

  it("filter on Some with predicate returning true", () => {
    expect(something.filter((s) => s.length === 5).getOrElse("nope")).toBe("hello")
  })

  it("filter on Some with predicate returning false", () => {
    expect(something.filter((s) => s.length === 4)).toEqual(None())
  })

  it("filter on None", () => {
    expect(nothing.filter(() => true)).toEqual(None())
  })

  describe("getOrThrow", () => {
    it("should return the value when Option is Some", () => {
      const error = new Error("Should not throw")
      expect(something.getOrThrow(error)).toBe("hello")
    })

    it("should throw the provided error when Option is None", () => {
      const error = new Error("Custom error message")
      expect(() => nothing.getOrThrow(error)).toThrow("Custom error message")
    })

    it("should preserve the error instance when throwing", () => {
      const customError = new Error("Custom error")
      try {
        nothing.getOrThrow(customError)
        fail("Should have thrown")
      } catch (e) {
        expect(e).toBe(customError) // Ensure it's the exact same error instance
      }
    })

    it("should work with different error types", () => {
      class CustomError extends Error {
        constructor() {
          super("Custom error type")
          this.name = "CustomError"
        }
      }

      const customError = new CustomError()
      expect(() => nothing.getOrThrow(customError)).toThrow("Custom error type")
    })
  })

  describe("flatMapAsync", () => {
    it("should handle Some with async function", async () => {
      const asyncFunction = async (value: string) => {
        return Option(`${value} world`)
      }

      const result = await something.flatMapAsync(asyncFunction)
      expect(result.getOrElse("default")).toBe("hello world")
    })

    it("should handle None with async function", async () => {
      const asyncFunction = async (value: string) => {
        return Option(`${value} world`)
      }

      const result = await nothing.flatMapAsync(asyncFunction)
      expect(result).toEqual(None())
    })

    it("should handle Some with async function returning None", async () => {
      const asyncFunction = async (_value: string) => {
        return None<string>()
      }

      const result = await something.flatMapAsync(asyncFunction)
      expect(result).toEqual(None())
    })

    it("should handle delayed async function", async () => {
      const delayedAsyncFunction = async (value: string) => {
        return new Promise<Option<string>>((resolve) => setTimeout(() => resolve(Option(`${value} delayed`)), 100))
      }

      const result = await something.flatMapAsync(delayedAsyncFunction)
      expect(result.getOrElse("default")).toBe("hello delayed")
    })

    it("should preserve the original state when using None", async () => {
      const asyncFunction = async (_value: string) => {
        return Option("should not be used")
      }

      const result = await nothing.flatMapAsync(asyncFunction)
      expect(result).toEqual(None())
    })
  })

  describe("fold", () => {
    it("should handle Some case", () => {
      const result = something.fold(
        () => "none case",
        (value) => `some case: ${value}`,
      )
      expect(result).toBe("some case: hello")
    })

    it("should handle None case", () => {
      const result = nothing.fold(
        () => "none case",
        (value) => `some case: ${value}`,
      )
      expect(result).toBe("none case")
    })

    it("should handle different return types", () => {
      const result = something.fold(
        () => 0,
        (value) => value.length,
      )
      expect(result).toBe(5)
    })

    it("should not execute Some handler for None", () => {
      const someHandler = jest.fn()
      Option.none()
      nothing.fold(() => "none", someHandler)
      expect(someHandler).not.toHaveBeenCalled()
    })

    it("should not execute None handler for Some", () => {
      const noneHandler = jest.fn()
      something.fold(noneHandler, (value) => value)
      expect(noneHandler).not.toHaveBeenCalled()
    })
  })

  describe("orNull", () => {
    it("should return value for Some", () => {
      expect(something.orNull()).toBe("hello")
    })

    it("should return null for None", () => {
      expect(nothing.orNull()).toBeNull()
    })

    it("should handle Option with number", () => {
      const numOption = Option(42)
      expect(numOption.orNull()).toBe(42)
    })

    it("should handle Option with object", () => {
      const obj = { test: "value" }
      const objOption = Option(obj)
      expect(objOption.orNull()).toBe(obj)
    })

    it("should handle Option created from null", () => {
      const nullOption = Option(null)
      expect(nullOption.orNull()).toBeNull()
    })

    it("should handle Option created from undefined", () => {
      const undefinedOption = Option(undefined)
      expect(undefinedOption.orNull()).toBeNull()
    })
  })

  describe("Option creation and chaining", () => {
    it("should chain fold and orNull correctly", () => {
      const result = something
        .map((s) => s.toUpperCase())
        .fold(
          () => Option<string>(null),
          (value) => Option(value),
        )
        .orNull()

      expect(result).toBe("HELLO")
    })

    it("should chain fold and orNull with None", () => {
      const result = nothing
        .map((s) => s.toUpperCase())
        .fold(
          () => Option<string>(null),
          (value) => Option(value),
        )
        .orNull()

      expect(result).toBeNull()
    })
  })

  describe("fold with type transformations", () => {
    interface User {
      name: string
      age: number
    }

    it("should transform types correctly", () => {
      const userOption = Option<User>({ name: "John", age: 30 })

      const result = userOption.fold(
        () => "No user",
        (user) => `${user.name} is ${user.age}`,
      )

      expect(result).toBe("John is 30")
    })

    it("should handle complex transformations with explicit typing", () => {
      const stringOption = Option("test")

      type SuccessResult = {
        exists: true
        value: string
      }

      type FailureResult = {
        exists: false
        value: null
      }

      type Result = SuccessResult | FailureResult

      const result = stringOption.fold<Result>(
        (): FailureResult => ({ exists: false, value: null }),
        (value): SuccessResult => ({ exists: true, value }),
      )

      expect(result).toEqual({ exists: true, value: "test" })
    })
  })
})
