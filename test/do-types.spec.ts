import { describe, it, expect } from "vitest"
import { Do, $ } from "@/do"
import { Option, List } from "@/index"

describe("Do-notation type helpers", () => {
  it("should work with $ helper for type inference", () => {
    const result = Do(function* () {
      // Using $ helper - provides type inference
      const x = yield* $(Option(5)) // x: number
      const z = yield* $(List([10, 20])) // z: number
      return x + z
    }) as Option<number> // Type assertion needed for mixed types

    // First monad wins - Option(5) makes this an Option comprehension
    // List([10, 20]) is treated as having value 10 (head)
    expect(result.isSome()).toBe(true)
    expect(result.get()).toBe(15) // 5 + 10 (first element of list)
  })

  it("should work with $ helper for different monad types", () => {
    const result = Do(function* () {
      // $ works with different monad types
      const x = yield* $(Option(5)) // Should infer: number
      const y = yield* $(List(["hello"])) // Should infer: string

      // If types are inferred correctly, these operations should work
      // Note: In practice, TypeScript may still show 'unknown' in IDE
      // but the runtime behavior is correct
      return (x as number) + (y as string).length
    }) as Option<number> // Type assertion for mixed types

    // First monad wins - Option makes this an Option comprehension
    expect(result.isSome()).toBe(true)
    expect(result.get()).toBe(10) // 5 + 5 (length of "hello")
  })

  it("should work with type assertions for simpler cases", () => {
    const result = Do(function* () {
      // Traditional approach with type assertions
      const x = yield Option(5) as unknown as number
      const y = yield List(["a", "b", "c"]) as unknown as string

      return x + y.length
    }) as Option<number>

    // First monad wins - Option comprehension
    expect(result.isSome()).toBe(true)
    expect(result.get()).toBe(6) // 5 + 1 (length of "a")
  })

  it("demonstrates the typing challenge", () => {
    // This test shows why typing is difficult
    const result = Do(function* () {
      // Without helpers, yielded values are 'unknown'
      const x = yield Option(5) // x: unknown
      const y = yield List([1, 2, 3]) // y: unknown

      // Must use type assertions or helpers
      return (x as number) + (y as number)
    }) as Option<number>

    // First monad wins - Option comprehension
    expect(result.isSome()).toBe(true)
    expect(result.get()).toBe(6) // 5 + 1
  })
})

describe("Do-notation with List comprehensions", () => {
  it("should handle cartesian products with type helpers", () => {
    const result = Do(function* () {
      // Even with List comprehensions, $ helper works
      const x = yield* $(List([1, 2])) // x: number
      const z = yield* $(List([10, 20])) // z: number
      return x + z
    })

    // Result is a List due to cartesian product
    expect(result.toArray()).toEqual([11, 21, 12, 22])
  })
})
