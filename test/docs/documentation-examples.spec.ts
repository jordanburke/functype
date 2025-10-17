import { describe, expect, it } from "vitest"

import { Brand, ValidatedBrand } from "@/branded"
import { Cond } from "@/conditional"
import { Match } from "@/conditional"
import { Task } from "@/core/task"
import { $, Do, DoAsync } from "@/do"
import { Either, Left, Right } from "@/either"
import { Lazy } from "@/lazy"
import { List } from "@/list"
import { None, Option, Some } from "@/option"
import { Try } from "@/try"

/**
 * This file contains examples specifically for documentation validation.
 * Each region corresponds to examples used in README.md, docs/, etc.
 */

describe("Documentation Examples", () => {
  describe("README Examples", () => {
    it("should demonstrate imports and basic usage", () => {
      //#region readme-imports
      // Note: Imports shown here are examples for documentation
      // Actual imports are at the top of this file
      // Selective module imports (recommended for production):
      // import { Option } from "functype/option"
      // import { Either } from "functype/either"

      // Direct constructor imports (smallest bundle):
      // import { some, none } from "functype/option"
      //#endregion readme-imports

      // Test that imports work
      expect(Option).toBeDefined()
      expect(Either).toBeDefined()
    })

    it("should demonstrate Option basic usage", () => {
      //#region readme-option-basic
      // Create options
      const value = Option("hello") // Some("hello")
      const empty = Option(null) // None

      // Transform values
      const upper = value.map((s) => s.toUpperCase()) // Some("HELLO")
      const _nothing = empty.map((s) => s.toUpperCase()) // None

      // Chain operations
      const result = value
        .map((s) => s.length)
        .filter((len) => len > 3)
        .getOrElse(0) // 5

      // Pattern matching
      const message = value.fold(
        () => "No value",
        (s) => `Value: ${s}`,
      ) // "Value: hello"
      //#endregion readme-option-basic

      expect(value.isSome()).toBe(true)
      expect(empty.isNone()).toBe(true)
      expect(upper.getOrElse("")).toBe("HELLO")
      expect(_nothing.isNone()).toBe(true)
      expect(result).toBe(5)
      expect(message).toBe("Value: hello")
    })

    it("should demonstrate Either basic usage", () => {
      //#region readme-either-basic
      // Success case
      const success = Right<string, number>(42)
      // Error case
      const failure = Left<string, number>("Error occurred")

      // Transform success values only
      const doubled = success.map((n) => n * 2) // Right(84)
      const _failed = failure.map((n) => n * 2) // Left("Error occurred")

      // Handle both cases
      const result = success.fold(
        (error) => `Failed: ${error}`,
        (value) => `Success: ${value}`,
      ) // "Success: 42"

      // Chain operations that might fail
      const divide = (a: number, b: number) => (b === 0 ? Left("Division by zero") : Right(a / b))

      const calculation = Right(10)
        .flatMap((n) => divide(n, 2))
        .flatMap((n) => divide(n, 5)) // Right(1)
      //#endregion readme-either-basic

      expect(success.isRight()).toBe(true)
      expect(failure.isLeft()).toBe(true)
      expect(doubled.getOrElse(0)).toBe(84)
      expect(_failed.isLeft()).toBe(true)
      expect(result).toBe("Success: 42")
      expect(calculation.getOrElse(0)).toBe(1)
    })

    it("should demonstrate List basic usage", () => {
      //#region readme-list-basic
      const numbers = List([1, 2, 3, 4])

      // Transform
      const doubled = numbers.map((n) => n * 2) // List([2, 4, 6, 8])

      // Filter
      const evens = numbers.filter((n) => n % 2 === 0) // List([2, 4])

      // Reduce
      const sum = numbers.reduce((acc, n) => acc + n, 0) // 10

      // Chain operations - take first 2 after transformations
      const result = numbers
        .filter((n) => n > 1)
        .map((n) => n * 2)
        .toArray()
        .slice(0, 2) // [4, 6] - using array slice instead of take

      // Convert back to array
      const array = result // [4, 6] - result is already an array
      //#endregion readme-list-basic

      expect(doubled.toArray()).toEqual([2, 4, 6, 8])
      expect(evens.toArray()).toEqual([2, 4])
      expect(sum).toBe(10)
      expect(result).toEqual([4, 6])
      expect(array).toEqual([4, 6])
    })

    it("should demonstrate Try basic usage", () => {
      //#region readme-try-basic
      // Safely execute code that might throw
      const result = Try(() => {
        // Potentially throwing operation
        const value = JSON.parse('{"name": "John"}')
        return value.name.toUpperCase()
      }) // Success("JOHN")

      const failed = Try(() => {
        throw new Error("Something went wrong")
      }) // Failure(Error("Something went wrong"))

      // Transform successful values
      const processed = result.map((name) => `Hello, ${name}!`)

      // Handle both success and failure
      const message = result.fold(
        (error) => `Error: ${error.message}`,
        (value) => `Result: ${value}`,
      )
      //#endregion readme-try-basic

      expect(result.isSuccess()).toBe(true)
      expect(failed.isFailure()).toBe(true)
      expect(processed.getOrElse("")).toBe("Hello, JOHN!")
      expect(message).toBe("Result: JOHN")
    })

    it("should demonstrate Lazy basic usage", () => {
      //#region readme-lazy-basic
      // Create lazy computations
      const expensive = Lazy(() => {
        console.log("Computing...")
        return Array.from({ length: 1000000 }, (_, i) => i).reduce((a, b) => a + b, 0)
      })

      // Value is not computed yet
      const _firstAccess = expensive.getOrThrow() // Logs "Computing..." and returns result
      const _secondAccess = expensive.getOrThrow() // Returns cached result (no log)

      // Transform lazy values
      const doubled = expensive.map((n) => n * 2)
      const _formatted = doubled.map((n) => `Result: ${n}`)

      // Combine lazy computations
      const combined = Lazy.of(() => 10).flatMap((a) => Lazy.of(() => 20).map((b) => a + b))
      //#endregion readme-lazy-basic

      expect(typeof expensive.getOrThrow()).toBe("number")
      expect(typeof doubled.getOrThrow()).toBe("number")
      expect(combined.getOrThrow()).toBe(30)
    })

    it("should demonstrate Do notation", () => {
      //#region readme-do-notation
      // Chain multiple Option operations
      const result = Do(function* () {
        const x = yield* $(Option(5))
        const y = yield* $(Option(10))
        const z = yield* $(Option(2))
        return x + y + z
      }) // Some(17)

      // Error handling with Either
      const validation = Do(function* () {
        const name = yield* $(Right<string, string>("John"))
        const age = yield* $(Right<string, number>(25))
        return { name, age }
      })

      // Async operations
      // eslint-disable-next-line @typescript-eslint/require-await -- Generator function for demo purposes
      const _asyncResult = DoAsync(async function* () {
        const data = yield* $(Right("user123"))
        const user = yield* $(Option({ id: data, name: "Alice" }))
        return `User: ${user.name}`
      })
      //#endregion readme-do-notation

      expect(result.getOrElse(0)).toBe(17)
      expect(validation.isRight()).toBe(true)
      // Note: _asyncResult is a Promise, would need await to test
    })

    it("should demonstrate Task basic usage", () => {
      //#region readme-task-basic
      // Task v2: All operations return TaskOutcome<T>
      const syncResult = Task().Sync(() => "success")
      // Returns: TaskSuccess<string> (extends TaskOutcome<string>)

      const _asyncResult = Task().Async(async () => {
        await new Promise((resolve) => setTimeout(resolve, 100))
        return "async success"
      })
      // Returns: Promise<TaskSuccess<string>>

      // Error handling
      const errorResult = Task().Sync(() => {
        throw new Error("Something failed")
      })
      // Returns: TaskFailure<string>

      // Transform successful results
      const _transformed = Task().Sync(() => 42)
      const doubled = _transformed.map((value) => value * 2)

      // Chain operations with error handling
      const _chained = Task().Sync(() => 5)
      const _chainResult = _chained.flatMap((value) => Right(value * 2))
      //#endregion readme-task-basic

      expect(syncResult.isSuccess()).toBe(true)
      expect(syncResult.value).toBe("success")
      expect(errorResult.isFailure()).toBe(true)
      expect(doubled.getOrElse(0)).toBe(84)
    })

    it("should demonstrate Branded Types", () => {
      //#region readme-branded-types
      // Create branded types for stronger type safety
      type UserId = Brand<"UserId", string>
      type Email = Brand<"Email", string>

      // Type-safe constructors
      const createUserId = (id: string): UserId => Brand("UserId", id)
      const _createEmail = (email: string): Email => Brand("Email", email)

      // Runtime validation with ValidatedBrand
      const EmailValidator = ValidatedBrand<"Email", string>("Email", (email: string) => {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
        return emailRegex.test(email)
      })

      // Usage
      const userId = createUserId("user_123")
      const validEmail = EmailValidator.of("user@example.com") // Some(Email("user@example.com"))
      const invalidEmail = EmailValidator.of("invalid") // None

      // Type safety prevents mixing
      // const mixedUp: UserId = _createEmail("test@test.com") // ❌ Type error
      //#endregion readme-branded-types

      expect(typeof userId).toBe("string")
      expect(userId).toBe("user_123")
      expect(validEmail.isSome()).toBe(true)
      expect(invalidEmail.isNone()).toBe(true)
    })

    it("should demonstrate Cond usage", () => {
      //#region readme-cond-usage
      // Replace if-else chains with Cond
      const score = 85

      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- Demo code showing all conditional patterns
      const grade = Cond.of<string>()
        .when(score >= 90, "A")
        .elseWhen(score >= 80, "B")
        .elseWhen(score >= 70, "C")
        .elseWhen(score >= 60, "D")
        .else("F")

      const studentGrade = grade // "B"

      // With complex conditions
      const person = { age: 17, hasLicense: false }
      const status = Cond.of<string>()
        .when(person.age >= 18 && person.hasLicense, "Can drive")
        .elseWhen(person.age >= 16, "Can get permit")
        .else("Too young")

      const result = status // "Can get permit"
      //#endregion readme-cond-usage

      expect(studentGrade).toBe("B")
      expect(result).toBe("Can get permit")
    })

    it("should demonstrate Match usage", () => {
      //#region readme-match-basic
      // Pattern matching with Match
      type Status = "pending" | "approved" | "rejected" | "cancelled"

      const processStatus = (status: Status) =>
        Match(status)
          .caseValue("pending", "Waiting for review")
          .caseValue("approved", "Request accepted")
          .caseValue("rejected", "Request denied")
          .caseValue("cancelled", "Request cancelled")
          .default("Unknown status")

      const message = processStatus("approved") // "Request accepted"
      //#endregion readme-match-basic

      expect(message).toBe("Request accepted")
    })

    it("should demonstrate exhaustive matching", () => {
      //#region readme-match-exhaustive
      // Exhaustive matching with compile-time checking
      type Status = "idle" | "loading" | "success" | "error"
      const result = Match("success" as Status)
        .caseValue("idle", "Not started")
        .caseValue("loading", "In progress")
        .caseValue("success", "Completed")
        .caseValue("error", "Failed")
        .default("Unknown") // "Completed"

      // Guards and complex patterns
      const numberMatch = Match(42)
        .case((n) => n < 0, "Negative")
        .case((n) => n === 0, "Zero")
        .case((n) => n > 100, "Large")
        .default("Normal") // "Normal"
      //#endregion readme-match-exhaustive

      expect(result).toBe("Completed")
      expect(numberMatch).toBe("Normal")
    })
  })

  describe("Quick Reference Examples", () => {
    it("should demonstrate Option quick patterns", () => {
      //#region quick-option-patterns
      // Creation
      const some = Option("value")
      const _none = Option(null)
      const _explicit = Some("explicit")
      const _explicitNone = None<string>()

      // Common operations
      const mapped = some.map((s) => s.toUpperCase())
      const filtered = some.filter((s) => s.length > 3)
      const chained = some.flatMap((s) => Option(s.repeat(2)))
      const value = some.getOrElse("default")
      const folded = some.fold(
        () => "empty",
        (s) => `has: ${s}`,
      )
      //#endregion quick-option-patterns

      expect(mapped.getOrElse("")).toBe("VALUE")
      expect(filtered.getOrElse("")).toBe("value")
      expect(chained.getOrElse("")).toBe("valuevalue")
      expect(value).toBe("value")
      expect(folded).toBe("has: value")
    })

    it("should demonstrate Either quick patterns", () => {
      //#region quick-either-patterns
      // Creation
      const success = Right<string, number>(42)
      const failure = Left<string, number>("error")

      // Operations
      const mapped = success.map((n) => n * 2)
      const recovered = failure.getOrElse(0)
      const swapped = success.swap()
      const folded = success.fold(
        (_err) => 0,
        (val) => val,
      )
      //#endregion quick-either-patterns

      expect(mapped.getOrElse(0)).toBe(84)
      expect(recovered).toBe(0)
      expect(swapped.isLeft()).toBe(true)
      expect(folded).toBe(42)
    })

    it("should demonstrate List quick patterns", () => {
      //#region quick-list-patterns
      // Creation and operations
      const list = List([1, 2, 3, 4, 5])
      const mapped = list.map((n) => n * 2)
      const filtered = list.filter((n) => n % 2 === 0)
      const taken = List(list.toArray().slice(0, 3))
      const reduced = list.reduce((acc, n) => acc + n, 0)
      const contains = list.contains(3)
      //#endregion quick-list-patterns

      expect(mapped.toArray()).toEqual([2, 4, 6, 8, 10])
      expect(filtered.toArray()).toEqual([2, 4])
      expect(taken.toArray()).toEqual([1, 2, 3])
      expect(reduced).toBe(15)
      expect(contains).toBe(true)
    })
  })

  describe("Landing Page Pattern Examples", () => {
    it("should demonstrate Option creation patterns", () => {
      //#region landing-option-creation
      Option(42) // Some(42)
      Option(null) // None
      Option(undefined) // None
      Option.none() // Explicitly create None
      //#endregion landing-option-creation

      expect(Option(42).isSome()).toBe(true)
      expect(Option(null).isNone()).toBe(true)
      expect(Option(undefined).isNone()).toBe(true)
      expect(Option.none().isNone()).toBe(true)
    })

    it("should demonstrate Option transformation patterns", () => {
      //#region landing-option-transform
      const doubled = Option(5)
        .map((x) => x * 2) // Some(10)
        .filter((x) => x > 5) // Some(10)
        .getOrElse(0) // 10
      //#endregion landing-option-transform

      expect(doubled).toBe(10)
    })

    it("should demonstrate Option pattern matching", () => {
      //#region landing-option-match
      const option = Option("test")
      option.match({
        Some: (value) => `Found: ${value}`,
        None: () => "Not found",
      })
      //#endregion landing-option-match

      const result = option.match({
        Some: (value) => `Found: ${value}`,
        None: () => "Not found",
      })
      expect(result).toBe("Found: test")
    })

    it("should demonstrate Either creation patterns", () => {
      //#region landing-either-creation
      // Success and failure
      const success = Right<string, number>(42)
      const failure = Left<string, number>("Error message")

      // Transform success only
      const doubled = success.map((n) => n * 2) // Right(84)
      const unchanged = failure.map((n) => n * 2) // Left("Error message")
      //#endregion landing-either-creation

      expect(success.isRight()).toBe(true)
      expect(failure.isLeft()).toBe(true)
      expect(doubled.getOrElse(0)).toBe(84)
      expect(unchanged.isLeft()).toBe(true)
    })

    it("should demonstrate Either validation patterns", () => {
      //#region landing-either-validation
      const validateEmail = (email: string) => (email.includes("@") ? Right(email) : Left("Invalid email"))

      const validateAge = (age: number) => (age >= 18 ? Right(age) : Left("Must be 18+"))

      const result = Do(function* () {
        const email = yield* $(validateEmail("user@example.com"))
        const age = yield* $(validateAge(25))
        return { email, age }
      })
      //#endregion landing-either-validation

      expect(result.isRight()).toBe(true)
    })

    it("should demonstrate Either error handling patterns", () => {
      //#region landing-either-error
      const parseJSON = (json: string) => {
        try {
          return Right(JSON.parse(json))
        } catch (error) {
          return Left(`Parse error: ${error}`)
        }
      }

      const result = parseJSON('{"name": "Alice"}')
        .map((data) => data.name)
        .fold(
          (error) => `Error: ${error}`,
          (name) => `Hello, ${name}!`,
        )
      //#endregion landing-either-error

      expect(result).toBe("Hello, Alice!")
    })

    it("should demonstrate List creation patterns", () => {
      //#region landing-list-creation
      const numbers = List([1, 2, 3, 4, 5])
      const empty = List<number>([])
      const range = List([...Array(5).keys()]) // List([0, 1, 2, 3, 4])
      //#endregion landing-list-creation

      expect(numbers.toArray()).toEqual([1, 2, 3, 4, 5])
      expect(empty.toArray()).toEqual([])
      expect(range.toArray()).toEqual([0, 1, 2, 3, 4])
    })

    it("should demonstrate List transformation patterns", () => {
      //#region landing-list-transform
      const numbers = List([1, 2, 3, 4])
      const result = numbers
        .filter((n) => n > 1)
        .map((n) => n * 2)
        .reduce((acc, n) => acc + n, 0) // 18
      //#endregion landing-list-transform

      expect(result).toBe(18)
    })

    it("should demonstrate List flatMap patterns", () => {
      //#region landing-list-flatmap
      const pairs = List([1, 2, 3]).flatMap((x) => List([x, x * 10]))
      // List([1, 10, 2, 20, 3, 30])
      //#endregion landing-list-flatmap

      expect(pairs.toArray()).toEqual([1, 10, 2, 20, 3, 30])
    })

    it("should demonstrate Task sync and async patterns", () => {
      //#region landing-task-sync-async
      // Synchronous task
      const sync = Task().Sync(
        () => 42,
        (err) => new Error("Failed"),
      )

      // Asynchronous task
      const async = Task().Async(
        async () => await fetchData(),
        async (err) => new Error("Fetch error"),
      )
      //#endregion landing-task-sync-async

      expect(sync.isSuccess()).toBe(true)
      async function fetchData() {
        return "data"
      }
    })

    it("should demonstrate Task error handling patterns", async () => {
      //#region landing-task-error
      try {
        await Task({ name: "DataProcessor" }).Async(() => {
          throw new Error("Processing failed")
        })
      } catch (error) {
        console.log(error.taskInfo.name) // "DataProcessor"
      }
      //#endregion landing-task-error

      expect(true).toBe(true)
    })

    it("should demonstrate Task conversion patterns", () => {
      //#region landing-task-conversion
      const getUser = Task.fromPromise(fetchAPI, { name: "UserFetch" })
      //#endregion landing-task-conversion

      expect(getUser).toBeDefined()
      async function fetchAPI() {
        return { id: 1, name: "User" }
      }
    })

    it("should demonstrate Do Option chaining patterns", () => {
      //#region landing-do-option
      const result = Do(function* () {
        const x = yield* $(Option(5))
        const y = yield* $(Option(10))
        return x + y
      }) // Option(15)
      //#endregion landing-do-option

      expect(result.getOrElse(0)).toBe(15)
    })

    it("should demonstrate Do List comprehension patterns", () => {
      //#region landing-do-list
      const pairs = Do(function* () {
        const x = yield* $(List([1, 2]))
        const y = yield* $(List([10, 20]))
        return { x, y }
      })
      // List([{x:1,y:10}, {x:1,y:20}, {x:2,y:10}, {x:2,y:20}])
      //#endregion landing-do-list

      expect(pairs.toArray()).toEqual([
        { x: 1, y: 10 },
        { x: 1, y: 20 },
        { x: 2, y: 10 },
        { x: 2, y: 20 },
      ])
    })

    it("should demonstrate Do Either error handling patterns", () => {
      const input = "test@example.com"
      const validateEmail = (email: string) => Right(email)
      const fetchUser = (email: string) => Right({ email, id: 1 })
      const saveUser = (user: { email: string; id: number }) => Right(user)

      //#region landing-do-either
      const validated = Do(function* () {
        const email = yield* $(validateEmail(input))
        const user = yield* $(fetchUser(email))
        const saved = yield* $(saveUser(user))
        return saved
      })
      // If any step returns Left, chain short-circuits
      //#endregion landing-do-either

      expect(validated.isRight()).toBe(true)
    })

    it("should demonstrate Match value patterns", () => {
      //#region landing-match-value
      const status = "pending"
      Match(status)
        .when("pending", () => "⏳ Pending")
        .when("success", () => "✓ Success")
        .when("error", () => "✗ Error")
        .default(() => "Unknown")
      //#endregion landing-match-value

      const result = Match(status)
        .when("pending", () => "⏳ Pending")
        .when("success", () => "✓ Success")
        .when("error", () => "✗ Error")
        .default(() => "Unknown")
      expect(result).toBe("⏳ Pending")
    })

    it("should demonstrate Cond predicate patterns", () => {
      //#region landing-cond-predicate
      const value = 5
      Cond.of<string>()
        .when(value < 0, "negative")
        .elseWhen(value === 0, "zero")
        .elseWhen(value > 0, "positive")
        .else("unknown")
      //#endregion landing-cond-predicate

      const result = Cond.of<string>()
        .when(value < 0, "negative")
        .elseWhen(value === 0, "zero")
        .elseWhen(value > 0, "positive")
        .else("unknown")
      expect(result).toBe("positive")
    })

    it("should demonstrate builtin match patterns", () => {
      //#region landing-match-builtin
      const option = Option("value")
      option.match({
        Some: (value) => `Found: ${value}`,
        None: () => "Not found",
      })

      const either = Right<string, string>("success")
      either.match({
        Right: (value) => `Success: ${value}`,
        Left: (error) => `Error: ${error}`,
      })
      //#endregion landing-match-builtin

      const optionResult = option.match({
        Some: (value) => `Found: ${value}`,
        None: () => "Not found",
      })
      const eitherResult = either.match({
        Right: (value) => `Success: ${value}`,
        Left: (error) => `Error: ${error}`,
      })
      expect(optionResult).toBe("Found: value")
      expect(eitherResult).toBe("Success: success")
    })
  })
})
