import { describe, expect, it } from "vitest"

import { $, Do, DoAsync } from "@/do"
import { Left, List, None, Option, Right, Try } from "@/index"

describe("Do-notation", () => {
  describe("Do with Option", () => {
    it("should unwrap Some values in sequence and return Option", () => {
      const result = Do(function* () {
        const x = yield* $(Option(5))
        const y = yield* $(Option(10))
        const z = yield* $(Option(x + y))
        return z * 2
      })

      // Do returns Option now
      expect(result.isSome()).toBe(true)
      expect(result.getOrThrow()).toBe(30)
    })

    it("should short-circuit on None and return None", () => {
      const val = Option<number>(null)
      const result = Do(function* () {
        const x = yield* $(Option(5))
        const y = yield* $(val) // This will short-circuit
        return x + y
      })

      // Test type inference - this should work if inference is successful
      expect(result.isNone()).toBe(true)
    })

    it("should work with conditional logic", () => {
      const result = Do(function* () {
        const x = yield* $(Option(10))

        if (x > 5) {
          const y = yield* $(Option(20))
          return x + y
        } else {
          return x * 2
        }
      })

      expect(result.isSome()).toBe(true)
      expect(result.getOrThrow()).toBe(30)
    })
  })

  describe("Do with Either", () => {
    it("should unwrap Right values in sequence and return Either", () => {
      const result = Do(function* () {
        const x = yield* $(Right<string, number>(5))
        const y = yield* $(Right<string, number>(10))
        const z = yield* $(Right<string, number>(x + y))
        return z * 2
      })

      expect(result.isRight()).toBe(true)
      expect(result.value).toBe(30)
    })

    it("should short-circuit on Left and preserve error", () => {
      const result = Do(function* () {
        const x = yield* $(Right<string, number>(5))
        const y = yield* $(Left<string, number>("error message"))
        // Never executes
        return yield* $(Right<string, number>(x + y))
      })

      expect(result.isLeft()).toBe(true)
      expect(result.value).toBe("error message")
    })

    it("should preserve Left error values", () => {
      const result = Do(function* () {
        const x = yield* $(Right<string, number>(5))
        const y = yield* $(Left<string, number>("custom error"))
        return x + y
      })

      expect(result.isLeft()).toBe(true)
      expect(result.value).toBe("custom error")
    })
  })

  describe("Do with mixed monad types", () => {
    it("should work with Option and Either together", () => {
      const result = Do(function* () {
        const x = yield* $(Option(5))
        const y = yield* $(Right<string, number>(10))
        const z = yield* $(Option(x + y))
        return z * 2
      }).toOption()

      // First monad is Option, so result is Option
      expect(result.isSome()).toBe(true)
      expect(result.getOrThrow()).toBe(30)
    })

    it("should handle Option → Either → Option chains", () => {
      const validateEmail = (email: string) => (email.includes("@") ? Option(email) : None<string>())

      const checkAvailable = (email: string) =>
        email !== "taken@example.com" ? Right<string, string>(email) : Left<string, string>("Email already taken")

      const createUser = (email: string) => Option({ id: 1, email })

      const result = Do(function* () {
        const validEmail = yield* $(validateEmail("user@example.com"))
        const availableEmail = yield* $(checkAvailable(validEmail))
        const user = yield* $(createUser(availableEmail))
        return user
      }).toOption()

      // First monad is Option, so result is Option
      expect(result.isSome()).toBe(true)
      expect(result.getOrThrow()).toEqual({ id: 1, email: "user@example.com" })
    })
  })

  describe("Do with List", () => {
    it("should produce cartesian product with Lists", () => {
      const result = Do(function* () {
        const first = yield* $(List([1, 2, 3]))
        const second = yield* $(List([10, 20]))
        return first + second
      })

      expect(result.toArray()).toEqual([11, 21, 12, 22, 13, 23]) // Cartesian product
    })

    it("should short-circuit on empty List", () => {
      const result = Do(function* () {
        const value = yield* $(List<string>([]))
        return Option(value)
      })

      expect(result.isEmpty).toBe(true)
      expect(result.toArray()).toEqual([])
    })
  })

  describe("Do with Try", () => {
    it("should unwrap Success values and return Try", () => {
      const result = Do(function* () {
        const x = yield* $(Try(() => 5))
        const y = yield* $(Try(() => 10))
        return x + y
      })

      expect(result.isSuccess()).toBe(true)
      expect(result.getOrThrow()).toBe(15)
    })

    it("should short-circuit on Failure", () => {
      const result = Do(function* () {
        const x = yield* $(Try(() => 5))
        const y = yield* $(
          Try<number>(() => {
            throw new Error("computation failed")
          }),
        )
        return x + y
      })

      expect(result.isFailure()).toBe(true)
      expect(result.error?.message).toBe("computation failed")
    })
  })

  describe("DoAsync with Promises", () => {
    it("should handle Promise<Option> values", async () => {
      const fetchUser = async (id: number) => Promise.resolve(Option({ id, name: "Alice" }))

      const fetchProfile = async (user: { id: number; name: string }) =>
        Promise.resolve(Right<string, { bio: string }>({ bio: `${user.name}'s profile` }))

      const result = await DoAsync(async function* () {
        const user = yield* $(await fetchUser(1))
        const profile = yield* $(await fetchProfile(user))
        return { user, profile }
      }).then((f) => f.toOption())

      // First monad is Option, so result is Option
      expect(result.isSome()).toBe(true)
      const value = result.getOrThrow()
      expect(value.user).toEqual({ id: 1, name: "Alice" })
      expect(value.profile).toEqual({ bio: "Alice's profile" })
    })

    it("should handle mixed sync and async monads", async () => {
      const result = await DoAsync(async function* () {
        const x = yield* $(Option(5)) // Sync monad
        const y = yield* $(await Promise.resolve(Option(10))) // Async monad
        const z = yield* $(Right<string, number>(x + y)) // Sync monad
        return z * 2
      }).then((f) => f.toOption())

      // First monad is Option, so result is Option
      expect(result.isSome()).toBe(true)
      expect(result.getOrThrow()).toBe(30)
    })

    it("should handle async None properly", async () => {
      const result = await DoAsync(async function* () {
        const x = yield* $(await Promise.resolve(Option(5)))
        const y = yield* $(await Promise.resolve(Option<number>(null))) // None - short-circuits
        return x + y
      })

      expect(result.isNone()).toBe(true)
    })

    it("should handle async Left properly", async () => {
      const result = await DoAsync(async function* () {
        const x = yield* $(await Promise.resolve(Right<string, number>(5)))
        const y = yield* $(await Promise.resolve(Left<string, number>("async error")))
        return x + y
      })

      expect(result.isLeft()).toBe(true)
      expect(result.value).toBe("async error")
    })

    it("should handle error recovery in async context", async () => {
      const result = await DoAsync(async function* () {
        const x = yield* $(await Promise.resolve(Option<number>(null))) // None - short-circuits
        return x
      })

      expect(result.isNone()).toBe(true)
    })
  })

  describe("Real-world scenarios", () => {
    it("should handle user registration flow", () => {
      const validateEmail = (email: string) =>
        email.includes("@") && email.includes(".") ? Option(email) : None<string>()

      const checkEmailAvailable = (email: string) =>
        email !== "taken@example.com"
          ? Right<Error, string>(email)
          : Left<Error, string>(new Error("Email already taken"))

      const hashPassword = (password: string) => (password.length >= 8 ? Option(`hashed_${password}`) : None<string>())

      const createUser = (email: string, hashedPw: string) =>
        Right<Error, { id: number; email: string; password: string }>({
          id: Math.floor(Math.random() * 1000),
          email,
          password: hashedPw,
        })

      const sendWelcomeEmail = (user: { email: string }) => Option({ sent: true, to: user.email })

      const registerUser = (email: string, password: string) => {
        const result = Do(function* () {
          const validEmail = yield* $(validateEmail(email))
          const availableEmail = yield* $(checkEmailAvailable(validEmail))
          const hashedPw = yield* $(hashPassword(password))
          const user = yield* $(createUser(availableEmail, hashedPw))
          const emailResult = yield* $(sendWelcomeEmail(user))

          return {
            user,
            emailSent: emailResult,
            status: "success" as const,
          }
        }).toOption()

        // Result is Option (first monad), wrap in Either for API
        if (result.isSome()) {
          return Right(result.getOrThrow())
        } else {
          return Left<
            Error,
            {
              user: { id: number; email: string; password: string }
              emailSent: { sent: boolean; to: string }
              status: "success"
            }
          >(new Error("Registration failed"))
        }
      }

      // Test successful registration
      const successResult = registerUser("newuser@example.com", "password123")
      expect(successResult.isRight()).toBe(true)
      if (successResult.isRight()) {
        const { value } = successResult
        expect(value.status).toBe("success")
        expect(value.user?.email).toBe("newuser@example.com")
        expect(value.emailSent?.sent).toBe(true)
      }

      // Test invalid email
      const invalidEmailResult = registerUser("invalid-email", "password123")
      expect(invalidEmailResult.isLeft()).toBe(true)

      // Test short password
      const shortPasswordResult = registerUser("user@example.com", "short")
      expect(shortPasswordResult.isLeft()).toBe(true)

      // Test taken email
      const takenEmailResult = registerUser("taken@example.com", "password123")
      expect(takenEmailResult.isLeft()).toBe(true)
    })

    it("should handle data processing pipeline", () => {
      const parseJSON = (json: string) => Try(() => JSON.parse(json))

      const validateData = (data: unknown) =>
        data && typeof data === "object" && "value" in data
          ? Right<string, { value: number }>(data as { value: number })
          : Left<string, { value: number }>("Invalid data structure")

      const processValue = (data: { value: number }) => Option(data.value > 0 ? data.value * 2 : null)

      const pipeline = (jsonString: string) => {
        const result = Do(function* () {
          const parsed = yield* $(parseJSON(jsonString))
          const validated = yield* $(validateData(parsed))
          return yield* $(processValue(validated))
        }).toTry()
        // Result is Try (first monad)
        if (result.isSuccess()) {
          return Option(result.getOrThrow())
        } else {
          return Option.none()
        }
      }

      // Valid data
      const validResult = pipeline('{"value": 10}')
      expect(validResult.isSome()).toBe(true)
      expect(validResult.getOrThrow()).toBe(20)

      // Invalid JSON
      const invalidJsonResult = pipeline("invalid json")
      expect(invalidJsonResult.isNone()).toBe(true)

      // Invalid structure
      const invalidStructResult = pipeline('{"other": 10}')
      expect(invalidStructResult.isNone()).toBe(true)

      // Negative value
      const negResult = pipeline('{"value": -5}')
      expect(negResult.isNone()).toBe(true)
    })
  })

  describe("Loops in Do-notation", () => {
    it("should support for loops with yielding", () => {
      const result = Do(function* () {
        const items = [1, 2, 3, 4, 5]
        let sum = 0

        for (const item of items) {
          const doubled = yield* $(Option(item * 2))
          sum += doubled
        }

        return sum
      })

      expect(result.isSome()).toBe(true)
      expect(result.getOrThrow()).toBe(30) // (1+2+3+4+5) * 2
    })

    it("should short-circuit loop on None", () => {
      const result = Do(function* () {
        const items = [1, 2, null, 4, 5]
        let sum = 0

        for (const item of items) {
          const value = yield* $(Option(item)) // Will short-circuit on null
          sum += value
        }

        return sum
      })

      expect(result.isNone()).toBe(true)
    })
  })

  describe("List comprehensions with cartesian products", () => {
    it("should produce cartesian product for multiple Lists", () => {
      const result = Do(function* () {
        const x = yield* $(List([1, 2]))
        const y = yield* $(List([3, 4]))
        return x + y
      })

      expect(result.toArray()).toEqual([4, 5, 5, 6])
    })

    it("should handle three Lists with cartesian product", () => {
      const result = Do(function* () {
        const x = yield* $(List([1, 2]))
        const y = yield* $(List([10, 20]))
        const z = yield* $(List([100]))
        return x + y + z
      })

      expect(result.toArray()).toEqual([111, 121, 112, 122])
    })

    it("should work with pure assignments between yields", () => {
      const result = Do(function* () {
        const x = yield* $(List([1, 2]))
        const doubled = x * 2 // Pure assignment, no yield
        const y = yield* $(List([10, 20]))
        const sum = doubled + y // Another pure assignment
        return sum * 10
      })

      expect(result.toArray()).toEqual([120, 220, 140, 240])
    })

    it("should short-circuit on empty List", () => {
      const result = Do(function* () {
        const x = yield* $(List([1, 2]))
        const y = yield* $(List<number>([])) // Empty list
        const z = yield* $(List([3, 4])) // Never reached
        return x + y + z
      })

      expect(result.isEmpty).toBe(true)
      expect(result.toArray()).toEqual([])
    })

    it("should handle List with Option (mixed types)", () => {
      const result = Do(function* () {
        const x = yield* $(List([1, 2, 3]))
        const y = yield* $(Option(10))
        return x + y
      }).toList()

      // First yield is List, so result should be a List
      expect(result.toArray()).toEqual([11, 12, 13])
    })

    it("should handle Option with List (Option first)", () => {
      const result = Do(function* () {
        const x = yield* $(Option(5))
        const y = yield* $(List([1, 2, 3]))
        return x + y
      }).toOption()

      // First monad is Option, not List, so result is Option
      // It takes the first element of the List
      expect(result.isSome()).toBe(true)
      expect(result.getOrThrow()).toBe(6) // 5 + 1 (first element)
    })

    it("should handle single-element Lists", () => {
      const result = Do(function* () {
        const x = yield* $(List([5]))
        const y = yield* $(List([10]))
        return x * y
      })

      expect(result.toArray()).toEqual([50])
    })

    it("should handle empty List short-circuit in comprehensions", () => {
      const result = Do(function* () {
        const x = yield* $(List([1, 2]))
        const y = yield* $(List<number>([])) // Empty-short-circuits
        const z = yield* $(List([10, 20]))
        return x + y + z
      })

      expect(result.isEmpty).toBe(true)
    })
  })
})
