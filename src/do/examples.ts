/**
 * Comprehensive examples of Do-notation usage in functype
 * Shows different patterns for working with monadic comprehensions
 */

import { $, Do, DoAsync } from "@/do"
import type { Either } from "@/index"
import { Left, List, None, Option, Right, Try } from "@/index"

// ============================================================
// Basic Do-notation Examples
// ============================================================

/**
 * Example 1: Simple Option chaining
 * Shows how Do-notation eliminates nested flatMap calls
 */
export function optionExample() {
  // Traditional nested approach
  const traditional = Option(5).flatMap((x) => Option(10).flatMap((y) => Option(x + y)))

  // Do-notation approach with type assertions
  const withAssertions = Do(function* () {
    const x = (yield Option(5)) as unknown as number
    const y = (yield Option(10)) as unknown as number
    return x + y
  })

  // Do-notation with $ helper (recommended)
  const withDollar = Do(function* () {
    const x = yield* $(Option(5)) // x: number (inferred!)
    const y = yield* $(Option(10)) // y: number (inferred!)
    return x + y
  })

  return { traditional, withAssertions, withDollar }
}

/**
 * Example 2: Either error handling
 * Shows how Do-notation propagates errors automatically
 */
export function eitherExample(userId: number) {
  type User = { id: number; name: string; email: string }
  type Profile = { bio: string; avatar: string }

  const getUser = (id: number): Either<string, User> =>
    id > 0 ? Right({ id, name: "Alice", email: "alice@example.com" }) : Left("User not found")

  const getProfile = (user: User): Either<string, Profile> =>
    user.id === 1 ? Right({ bio: "Software developer", avatar: "avatar.jpg" }) : Left("Profile not found")

  // Do-notation automatically propagates Left values
  const result = Do(function* () {
    const user = yield* $(getUser(userId)) // user: User
    const profile = yield* $(getProfile(user as User)) // profile: Profile
    return { user, profile }
  })

  return result
}

/**
 * Example 3: List comprehensions with cartesian products
 * Shows how Do-notation handles multiple Lists like Scala for-comprehensions
 */
export function listComprehensionExample() {
  // Traditional approach with nested flatMaps
  const traditional = List([1, 2]).flatMap((x) => List([10, 20]).flatMap((y) => List([x + y])))

  // Do-notation approach - produces cartesian product
  // IMPORTANT: When Lists are yielded, Do returns a List!
  const withDo = Do(function* () {
    const x = yield* $(List([1, 2])) // x: number (iterates: 1, 2)
    const y = yield* $(List([10, 20])) // y: number (iterates: 10, 20)
    return x + y
  })
  // withDo is List([11, 21, 12, 22]) - all combinations!

  // Three-way cartesian product
  const threeWay = Do(function* () {
    const x = yield* $(List([1, 2])) // x: number (inferred!)
    const y = yield* $(List([3, 4])) // y: number (inferred!)
    const z = yield* $(List([5, 6])) // z: number (inferred!)
    return x * 100 + y * 10 + z
  })
  // threeWay is List([135, 136, 145, 146, 235, 236, 245, 246])

  // Example that returns List of objects (full cartesian product)
  const pairs = Do(function* () {
    const x = yield* $(List([1, 2, 3])) // 3 values
    const y = yield* $(List([10, 20])) // 2 values
    return { x, y, product: x * y }
  })
  // pairs is List with ALL 6 combinations (3 * 2):
  // [{x:1,y:10,product:10}, {x:1,y:20,product:20},
  //  {x:2,y:10,product:20}, {x:2,y:20,product:40},
  //  {x:3,y:10,product:30}, {x:3,y:20,product:60}]

  return { traditional, withDo, threeWay, pairs }
}

/**
 * Example 4: Mixed monad types
 * Shows how different monad types can be combined in a single comprehension
 * Note: Always returns List, even with mixed types
 */
export function mixedMonadsExample(data: { userId?: number; multiplier: number }) {
  const result = Do(function* () {
    // Extract optional user ID
    const userId = yield* $(Option(data.userId)) // userId: number (inferred!)

    // Try to parse something that might fail
    const parsed = yield* $(
      Try(() => {
        if (data.multiplier === 0) throw new Error("Invalid multiplier")
        return 100 / data.multiplier
      }),
    ) // parsed: number

    // Use Either for business logic
    const validated = (yield* $(parsed > 0 ? Right(parsed) : Left("Negative result"))) as number // Complex conditional needs hint

    return userId * validated
  })

  // For single values from mixed monads, use .head
  return result.head
}

/**
 * Example 5: Error recovery with try/catch
 * Shows how to handle errors within Do-notation
 */
export function errorRecoveryExample() {
  const result = Do(function* () {
    // Try to get value, catch error if None
    const valueOrDefault = (() => {
      try {
        // This might fail if None - we'll handle it outside IIFE
        const temp = Option(null as number | null)
        // Check if it's None before yielding
        if (temp.isNone()) {
          return 0
        }
        return temp.get()
      } catch {
        return 0
      }
    })()

    // Continue with computation
    const multiplied = yield* $(Option(valueOrDefault * 2))
    return multiplied
  })

  return result.getOrElse(0) // Returns 0 (recovered from None)
}

/**
 * Example 6: Async Do-notation
 * Shows how to work with Promises in Do-notation
 */
export async function asyncExample() {
  // Simulate async operations
  const fetchUser = async (id: number): Promise<Option<{ name: string }>> =>
    Promise.resolve(id > 0 ? Option({ name: "Alice" }) : None<{ name: string }>())

  const fetchScore = async (name: string): Promise<Either<string, number>> =>
    Promise.resolve(name === "Alice" ? Right(95) : Left("Unknown user"))

  const result = await DoAsync(async function* () {
    // Await async operations and unwrap monads
    const user = (yield await fetchUser(1)) as { name: string } // user: { name: string }
    const score = (yield await fetchScore(user.name)) as number // score: number

    // Can also yield synchronous monads
    const bonus = (yield Option(5)) as number // bonus: number

    return score + bonus
  })

  return result // Returns 100
}

