import { describe, expect, it } from "vitest"

import { Do, DoAsync, $ } from "@/do"
import { Left, Right, List, None, Option, Try } from "@/index"

describe("Reshapeable interface", () => {
  describe("Option conversions", () => {
    it("should convert Some to other types", () => {
      const opt = Option(5)

      // toOption - for Some, returns a new Some with same value
      const optAgain = opt.toOption()
      expect(optAgain.isSome()).toBe(true)
      expect(optAgain.orThrow()).toBe(5)

      // toEither
      const either = opt.toEither("none")
      expect(either.isRight()).toBe(true)
      expect(either.value).toBe(5)

      // toList
      const list = opt.toList()
      expect(list.toArray()).toEqual([5])

      // toTry
      const tryVal = opt.toTry()
      expect(tryVal.isSuccess()).toBe(true)
      expect(tryVal.orThrow()).toBe(5)
    })

    it("should convert None to other types", () => {
      const opt = None<number>()

      // toOption - for None, returns None
      const optAgain = opt.toOption()
      expect(optAgain.isNone()).toBe(true)

      // toEither
      const either = opt.toEither("none value")
      expect(either.isLeft()).toBe(true)
      expect(either.value).toBe("none value")

      // toList
      const list = opt.toList()
      expect(list.isEmpty).toBe(true)

      // toTry
      const tryVal = opt.toTry()
      expect(tryVal.isFailure()).toBe(true)
    })
  })

  describe("Either conversions", () => {
    it("should convert Right to other types", () => {
      const either = Right<string, number>(10)

      // toOption
      const opt = either.toOption()
      expect(opt.isSome()).toBe(true)
      expect(opt.orThrow()).toBe(10)

      // toEither - creates new Either with different left type
      const newEither = either.toEither(42)
      expect(newEither.isRight()).toBe(true)
      expect(newEither.value).toBe(10)

      // toList
      const list = either.toList()
      expect(list.toArray()).toEqual([10])

      // toTry
      const tryVal = either.toTry()
      expect(tryVal.isSuccess()).toBe(true)
      expect(tryVal.orThrow()).toBe(10)
    })

    it("should convert Left to other types", () => {
      const either = Left<string, number>("error")

      // toOption
      const opt = either.toOption()
      expect(opt.isNone()).toBe(true)

      // toEither - creates new Either with different left type
      const newEither = either.toEither("default")
      expect(newEither.isLeft()).toBe(true)
      expect(newEither.value).toBe("default")

      // toList
      const list = either.toList()
      expect(list.isEmpty).toBe(true)

      // toTry
      const tryVal = either.toTry()
      expect(tryVal.isFailure()).toBe(true)
    })
  })

  describe("List conversions", () => {
    it("should convert non-empty List to other types", () => {
      const list = List([1, 2, 3])

      // toOption - returns first element
      const opt = list.toOption()
      expect(opt.isSome()).toBe(true)
      expect(opt.orThrow()).toBe(1)

      // toEither - returns Right with first element
      const either = list.toEither("empty")
      expect(either.isRight()).toBe(true)
      expect(either.value).toBe(1)

      // toList - returns self
      expect(list.toList()).toBe(list)

      // toTry - returns Success with first element
      const tryVal = list.toTry()
      expect(tryVal.isSuccess()).toBe(true)
      expect(tryVal.orThrow()).toBe(1)
    })

    it("should convert empty List to other types", () => {
      const list = List<string>([])

      // toOption
      const opt = list.toOption()
      expect(opt.isNone()).toBe(true)

      // toEither
      const either = list.toEither("empty list")
      expect(either.isLeft()).toBe(true)
      expect(either.value).toBe("empty list")

      // toList - returns self
      expect(list.toList()).toBe(list)

      // toTry
      const tryVal = list.toTry()
      expect(tryVal.isFailure()).toBe(true)
    })
  })

  describe("Try conversions", () => {
    it("should convert Success to other types", () => {
      const tryVal = Try(() => 42)

      // toOption
      const opt = tryVal.toOption()
      expect(opt.isSome()).toBe(true)
      expect(opt.orThrow()).toBe(42)

      // toEither
      const either = tryVal.toEither("failed")
      expect(either.isRight()).toBe(true)
      expect(either.value).toBe(42)

      // toList
      const list = tryVal.toList()
      expect(list.toArray()).toEqual([42])

      // toTry - returns new Success with same value
      const tryAgain = tryVal.toTry()
      expect(tryAgain.isSuccess()).toBe(true)
      expect(tryAgain.orThrow()).toBe(42)
    })

    it("should convert Failure to other types", () => {
      const error = new Error("computation failed")
      const tryVal = Try<number>(() => {
        throw error
      })

      // toOption
      const opt = tryVal.toOption()
      expect(opt.isNone()).toBe(true)

      // toEither - uses error as left value
      const either = tryVal.toEither("default")
      expect(either.isLeft()).toBe(true)
      expect(either.value).toBe(error)

      // toList
      const list = tryVal.toList()
      expect(list.isEmpty).toBe(true)

      // toTry - returns new Failure with same error
      const tryAgain = tryVal.toTry()
      expect(tryAgain.isFailure()).toBe(true)
    })
  })

  describe("Do notation with Reshapeable", () => {
    it("should allow conversion after Do comprehension with mixed monads", () => {
      // Mixed monads return union, but we can convert to specific type
      const result = Do(function* () {
        const x = yield* $(Option(5))
        const y = yield* $(Right<string, number>(10))
        const z = yield* $(List([15]))
        return x + y + z
      })

      // Convert to Option for proper chaining
      const asOption = result.toOption()
      const doubled = asOption.map((x) => x * 2)
      expect(doubled.orThrow()).toBe(60)

      // Convert to Either
      const asEither = result.toEither("error")
      const tripled = asEither.map((x) => x * 3)
      expect(tripled.value).toBe(90)

      // Convert to List
      const asList = result.toList()
      const quadrupled = asList.map((x) => x * 4)
      expect(quadrupled.toArray()).toEqual([120])

      // Convert to Try
      const asTry = result.toTry()
      const quintupled = asTry.map((x) => x * 5)
      expect(quintupled.orThrow()).toBe(150)
    })

    it("should handle failure cases in Do comprehension", () => {
      const result = Do(function* () {
        const x = yield* $(Option(5))
        const y = yield* $(None<number>()) // This short-circuits
        return x + y
      })

      // All conversions should reflect the None/failure state
      expect(result.toOption().isNone()).toBe(true)
      expect(result.toEither("failed").isLeft()).toBe(true)
      expect(result.toList().isEmpty).toBe(true)
      expect(result.toTry().isFailure()).toBe(true)
    })

    it("should work with async Do comprehensions", async () => {
      const result = await DoAsync(async function* () {
        const x = yield* $(await Promise.resolve(Option(5)))
        const y = yield* $(Right<string, number>(10))
        return x + y
      })

      // Convert and use
      const asOption = result.toOption()
      expect(asOption.orThrow()).toBe(15)
    })
  })

  describe("Real-world usage patterns", () => {
    it("should enable flexible error handling pipelines", () => {
      const processData = (input: string) => {
        const result = Do(function* () {
          // Parse JSON - returns Try
          const parsed = yield* $(Try(() => JSON.parse(input)))

          // Validate - returns Either
          const validated = yield* $(
            typeof parsed === "object" && "value" in parsed
              ? Right<string, any>(parsed)
              : Left<string, any>("Invalid structure"),
          )

          // Extract optional field - returns Option
          const value = yield* $(Option(validated.value))

          return value * 2
        })

        // Convert to Either for consistent error handling
        return result.toEither("Processing failed")
      }

      const validResult = processData('{"value": 10}')
      expect(validResult.isRight()).toBe(true)
      expect(validResult.value).toBe(20)

      const invalidResult = processData("invalid")
      expect(invalidResult.isLeft()).toBe(true)
    })

    it("should support chaining different monad operations", () => {
      const fetchUser = (id: number) => Option(id > 0 ? { id, name: "Alice" } : null)
      const validateUser = (user: { id: number; name: string }) =>
        user.name.length > 0 ? Right<string, typeof user>(user) : Left<string, typeof user>("Invalid name")
      const enrichUser = (user: { id: number; name: string }) =>
        Try(() => ({ ...user, email: `${user.name.toLowerCase()}@example.com` }))

      const result = Do(function* () {
        const user = yield* $(fetchUser(1))
        const validated = yield* $(validateUser(user))
        const enriched = yield* $(enrichUser(validated))
        return enriched
      })

      // Can work with result as any monad type we need
      const asOption = result.toOption()
      expect(asOption.orThrow()).toEqual({
        id: 1,
        name: "Alice",
        email: "alice@example.com",
      })

      // Or as Either for error reporting
      const asEither = result.toEither("User processing failed")
      if (asEither.isRight()) {
        expect(asEither.value.email).toBe("alice@example.com")
      }
    })
  })
})
