import { describe, expect, it } from "vitest"

import { Set } from "@/set/Set"

describe("Set pipe", () => {
  it("should pipe set values through function", () => {
    const set = Set([1, 2, 3, 4, 5])
    const result = set.pipe((values) => values.reduce((a, b) => a + b, 0))
    expect(result).toBe(15)
  })

  it("should pipe empty set through function", () => {
    const emptySet = Set<number>([])
    const result = emptySet.pipe((values) => {
      // values is an empty array
      return values.length === 0 ? "empty" : "not empty"
    })
    expect(result).toBe("empty")
  })

  it("should pipe set through complex functions", () => {
    const set = Set(["hello", "world"])
    const result = set.pipe((values) => values.map((str) => str.toUpperCase()).join("-"))
    expect(result).toBe("HELLO-WORLD")
  })

  it("should preserve set values through piping", () => {
    const set = Set([1, 2, 3])
    const original = [...set]

    // Pipe should not modify original set
    set.pipe((arr) => {
      arr.push(4)
      return arr
    })

    expect([...set]).toEqual(original)
  })

  it("should enable set analytics", () => {
    const set = Set([1, 2, 3, 4, 5])

    const result = set.pipe((values) => {
      return {
        sum: values.reduce((a, b) => a + b, 0),
        average: values.reduce((a, b) => a + b, 0) / values.length,
        min: Math.min(...values),
        max: Math.max(...values),
      }
    })

    expect(result).toEqual({
      sum: 15,
      average: 3,
      min: 1,
      max: 5,
    })
  })

  it("should work with filtering operations", () => {
    const set = Set([1, 2, 3, 4, 5, 6, 7, 8, 9, 10])

    const result = set.pipe((values) => {
      const even = values.filter((n) => n % 2 === 0)
      const odd = values.filter((n) => n % 2 !== 0)

      return {
        even,
        odd,
        evenSum: even.reduce((a, b) => a + b, 0),
        oddSum: odd.reduce((a, b) => a + b, 0),
      }
    })

    expect(result).toEqual({
      even: [2, 4, 6, 8, 10],
      odd: [1, 3, 5, 7, 9],
      evenSum: 30,
      oddSum: 25,
    })
  })
})
