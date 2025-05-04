import { describe, expect, it } from "vitest"

import type { Matchable } from "../../src"
import { Either, Left, List, Map, MatchableUtils, None, Option, Right, Some, Try, Tuple } from "../../src"

describe("Matchable", () => {
  describe("Option", () => {
    it("should match Some variant", () => {
      const option: Option<number> = Some(42)

      const result = option.match({
        Some: (value) => `Value is ${value}`,
        None: () => "No value",
      })

      expect(result).toBe("Value is 42")
    })

    it("should match None variant", () => {
      const option: Option<number> = None()

      const result = option.match({
        Some: (value) => `Value is ${value}`,
        None: () => "No value",
      })

      expect(result).toBe("No value")
    })

    it("should be compatible with the Matchable type", () => {
      const option: Option<number> = Some(42)
      const matchable: Matchable<number, "Some" | "None"> = option

      expect(matchable).toBe(option)
    })

    it("should handle complex transformations in match handlers", () => {
      const option: Option<number> = Some(42)

      const result = option.match({
        Some: (value) => ({ doubled: value * 2, isEven: value % 2 === 0 }),
        None: () => ({ doubled: 0, isEven: false }),
      })

      expect(result).toEqual({ doubled: 84, isEven: true })
    })

    it("should combine match with other operations", () => {
      const option: Option<string> = Some("hello")

      const uppercased = option
        .map((s) => s.toUpperCase())
        .match({
          Some: (value) => value,
          None: () => "NONE",
        })

      expect(uppercased).toBe("HELLO")
    })
  })

  describe("Either", () => {
    it("should match Right variant", () => {
      const either: Either<string, number> = Right(42)

      const result = either.match({
        Right: (value) => `Success: ${value}`,
        Left: (err) => `Error: ${err}`,
      })

      expect(result).toBe("Success: 42")
    })

    it("should match Left variant", () => {
      const either: Either<string, number> = Left("error occurred")

      const result = either.match({
        Right: (value) => `Success: ${value}`,
        Left: (err) => `Error: ${err}`,
      })

      expect(result).toBe("Error: error occurred")
    })

    it("should be compatible with the Matchable type", () => {
      const either: Either<string, number> = Right(42)
      const matchable: Matchable<number | string, "Left" | "Right"> = either

      expect(matchable).toBe(either)
    })

    it("should support different return types from match handlers", () => {
      const success: Either<string, number> = Right(42)

      // Case 1: Using union type with explicit type parameter
      type Result = { type: "success"; value: number } | { type: "error"; error: string }

      // Explicitly specifying the Result type
      const explicitType = success.match<Result>({
        Right: (value) => ({ type: "success", value }),
        Left: (error) => ({ type: "error", error }),
      })

      expect(explicitType).toEqual({ type: "success", value: 42 })

      // Case 2: Type inference with consistent return types
      const inferredString = success.match({
        Right: (value) => `Success: ${value}`,
        Left: (error) => `Error: ${error}`,
      })

      // TypeScript correctly infers this is a string
      expect(typeof inferredString).toBe("string")
      expect(inferredString).toBe("Success: 42")

      // Case 3: Type inference with number return type
      const inferredNumber = success.match({
        Right: (value) => value * 2,
        Left: () => 0,
      })

      // TypeScript infers this is a number without explicit typing
      expect(typeof inferredNumber).toBe("number")
      expect(inferredNumber).toBe(84)

      // Case 4: Complex object with inferred properties
      const inferredObject = success.match({
        Right: (value) => ({
          doubled: value * 2,
          isPositive: value > 0,
          description: `The value is ${value}`,
        }),
        Left: (error) => ({
          doubled: 0,
          isPositive: false,
          description: `Error: ${error}`,
        }),
      })

      // TypeScript infers all the object properties correctly
      expect(inferredObject.doubled).toBe(84)
      expect(inferredObject.isPositive).toBe(true)
      expect(inferredObject.description).toBe("The value is 42")
    })

    it("should allow chaining with other operations", () => {
      const either: Either<string, number> = Right(42)

      const result = either
        .map((x) => x * 2)
        .match({
          Right: (value) => `Result: ${value}`,
          Left: (error) => `Failed: ${error}`,
        })

      expect(result).toBe("Result: 84")
    })

    it("should work with Either.fromNullable", () => {
      const withValue = Either.fromNullable("hello", "error")
      const withNull = Either.fromNullable(null, "value was null")

      const resultWithValue = withValue.match({
        Right: (value) => `Value: ${value}`,
        Left: (error) => `Error: ${error}`,
      })

      const resultWithNull = withNull.match({
        Right: (value) => `Value: ${value}`,
        Left: (error) => `Error: ${error}`,
      })

      expect(resultWithValue).toBe("Value: hello")
      expect(resultWithNull).toBe("Error: value was null")
    })
  })

  describe("Try", () => {
    it("should match Success variant", () => {
      const tryValue = Try(() => 42)

      const result = tryValue.match({
        Success: (value) => `Success: ${value}`,
        Failure: (error) => `Error: ${error.message}`,
      })

      expect(result).toBe("Success: 42")
    })

    it("should match Failure variant", () => {
      const tryValue = Try(() => {
        throw new Error("Something went wrong")
      })

      const result = tryValue.match({
        Success: (value) => `Success: ${value}`,
        Failure: (error) => `Error: ${error.message}`,
      })

      expect(result).toBe("Error: Something went wrong")
    })

    it("should be compatible with the Matchable type", () => {
      const tryValue = Try(() => 42)
      const matchable: Matchable<number | Error, "Success" | "Failure"> = tryValue

      expect(matchable).toBe(tryValue)
    })

    it("should support pattern matching with complex data structures", () => {
      const jsonObj = Try(() => JSON.parse('{"name": "John", "age": 30}'))
      const jsonInvalid = Try(() => JSON.parse('{"name": "John", age}'))

      // Define specific types for JSON data
      type JsonObject = { name: string; age: number }
      type JsonResult = { valid: true; name: string; age: number } | { valid: false; error: string }

      const processJson = (tryValue: Try<unknown>): JsonResult => {
        return tryValue.match<JsonResult>({
          Success: (data: unknown): JsonResult => {
            // Type guard for JsonObject
            if (
              data !== null &&
              typeof data === "object" &&
              "name" in data &&
              "age" in data &&
              typeof (data as JsonObject).name === "string" &&
              typeof (data as JsonObject).age === "number"
            ) {
              return { valid: true, name: (data as JsonObject).name, age: (data as JsonObject).age }
            }
            // Handle unexpected data structure
            return { valid: false, error: "Invalid JSON structure" }
          },
          Failure: (error: Error): JsonResult => ({ valid: false, error: error.message }),
        })
      }

      expect(processJson(jsonObj)).toEqual({ valid: true, name: "John", age: 30 })
      expect(processJson(jsonInvalid).valid).toBe(false)
      // Type guard to check for error property on invalid result
      const invalidResult = processJson(jsonInvalid)
      if (!invalidResult.valid) {
        expect(invalidResult.error).toBeTruthy() // Error message varies by engine
      }
    })

    it("should allow chaining operations and match", () => {
      const tryValue = Try(() => "hello")

      const result = tryValue
        .map((str) => str.toUpperCase())
        .match({
          Success: (value) => `Got: ${value}`,
          Failure: (error) => `Failed: ${error.message}`,
        })

      expect(result).toBe("Got: HELLO")
    })

    it("should work with nested Try operations", () => {
      // First Try operation that succeeds
      const outerTry = Try(() => {
        // Second Try operation within the first
        const innerTry = Try(() => 42 * 2)

        // Match on the inner Try and return its result
        return innerTry.match({
          Success: (value) => value,
          Failure: (error) => {
            throw error
          },
        })
      })

      const result = outerTry.match({
        Success: (value) => `Result: ${value}`,
        Failure: (error) => `Error: ${error.message}`,
      })

      expect(result).toBe("Result: 84")
    })
  })

  describe("List", () => {
    it("should match NonEmpty variant", () => {
      const list = List([1, 2, 3])

      const result = list.match({
        NonEmpty: (values) => `List has ${values.length} items`,
        Empty: () => "List is empty",
      })

      expect(result).toBe("List has 3 items")
    })

    it("should match Empty variant", () => {
      const list = List([])

      const result = list.match({
        NonEmpty: (values) => `List has ${values.length} items`,
        Empty: () => "List is empty",
      })

      expect(result).toBe("List is empty")
    })

    it("should be compatible with the Matchable type", () => {
      const list = List([1, 2, 3])
      const matchable: Matchable<number[], "Empty" | "NonEmpty"> = list

      expect(matchable).toBe(list)
    })

    it("should allow data transformation in match handlers", () => {
      const list = List([1, 2, 3, 4, 5])

      const result = list.match({
        NonEmpty: (values) => {
          const sum = values.reduce((a, b) => a + b, 0)
          const avg = sum / values.length
          return { sum, avg }
        },
        Empty: () => ({ sum: 0, avg: 0 }),
      })

      expect(result).toEqual({ sum: 15, avg: 3 })
    })

    it("should support conditional logic in match handlers", () => {
      const shortList = List([1, 2])
      const longList = List([1, 2, 3, 4, 5])

      const describe = (list: List<number>) =>
        list.match({
          NonEmpty: (values) => {
            if (values.length < 3) return "Short list"
            if (values.length < 6) return "Medium list"
            return "Long list"
          },
          Empty: () => "Empty list",
        })

      expect(describe(shortList)).toBe("Short list")
      expect(describe(longList)).toBe("Medium list")
    })

    it("should work with array methods in the match handler", () => {
      const numList = List([1, 2, 3, 4, 5])

      const result = numList.match({
        NonEmpty: (values) => {
          const evens = values.filter((n) => n % 2 === 0)
          const odds = values.filter((n) => n % 2 !== 0)
          return { evens, odds }
        },
        Empty: () => ({ evens: [], odds: [] }),
      })

      expect(result).toEqual({
        evens: [2, 4],
        odds: [1, 3, 5],
      })
    })

    it("should allow chaining with map and other operations", () => {
      const list = List(["a", "b", "c"])

      const result = list
        .map((s) => s.toUpperCase())
        .match({
          NonEmpty: (values) => values.join("-"),
          Empty: () => "empty",
        })

      expect(result).toBe("A-B-C")
    })
  })

  describe("Map", () => {
    it("should match NonEmpty variant", () => {
      const map = Map([
        ["key1", "value1"],
        ["key2", "value2"],
      ])

      const result = map.match({
        NonEmpty: (entries) => `Map has ${entries.length} entries`,
        Empty: () => "Map is empty",
      })

      expect(result).toBe("Map has 2 entries")
    })

    it("should match Empty variant", () => {
      const map = Map<string, string>([])

      const result = map.match({
        NonEmpty: (entries) => `Map has ${entries.length} entries`,
        Empty: () => "Map is empty",
      })

      expect(result).toBe("Map is empty")
    })

    it("should be compatible with the Matchable type", () => {
      const map = Map([["key", "value"]])
      const matchable: Matchable<Array<Tuple<[string, string]>>, "Empty" | "NonEmpty"> = map

      expect(matchable).toBe(map)
    })

    it("should allow transforming entries in the match handler", () => {
      const map = Map([
        ["name", "John"],
        ["age", "30"],
      ])

      const result = map.match({
        NonEmpty: (entries) => {
          const transformed = entries.map((entry) => {
            const [key, value] = entry.toArray()
            return `${key}: ${value}`
          })
          return transformed.join(", ")
        },
        Empty: () => "No entries",
      })

      expect(result).toBe("name: John, age: 30")
    })
  })

  describe("MatchableUtils", () => {
    it("should provide a default handler", () => {
      const defaultHandler = MatchableUtils.default((value: number) => `Default: ${value}`)

      expect(defaultHandler(42)).toBe("Default: 42")
    })

    it("should support when guards", () => {
      const whenPositive = MatchableUtils.when(
        (n: number) => n > 0,
        (n) => `Positive: ${n}`,
      )
      const whenNegative = MatchableUtils.when(
        (n: number) => n < 0,
        (n) => `Negative: ${n}`,
      )

      expect(whenPositive(5)).toBe("Positive: 5")
      expect(whenPositive(-5)).toBeUndefined()
      expect(whenNegative(-5)).toBe("Negative: -5")
      expect(whenNegative(5)).toBeUndefined()
    })

    it("should allow for complex pattern matching", () => {
      const option: Option<number> = Some(42)

      const result = option.match({
        Some: (value) => {
          if (value > 0) return "Positive"
          if (value < 0) return "Negative"
          return "Zero"
        },
        None: () => "No value",
      })

      expect(result).toBe("Positive")
    })

    it("should handle complex value types with when guards", () => {
      // Define object shapes
      type User = { type: "user"; name: string }
      type Product = { type: "product"; price: number }
      type Unknown = { type: string }
      type Entity = User | Product | Unknown

      // Simple pattern matching function
      function match<T>(
        entity: Entity,
        patterns: {
          user?: (user: User) => T
          product?: (product: Product) => T
          unknown?: (unknown: Unknown) => T
        },
      ): T {
        if (entity.type === "user" && "name" in entity && patterns.user) {
          return patterns.user(entity as User)
        }
        if (entity.type === "product" && "price" in entity && patterns.product) {
          return patterns.product(entity as Product)
        }
        if (patterns.unknown) {
          return patterns.unknown(entity as Unknown)
        }
        throw new Error("Non-exhaustive pattern match")
      }

      // Test with different object types
      const user: Entity = { type: "user", name: "John" }
      const product: Entity = { type: "product", price: 99.99 }
      const unknown: Entity = { type: "unknown" }

      // Match on entities
      const getUserLabel = (entity: Entity): string => {
        return match(entity, {
          user: (u) => `User: ${u.name}`,
          product: (p) => `Product costs ${p.price}`,
          unknown: () => "Unknown object type",
        })
      }

      expect(getUserLabel(user)).toBe("User: John")
      expect(getUserLabel(product)).toBe(`Product costs ${product.price}`)
      expect(getUserLabel(unknown)).toBe("Unknown object type")
    })

    it("should enable exhaustive pattern matching with discriminated unions", () => {
      type Circle = { kind: "circle"; radius: number }
      type Rectangle = { kind: "rectangle"; width: number; height: number }
      type Triangle = { kind: "triangle"; base: number; height: number }
      type Shape = Circle | Rectangle | Triangle

      // Create a function that calculates area using pattern matching
      function calculateArea(shape: Shape): number {
        switch (shape.kind) {
          case "circle":
            return Math.PI * shape.radius * shape.radius
          case "rectangle":
            return shape.width * shape.height
          case "triangle":
            return (shape.base * shape.height) / 2
          default:
            return 0 // Default case should never happen with proper types
        }
      }

      // Create test shapes
      const circle: Shape = { kind: "circle", radius: 5 }
      const rectangle: Shape = { kind: "rectangle", width: 4, height: 6 }
      const triangle: Shape = { kind: "triangle", base: 8, height: 3 }

      // Test with the MatchableUtils for additional examples
      expect(calculateArea(circle)).toBeCloseTo(Math.PI * 25)
      expect(calculateArea(rectangle)).toBe(24)
      expect(calculateArea(triangle)).toBe(12)

      // Convert the shape to a string description using Matchable
      const describeShape = (shape: Shape): string => {
        switch (shape.kind) {
          case "circle":
            return `Circle with radius ${shape.radius}`
          case "rectangle":
            return `Rectangle ${shape.width}x${shape.height}`
          case "triangle":
            return `Triangle with base ${shape.base} and height ${shape.height}`
        }
      }

      expect(describeShape(circle)).toBe("Circle with radius 5")
      expect(describeShape(rectangle)).toBe("Rectangle 4x6")
      expect(describeShape(triangle)).toBe("Triangle with base 8 and height 3")
    })

    it("should combine with standard data structures", () => {
      // Using MatchableUtils alongside data structure's built-in match
      const tryValue = Try(() => 42)

      // Pattern for successful values
      const handleSuccess = MatchableUtils.when<number, string>(
        (val: number) => val > 0,
        (val) => `Positive: ${val}`,
      )

      const handleZero = MatchableUtils.when<number, string>(
        (val: number) => val === 0,
        () => "Zero",
      )

      const defaultHandler = MatchableUtils.default<number, string>((val: number) => `Negative: ${val}`)

      // First match on Try's Success/Failure, then on the value itself
      const result = tryValue.match({
        Success: (value) => handleSuccess(value) ?? handleZero(value) ?? defaultHandler(value),
        Failure: (error) => `Error: ${error.message}`,
      })

      expect(result).toBe("Positive: 42")
    })

    it("should demonstrate practical use of type inference with match", () => {
      // Define a data processing function using pattern matching
      function processUserInput<T>(input: Option<T>) {
        // Notice no explicit return type is needed - TypeScript infers the correct type
        return input.match({
          Some: (value) => ({
            status: "success",
            message: `Got value: ${value}`,
            hasValue: true,
          }),
          None: () => ({
            status: "error",
            message: "No value provided",
            hasValue: false,
          }),
        })
      }

      // With numeric input
      const numResult = processUserInput(Some(42))
      expect(numResult.status).toBe("success")
      expect(numResult.message).toBe("Got value: 42")
      expect(numResult.hasValue).toBe(true)

      // With string input
      const strResult = processUserInput(Some("hello"))
      expect(strResult.status).toBe("success")
      expect(strResult.message).toBe("Got value: hello")
      expect(strResult.hasValue).toBe(true)

      // With no input
      const emptyResult = processUserInput(None<string>())
      expect(emptyResult.status).toBe("error")
      expect(emptyResult.message).toBe("No value provided")
      expect(emptyResult.hasValue).toBe(false)
    })
  })
})
