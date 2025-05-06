import { describe, expect, test } from "vitest"

import { Tuple } from "@/tuple"

describe("Tuple", () => {
  test("map should apply function to the tuple and return new Tuple", () => {
    const tuple = Tuple([1, 2, 3])
    const mapped = tuple.map((values) => values.map((x) => x * 2))
    expect(mapped.toArray()).toEqual([2, 4, 6])
  })

  test("flatMap should apply function to the tuple and return new Tuple", () => {
    const tuple = Tuple([1, "two", 3])
    const flatMapped = tuple.flatMap((values) =>
      Tuple(
        values.map((x) => {
          if (typeof x === "number") {
            return x * 2
          } else {
            return x + x
          }
        }),
      ),
    )
    expect(flatMapped.toArray()).toEqual([2, "twotwo", 6])
  })

  test("get should return the value at the specified index", () => {
    const tuple = Tuple([1, "two", true])
    expect(tuple.get(0)).toBe(1)
    expect(tuple.get(1)).toBe("two")
    expect(tuple.get(2)).toBe(true)
  })

  test("toArray should return the internal array", () => {
    const tuple = Tuple([1, "two", true])
    expect(tuple.toArray()).toEqual([1, "two", true])
  })

  test("should preserve literal types with const type parameters", () => {
    // This tests TypeScript's type inference - run tsc to verify
    const literalTuple = Tuple([1, "hello", true] as const)

    // With the enhanced implementation, TypeScript knows the exact type at each position
    const first = literalTuple.get(0)
    expect(first).toBe(1)
    // TypeScript would know first is exactly 1, not just number

    const second = literalTuple.get(1)
    expect(second).toBe("hello")
    // TypeScript would know second is exactly "hello", not just string
  })
})
