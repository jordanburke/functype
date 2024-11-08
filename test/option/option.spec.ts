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
})
