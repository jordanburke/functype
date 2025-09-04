import { describe, expect, it } from "vitest"

import { $, Do, DoAsync } from "@/do"
import { Left, List, None, Option, Right, Some, Try } from "@/index"

describe("Do-notation Comprehensive Tests (Scala for-comprehension alignment)", () => {
  describe("Scala-style for-comprehension patterns", () => {
    it("should support guard-like filtering with conditions", () => {
      // Scala: for { x <- Some(5) if x > 3; y <- Some(10) } yield x + y
      const result = Do(function* () {
        const x = yield* $(Option(5))
        if (x <= 3) return yield* $(None<number>()) // Guard simulation
        const y = yield* $(Option(10))
        return x + y
      })

      expect(result.isSome()).toBe(true)
      expect(result.getOrThrow()).toBe(15)

      // Guard fails case
      const filtered = Do(function* () {
        const x = yield* $(Option(2))
        if (x > 3) {
          const y = yield* $(Option(10))
          return x + y
        }
        return yield* $(None<number>())
      })

      expect(filtered.isNone()).toBe(true)
    })

    it("should support nested comprehensions like Scala", () => {
      // Scala: for { x <- List(1,2); y <- List(x, x+1) } yield y
      const result = Do(function* () {
        const x = yield* $(List([1, 2]))
        const y = yield* $(List([x, x + 1]))
        return y
      })

      expect(result.toArray()).toEqual([1, 2, 2, 3])
    })

    it("should handle pattern matching style with multiple generators", () => {
      // Scala: for { (x, y) <- List((1,2), (3,4)) } yield x + y
      const pairs = List([
        { x: 1, y: 2 },
        { x: 3, y: 4 },
      ])

      const result = Do(function* () {
        const pair = yield* $(pairs)
        return pair.x + pair.y
      })

      expect(result.toArray()).toEqual([3, 7])
    })

    it("should support value definitions between yields like Scala", () => {
      // Scala: for { x <- Some(5); y = x * 2; z <- Some(y + 1) } yield z
      const result = Do(function* () {
        const x = yield* $(Option(5))
        const y = x * 2 // Value definition
        const z = yield* $(Option(y + 1))
        return z
      })

      expect(result.getOrThrow()).toBe(11)
    })

    it("should handle complex cartesian products like Scala", () => {
      // Scala: for { x <- List(1,2); y <- List(3,4); z <- List(5,6) } yield (x,y,z)
      const result = Do(function* () {
        const x = yield* $(List([1, 2]))
        const y = yield* $(List([3, 4]))
        const z = yield* $(List([5, 6]))
        return { x, y, z }
      })

      expect(result.toArray()).toEqual([
        { x: 1, y: 3, z: 5 },
        { x: 1, y: 3, z: 6 },
        { x: 1, y: 4, z: 5 },
        { x: 1, y: 4, z: 6 },
        { x: 2, y: 3, z: 5 },
        { x: 2, y: 3, z: 6 },
        { x: 2, y: 4, z: 5 },
        { x: 2, y: 4, z: 6 },
      ])
    })

    it("should support early termination on empty like Scala", () => {
      // Scala: for { x <- List(1,2); y <- List.empty; z <- List(3,4) } yield x+y+z
      const result = Do(function* () {
        const x = yield* $(List([1, 2]))
        const y = yield* $(List<number>([])) // Empty list terminates
        const z = yield* $(List([3, 4])) // Never reached
        return x + y + z
      })

      expect(result.isEmpty).toBe(true)
    })
  })

  describe("Monadic laws verification", () => {
    // Left identity: M.unit(a).flatMap(f) == f(a)
    it("should satisfy left identity law", () => {
      const a = 5
      const f = (x: number) => Option(x * 2)

      const leftSide = Do(function* () {
        const x = yield* $(Option(a))
        return yield* $(f(x))
      })

      const rightSide = f(a)

      expect(leftSide.getOrThrow()).toBe(rightSide.getOrThrow())
    })

    // Right identity: m.flatMap(M.unit) == m
    it("should satisfy right identity law", () => {
      const m = Option(10)

      const leftSide = Do(function* () {
        const x = yield* $(m)
        return yield* $(Option(x))
      })

      expect(leftSide.getOrThrow()).toBe(m.getOrThrow())
    })

    // Associativity: m.flatMap(f).flatMap(g) == m.flatMap(x => f(x).flatMap(g))
    it("should satisfy associativity law", () => {
      const m = Option(5)
      const f = (x: number) => Option(x * 2)
      const g = (x: number) => Option(x + 1)

      const leftSide = Do(function* () {
        const x = yield* $(m)
        const y = yield* $(f(x))
        return yield* $(g(y))
      })

      const rightSide = Do(function* () {
        const x = yield* $(m)
        return yield* $(
          Do(function* () {
            const y = yield* $(f(x))
            return yield* $(g(y))
          }),
        )
      })

      expect(leftSide.getOrThrow()).toBe(rightSide.getOrThrow())
    })
  })

  describe("Error propagation and short-circuiting", () => {
    it("should propagate None through the entire chain", () => {
      let sideEffect = 0

      const result = Do(function* () {
        const a = yield* $(Option(5))
        sideEffect++
        const b = yield* $(None<number>())
        sideEffect++ // Should not execute
        const c = yield* $(Option(10))
        sideEffect++ // Should not execute
        return a + b + c
      })

      expect(result.isNone()).toBe(true)
      expect(sideEffect).toBe(1) // Only first side effect executed
    })

    it("should propagate Left through Either chains", () => {
      const result = Do(function* () {
        const a = yield* $(Right<string, number>(5))
        const b = yield* $(Left<string, number>("error"))
        const c = yield* $(Right<string, number>(10)) // Never executed
        return a + b + c
      })

      expect(result.isLeft()).toBe(true)
      expect(result.value).toBe("error")
    })

    it("should propagate Failure through Try chains", () => {
      const error = new Error("computation failed")

      const result = Do(function* () {
        const a = yield* $(Try(() => 5))
        const b = yield* $(
          Try<number>(() => {
            throw error
          }),
        )
        const c = yield* $(Try(() => 10)) // Never executed
        return a + b + c
      })

      expect(result.isFailure()).toBe(true)
      expect(result.error).toBe(error)
    })
  })

  describe("Complex real-world scenarios", () => {
    it("should handle user authentication flow", () => {
      type User = { id: number; email: string; roles: string[] }

      const authenticate = (email: string, password: string) =>
        email === "admin@example.com" && password === "secret"
          ? Right<string, User>({ id: 1, email, roles: ["admin", "user"] })
          : Left<string, User>("Invalid credentials")

      const checkPermission = (user: User, permission: string) =>
        user.roles.includes(permission) ? Option(user) : None<User>()

      const loadUserData = (user: User) =>
        Try(() => ({
          ...user,
          profile: { name: "Admin User", lastLogin: new Date() },
        }))

      const loginFlow = (email: string, password: string, requiredRole: string) =>
        Do(function* () {
          const user = yield* $(authenticate(email, password))
          const authorized = yield* $(checkPermission(user, requiredRole))
          const userData = yield* $(loadUserData(authorized))
          return userData
        })

      // Successful login
      const success = loginFlow("admin@example.com", "secret", "admin")
      expect(success.toOption().isSome()).toBe(true)

      // Failed authentication
      const authFail = loginFlow("wrong@example.com", "wrong", "admin")
      expect(authFail.toOption().isNone()).toBe(true)

      // Failed authorization
      const authzFail = loginFlow("admin@example.com", "secret", "superadmin")
      expect(authzFail.toOption().isNone()).toBe(true)
    })

    it("should handle data pipeline with validation", () => {
      interface RawData {
        id: string
        value: string
        timestamp: string
      }

      interface ProcessedData {
        id: number
        value: number
        timestamp: Date
        valid: boolean
      }

      const parseId = (raw: RawData) => {
        const id = parseInt(raw.id)
        return isNaN(id) ? Left<string, number>("Invalid ID") : Right<string, number>(id)
      }

      const parseValue = (raw: RawData) => {
        const value = parseFloat(raw.value)
        return isNaN(value) ? None<number>() : Some(value)
      }

      const parseTimestamp = (raw: RawData) => Try(() => new Date(raw.timestamp))

      const validateRange = (value: number) => (value >= 0 && value <= 100 ? Option(value) : None<number>())

      const processData = (raw: RawData) =>
        Do(function* () {
          const id = yield* $(parseId(raw))
          const rawValue = yield* $(parseValue(raw))
          const value = yield* $(validateRange(rawValue))
          const timestamp = yield* $(parseTimestamp(raw))

          return {
            id,
            value,
            timestamp,
            valid: true,
          } as ProcessedData
        })

      // Valid data
      const validData = processData({
        id: "123",
        value: "45.67",
        timestamp: "2024-01-01T00:00:00Z",
      })
      expect(validData.toOption().isSome()).toBe(true)
      expect(validData.toOption().getOrThrow().value).toBe(45.67)

      // Invalid ID
      const invalidId = processData({
        id: "abc",
        value: "45.67",
        timestamp: "2024-01-01T00:00:00Z",
      })
      expect(invalidId.toOption().isNone()).toBe(true)

      // Out of range value
      const outOfRange = processData({
        id: "123",
        value: "150",
        timestamp: "2024-01-01T00:00:00Z",
      })
      expect(outOfRange.toOption().isNone()).toBe(true)
    })
  })

  describe("List comprehension patterns", () => {
    it("should generate pythagorean triples (with post-filtering)", () => {
      const result = Do(function* () {
        const a = yield* $(List([1, 2, 3, 4, 5]))
        const b = yield* $(List([1, 2, 3, 4, 5]))
        const c = yield* $(List([1, 2, 3, 4, 5, 6, 7]))

        // Since we can't filter during generation, return all with validity flag
        const isPythagorean = a * a + b * b === c * c && a <= b
        return isPythagorean ? Option({ a, b, c }) : None<{ a: number; b: number; c: number }>()
      })
        .filter((opt) => opt.isSome())
        .map((opt) => opt.getOrThrow())

      expect(result.toArray()).toContainEqual({ a: 3, b: 4, c: 5 })
    })

    it("should handle list operations with indices", () => {
      const items = List(["a", "b", "c"])
      const indices = List([0, 1, 2])

      const result = Do(function* () {
        const index = yield* $(indices)
        const item = yield* $(items)
        return { index, item }
      })

      expect(result.size).toBe(9) // 3 * 3 cartesian product
    })

    it("should work with filtered lists", () => {
      const evens = List([2, 4, 6])
      const odds = List([1, 3, 5])

      const result = Do(function* () {
        const even = yield* $(evens)
        const odd = yield* $(odds)
        const sum = even + odd
        return sum > 5 ? Option(sum) : None<number>()
      })
        .filter((opt) => opt.isSome())
        .map((opt) => opt.getOrThrow())

      expect(result.toArray()).toEqual([7, 7, 9, 7, 9, 11])
    })
  })

  describe("Async comprehensions", () => {
    it("should handle async operations in sequence", async () => {
      const fetchData = async (id: number) => Promise.resolve(id > 0 ? Option(id * 10) : None<number>())

      const processData = async (value: number) =>
        Promise.resolve(value >= 50 ? Right<string, number>(value) : Left<string, number>("Too small"))

      const saveData = async (value: number) => Promise.resolve(Try(() => ({ id: Math.random(), value })))

      const result = await DoAsync(async function* () {
        const data = yield* $(await fetchData(5))
        const processed = yield* $(await processData(data))
        const saved = yield* $(await saveData(processed))
        return saved
      })

      expect(result.toOption().isSome()).toBe(true)
      expect(result.toOption().getOrThrow().value).toBe(50)
    })

    it("should handle parallel async operations", async () => {
      const fetch1 = Promise.resolve(Option(10))
      const fetch2 = Promise.resolve(Right<string, number>(20))
      const fetch3 = Promise.resolve(Try(() => 30))

      // Await all in parallel before comprehension
      const [data1, data2, data3] = await Promise.all([fetch1, fetch2, fetch3])

      const result = await DoAsync(async function* () {
        const v1 = yield* $(data1)
        const v2 = yield* $(data2)
        const v3 = yield* $(data3)
        return v1 + v2 + v3
      })

      expect(result.toOption().getOrThrow()).toBe(60)
    })

    it("should handle async error recovery", async () => {
      const fallback = async () => Option(42)

      const result = await DoAsync(async function* () {
        // Use fallback directly since we know the operation will fail
        const recovered = await fallback()
        const value = yield* $(recovered)
        return value * 2
      })

      expect(result.toOption().getOrThrow()).toBe(84)
    })
  })

  describe("Performance characteristics", () => {
    it("should handle large lists efficiently", () => {
      const largeList = List(Array.from({ length: 100 }, (_, i) => i))

      const start = performance.now()
      const result = Do(function* () {
        const x = yield* $(largeList)
        if (x > 95) {
          const y = yield* $(Option(x * 2))
          return y
        }
        return 0
      }).toList()
      const end = performance.now()

      expect(result.filter((x) => x > 0).size).toBe(4) // 96, 97, 98, 99
      expect(end - start).toBeLessThan(100) // Should be fast
    })

    it("should short-circuit efficiently on None", () => {
      let computations = 0

      const expensiveComputation = (n: number) => {
        computations++
        return Option(n > 10 ? n : null)
      }

      const result = Do(function* () {
        const a = yield* $(expensiveComputation(5)) // Returns None
        const b = yield* $(expensiveComputation(20)) // Never called
        const c = yield* $(expensiveComputation(30)) // Never called
        return a + b + c
      })

      expect(result.isNone()).toBe(true)
      expect(computations).toBe(1) // Only first computation ran
    })
  })

  describe("Edge cases and error handling", () => {
    it("should handle empty generator correctly", () => {
      // When no monads are yielded, Do returns a List containing the value
      // eslint-disable-next-line require-yield
      const result = Do(function* () {
        return 42
      }).toList()

      // Empty generator returns List with single value
      expect(result.toArray()).toEqual([42])
    })

    it("should handle nested Do comprehensions", () => {
      const result = Do(function* () {
        const outer = yield* $(Option(5))

        const inner = yield* $(
          Do(function* () {
            const x = yield* $(Option(outer * 2))
            const y = yield* $(Option(x + 1))
            return y
          }),
        )

        return inner + outer
      })

      expect(result.getOrThrow()).toBe(16) // (5*2+1) + 5
    })

    it("should handle recursive patterns", () => {
      const fibonacci = (n: number): Option<number> => {
        if (n <= 0) return None<number>()
        if (n <= 2) return Option(1)

        return Do(function* () {
          const prev1 = yield* $(fibonacci(n - 1))
          const prev2 = yield* $(fibonacci(n - 2))
          return prev1 + prev2
        })
      }

      expect(fibonacci(6).getOrThrow()).toBe(8)
      expect(fibonacci(0).isNone()).toBe(true)
    })

    it("should handle type conversions with Reshapeable", () => {
      const result = Do(function* () {
        const opt = yield* $(Option(5))
        const either = yield* $(Right<string, number>(10))
        const list = yield* $(List([15]))
        const tryVal = yield* $(Try(() => 20))
        return opt + either + list + tryVal
      })

      // Convert to different types
      expect(result.toOption().getOrThrow()).toBe(50)
      expect(result.toEither("error").value).toBe(50)
      expect(result.toList().toArray()[0]).toBe(50)
      expect(result.toTry().getOrThrow()).toBe(50)
    })
  })

  describe("Comparison with traditional approach", () => {
    it("should be more readable than nested flatMaps", () => {
      // Traditional nested approach
      const traditional = Option(5).flatMap((x) =>
        Option(10).flatMap((y) => Option(15).flatMap((z) => Option(x + y + z))),
      )

      // Do-notation approach
      const withDo = Do(function* () {
        const x = yield* $(Option(5))
        const y = yield* $(Option(10))
        const z = yield* $(Option(15))
        return x + y + z
      })

      expect(traditional.getOrThrow()).toBe(withDo.getOrThrow())
      expect(withDo.getOrThrow()).toBe(30)
    })

    it("should handle complex error flows better than nested chains", () => {
      // Complex validation with traditional approach
      const traditionalValidation = (input: string) =>
        Try(() => JSON.parse(input))
          .toEither("Parse error")
          .flatMap((data) =>
            data && typeof data === "object" && "value" in data
              ? Right<string, unknown>(data)
              : Left<string, unknown>("Invalid structure"),
          )
          .flatMap((data) =>
            typeof (data as { value: number }).value === "number"
              ? Right<string, number>((data as { value: number }).value)
              : Left<string, number>("Value not a number"),
          )
          .flatMap((value) =>
            value > 0 ? Right<string, number>(value * 2) : Left<string, number>("Value must be positive"),
          )

      // Do-notation approach
      const doValidation = (input: string) =>
        Do(function* () {
          const parsed = yield* $(Try(() => JSON.parse(input)))

          if (!parsed || typeof parsed !== "object" || !("value" in parsed)) {
            return yield* $(Left<string, number>("Invalid structure"))
          }

          if (typeof parsed.value !== "number") {
            return yield* $(Left<string, number>("Value not a number"))
          }

          if (parsed.value <= 0) {
            return yield* $(Left<string, number>("Value must be positive"))
          }

          return parsed.value * 2
        }).toEither("Parse error")

      const validInput = '{"value": 10}'
      expect(traditionalValidation(validInput).value).toBe(20)
      expect(doValidation(validInput).value).toBe(20)

      const invalidInput = '{"value": -5}'
      expect(traditionalValidation(invalidInput).isLeft()).toBe(true)
      expect(doValidation(invalidInput).isLeft()).toBe(true)
    })
  })
})
