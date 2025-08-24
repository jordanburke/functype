import { describe, it, expect } from "vitest"
import { Do, DoAsync, type LeftErrorType } from "@/do"
import { Option, Left, Right, List, Try } from "@/index"

describe("Do-notation", () => {
  describe("Do with Option", () => {
    it("should unwrap Some values in sequence", () => {
      const result = Do(function* () {
        const x = yield Option(5)
        const y = yield Option(10)
        const z = yield Option(x + y)
        return Option(z * 2)
      })

      expect(result.isSome()).toBe(true)
      expect(result.get()).toBe(30)
    })

    it("should short-circuit on None", () => {
      expect(() =>
        Do(function* () {
          const x = yield Option(5)
          const y = yield Option(null) // This will be None
          const z = yield Option(x + y) // This should never execute
          return Option(z)
        }),
      ).toThrow("Cannot unwrap None in Do-notation")
    })

    it("should handle error recovery with try-catch", () => {
      const result = Do(function* () {
        try {
          const x = yield Option(null) // Will throw NoneError
          return Option(x)
        } catch (e) {
          // Recover from None with a default value
          return Option(42)
        }
      })

      expect(result.isSome()).toBe(true)
      expect(result.get()).toBe(42)
    })

    it("should work with conditional logic", () => {
      const result = Do(function* () {
        const x = yield Option(10)

        if (x > 5) {
          const y = yield Option(20)
          return Option(x + y)
        } else {
          return Option(x * 2)
        }
      })

      expect(result.isSome()).toBe(true)
      expect(result.get()).toBe(30)
    })
  })

  describe("Do with Either", () => {
    it("should unwrap Right values in sequence", () => {
      const result = Do(function* () {
        const x = yield Right<string, number>(5)
        const y = yield Right<string, number>(10)
        const z = yield Right<string, number>(x + y)
        return Right<string, number>(z * 2)
      })

      expect(result.isRight()).toBe(true)
      expect(result.value).toBe(30)
    })

    it("should short-circuit on Left", () => {
      expect(() =>
        Do(function* () {
          const x = yield Right<string, number>(5)
          const y = yield Left<string, number>("error")
          const z = yield Right<string, number>(x + y) // Never executes
          return Right<string, number>(z)
        }),
      ).toThrow("Cannot unwrap Left in Do-notation")
    })

    it("should preserve Left error values", () => {
      try {
        Do(function* () {
          const x = yield Right<string, number>(5)
          const y = yield Left<string, number>("custom error")
          return Right<string, number>(x + y)
        })
        expect.fail("Should have thrown")
      } catch (e) {
        expect((e as Error).name).toBe("LeftError")
        expect((e as LeftErrorType<string>).value).toBe("custom error")
      }
    })
  })

  describe("Do with mixed monad types", () => {
    it("should work with Option and Either together", () => {
      const result = Do(function* () {
        const x = yield Option(5)
        const y = yield Right<string, number>(10)
        const z = yield Option(x + y)
        return Right<string, number>(z * 2)
      })

      expect(result.isRight()).toBe(true)
      expect(result.value).toBe(30)
    })

    it("should handle Option → Either → Option chains", () => {
      const validateEmail = (email: string) => (email.includes("@") ? Option(email) : Option.none())

      const checkAvailable = (email: string) =>
        email !== "taken@example.com" ? Right<string, string>(email) : Left<string, string>("Email already taken")

      const createUser = (email: string) => Option({ id: 1, email })

      const result = Do(function* () {
        const validEmail = yield validateEmail("user@example.com")
        const availableEmail = yield checkAvailable(validEmail)
        const user = yield createUser(availableEmail)
        return Right(user)
      })

      expect(result.isRight()).toBe(true)
      expect(result.value).toEqual({ id: 1, email: "user@example.com" })
    })
  })

  describe("Do with List", () => {
    it("should unwrap non-empty List to first element", () => {
      const result = Do(function* () {
        const first = yield List([1, 2, 3])
        const second = yield List([10, 20])
        return Option(first + second)
      })

      expect(result.isSome()).toBe(true)
      expect(result.get()).toBe(11) // 1 + 10
    })

    it("should throw on empty List", () => {
      expect(() =>
        Do(function* () {
          const value = yield List([])
          return Option(value)
        }),
      ).toThrow("Cannot unwrap empty List in Do-notation")
    })
  })

  describe("Do with Try", () => {
    it("should unwrap Success values", () => {
      const result = Do(function* () {
        const x = yield Try(() => 5)
        const y = yield Try(() => 10)
        return Option(x + y)
      })

      expect(result.isSome()).toBe(true)
      expect(result.get()).toBe(15)
    })

    it("should throw on Failure", () => {
      expect(() =>
        Do(function* () {
          const x = yield Try(() => 5)
          const y = yield Try(() => {
            throw new Error("computation failed")
          })
          return Option(x + y)
        }),
      ).toThrow()
    })
  })

  describe("Do with regular values", () => {
    it("should pass through non-monad values", () => {
      const result = Do(function* () {
        const x = yield 5 // Regular value
        const y = yield Option(10) // Monad
        const z = yield x + y // Regular value
        return Option(z * 2)
      })

      expect(result.isSome()).toBe(true)
      expect(result.get()).toBe(30)
    })
  })

  describe("DoAsync with Promises", () => {
    it("should handle Promise<Option> values", async () => {
      const fetchUser = async (id: number) => Promise.resolve(Option({ id, name: "Alice" }))

      const fetchProfile = async (user: { id: number; name: string }) =>
        Promise.resolve(Right<string, { bio: string }>({ bio: `${user.name}'s profile` }))

      const result = await DoAsync(async function* () {
        const user = yield fetchUser(1)
        const profile = yield fetchProfile(user)
        return Right({ user, profile })
      })

      expect(result.isRight()).toBe(true)
      if (result.isRight()) {
        expect(result.value.user).toEqual({ id: 1, name: "Alice" })
        expect(result.value.profile).toEqual({ bio: "Alice's profile" })
      }
    })

    it("should handle mixed sync and async monads", async () => {
      const result = await DoAsync(async function* () {
        const x = yield Option(5) // Sync monad
        const y = yield Promise.resolve(Option(10)) // Async monad
        const z = yield Right<string, number>(x + y) // Sync monad
        return Option(z * 2)
      })

      expect(result.isSome()).toBe(true)
      expect(result.get()).toBe(30)
    })

    it("should handle async None properly", async () => {
      await expect(
        DoAsync(async function* () {
          const x = yield Promise.resolve(Option(5))
          const y = yield Promise.resolve(Option(null)) // None
          return Option(x + y)
        }),
      ).rejects.toThrow("Cannot unwrap None in Do-notation")
    })

    it("should handle async Left properly", async () => {
      await expect(
        DoAsync(async function* () {
          const x = yield Promise.resolve(Right<string, number>(5))
          const y = yield Promise.resolve(Left<string, number>("async error"))
          return Right<string, number>(x + y)
        }),
      ).rejects.toThrow("Cannot unwrap Left in Do-notation")
    })

    it("should handle error recovery in async context", async () => {
      const result = await DoAsync(async function* () {
        try {
          const x = yield Promise.resolve(Option(null)) // Will throw
          return Option(x)
        } catch (e) {
          // Recover with default value
          return Option(100)
        }
      })

      expect(result.isSome()).toBe(true)
      expect(result.get()).toBe(100)
    })
  })

  describe("Real-world scenarios", () => {
    it("should handle user registration flow", () => {
      const validateEmail = (email: string) =>
        email.includes("@") && email.includes(".") ? Option(email) : Option.none()

      const checkEmailAvailable = (email: string) =>
        email !== "taken@example.com"
          ? Right<Error, string>(email)
          : Left<Error, string>(new Error("Email already taken"))

      const hashPassword = (password: string) => (password.length >= 8 ? Option(`hashed_${password}`) : Option.none())

      const createUser = (email: string, hashedPw: string) =>
        Right<Error, { id: number; email: string; password: string }>({
          id: Math.floor(Math.random() * 1000),
          email,
          password: hashedPw,
        })

      const sendWelcomeEmail = (user: { email: string }) => Option({ sent: true, to: user.email })

      const registerUser = (email: string, password: string) => {
        try {
          return Do(function* () {
            const validEmail = yield validateEmail(email)
            const availableEmail = yield checkEmailAvailable(validEmail)
            const hashedPw = yield hashPassword(password)
            const user = yield createUser(availableEmail, hashedPw)
            const emailResult = yield sendWelcomeEmail(user)

            return Right({
              user,
              emailSent: emailResult,
              status: "success" as const,
            })
          })
        } catch (e) {
          const error = e as Error
          if (error.name === "NoneError") {
            return Left<Error, any>(new Error("Invalid input"))
          }
          if (error.name === "LeftError") {
            return Left<Error, any>((e as LeftErrorType<Error>).value)
          }
          return Left<Error, any>(new Error("Registration failed"))
        }
      }

      // Test successful registration
      const successResult = registerUser("newuser@example.com", "password123")
      expect(successResult.isRight()).toBe(true)
      if (successResult.isRight()) {
        expect(successResult.value.status).toBe("success")
        expect(successResult.value.user.email).toBe("newuser@example.com")
        expect(successResult.value.emailSent.sent).toBe(true)
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

      const validateData = (data: any) =>
        data && typeof data === "object" && "value" in data
          ? Right<string, { value: number }>(data)
          : Left<string, any>("Invalid data structure")

      const processValue = (data: { value: number }) => Option(data.value > 0 ? data.value * 2 : null)

      const pipeline = (jsonString: string) =>
        Do(function* () {
          const parsed = yield parseJSON(jsonString)
          const validated = yield validateData(parsed)
          const processed = yield processValue(validated)
          return Option(processed)
        })

      // Valid data
      const validResult = pipeline('{"value": 10}')
      expect(validResult.isSome()).toBe(true)
      expect(validResult.get()).toBe(20)

      // Invalid JSON
      expect(() => pipeline("invalid json")).toThrow()

      // Invalid structure
      expect(() => pipeline('{"other": 10}')).toThrow("Cannot unwrap Left in Do-notation")

      // Negative value
      expect(() => pipeline('{"value": -5}')).toThrow("Cannot unwrap None in Do-notation")
    })
  })

  describe("Loops in Do-notation", () => {
    it("should support for loops with yielding", () => {
      const result = Do(function* () {
        const items = [1, 2, 3, 4, 5]
        let sum = 0

        for (const item of items) {
          const doubled = yield Option(item * 2)
          sum += doubled
        }

        return Option(sum)
      })

      expect(result.isSome()).toBe(true)
      expect(result.get()).toBe(30) // (1+2+3+4+5) * 2
    })

    it("should short-circuit loop on None", () => {
      expect(() =>
        Do(function* () {
          const items = [1, 2, null, 4, 5]
          let sum = 0

          for (const item of items) {
            const value = yield Option(item) // Will fail on null
            sum += value
          }

          return Option(sum)
        }),
      ).toThrow("Cannot unwrap None in Do-notation")
    })
  })
})