/**
 * Example 7: Cartesian product with conditional results
 * Shows that Do always produces cartesian products, even with conditions
 */
export function cartesianWithConditionExample() {
  // Do always produces the full cartesian product
  const result = Do(function* () {
    const x = yield* $(List([1, 2, 3, 4, 5])) // x: number (inferred!)
    const y = yield* $(List([1, 2, 3, 4, 5])) // y: number (inferred!)

    // Conditional logic affects the returned value, NOT the iteration
    if (x < y) {
      return { x, y, sum: x + y }
    } else {
      return { x, y, sum: 0 } // Still returns a value for every combination
    }
  })

  // result contains ALL 25 combinations (5x5), not filtered!
  // List([{x:1,y:1,sum:0}, {x:1,y:2,sum:3}, {x:1,y:3,sum:4}, ...])

  return result
}

/**
 * Example 7b: Pythagorean triples attempt (shows limitation)
 * Do-notation always produces full cartesian product - cannot filter during iteration
 */
export function pythagoreanTriplesAttempt() {
  // This will check ALL combinations (10 * 10 * 15 = 1500 results!)
  const allCombinations = Do(function* () {
    const a = yield* $(List([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]))
    const b = yield* $(List([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]))
    const c = yield* $(List([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15]))

    // This returns a value for EVERY combination, not just Pythagorean triples
    const isPythagorean = a * a + b * b === c * c && a < b
    return { a, b, c, valid: isPythagorean }
  })

  // Returns List with 1500 items, most with valid: false
  // To get actual Pythagorean triples, you'd need to filter afterwards:
  // const triples = allCombinations.filter(t => t.valid)

  return allCombinations
}

/**
 * Example 8: Real-world user validation
 * Shows a practical example of validating user input
 */
export function userValidationExample(input: { email?: string; age?: number; country?: string }) {
  // Validation functions
  const validateEmail = (email: string): Either<string, string> =>
    email.includes("@") ? Right(email) : Left("Invalid email")

  const validateAge = (age: number): Either<string, number> => (age >= 18 ? Right(age) : Left("Must be 18 or older"))

  const validateCountry = (country: string): Either<string, string> => {
    const allowed = ["US", "UK", "CA", "AU"]
    return allowed.includes(country) ? Right(country) : Left("Country not supported")
  }

  // Compose validations using Do-notation
  const result = Do(function* () {
    // Extract optional values
    const email = yield* $(Option(input.email))
    const age = yield* $(Option(input.age))
    const country = yield* $(Option(input.country))

    // Validate each field
    const validEmail = yield* $(validateEmail(email))
    const validAge = yield* $(validateAge(age))
    const validCountry = yield* $(validateCountry(country))

    // Return validated user
    return {
      email: validEmail,
      age: validAge,
      country: validCountry,
      createdAt: new Date(),
    }
  })

  return result
}

/**
 * Example 9: Nested Do-notation
 * Shows how Do-notation can be nested for complex logic
 */
export function nestedDoExample() {
  const outer = Do(function* () {
    const x = yield* $(Option(5))

    // Nested Do for inner computation (returns List)
    const inner = Do(function* () {
      const y = yield* $(Option(10))
      const z = yield* $(Option(15))
      return y + z
    }).getOrElse(0) // Get single value from inner Do

    const innerResult = yield* $(Option(inner))
    return x + innerResult
  })

  return outer.getOrElse(0) // Returns 30
}

/**
 * Example 10: Working with custom monads
 * Shows how any type implementing DoProtocol can be used
 */
export function customMonadExample() {
  // Any type that implements DoProtocol can be used in Do-notation
  // The protocol is automatically added via the Base function

  const result = Do(function* () {
    // All functype monads work out of the box
    const opt = yield* $(Option(42))
    const either = yield* $(Right("hello"))
    const list = yield* $(List([1, 2, 3])) // Creates cartesian product with all 3 values!
    const tryVal = yield* $(Try(() => 100))

    return `${either}: ${opt + list + tryVal}`
  })
  // Returns List(["hello: 143", "hello: 144", "hello: 145"])

  return result // Returns List of 3 strings
}

// ============================================================
// Usage Patterns Summary
// ============================================================

/**
 * Best Practices:
 *
 * 1. Use $ helper for clean extraction:
 *    const x = yield* $(Option(5))  // x: number
 *
 * 2. Use type assertions when inference fails:
 *    const x = yield* $(complexMonad) as string
 *
 * 3. Alternative: Use direct yield with type assertions:
 *    const x = yield Option(5) as unknown as number
 *
 * 4. Remember List comprehensions produce cartesian products
 *
 * 5. Error recovery is possible with try/catch blocks
 *
 * 6. DoAsync supports both Promises and regular monads
 *
 * 7. All functype monads (Option, Either, List, Try) work automatically
 */

// Export a test function to verify examples work
export function runAllExamples() {
  console.log("Option example:", optionExample())
  console.log("Either example (valid):", eitherExample(1))
  console.log("Either example (invalid):", eitherExample(-1))
  console.log("List comprehension:", listComprehensionExample())
  console.log("Error recovery:", errorRecoveryExample())
  console.log("Nested Do:", nestedDoExample())
  console.log("Custom monad:", customMonadExample())

  // Async example needs to be awaited
  void asyncExample().then((result) => console.log("Async example:", result))
}
