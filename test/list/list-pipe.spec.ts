import { describe, expect, it } from "vitest"

import { List } from "../../src/list/List"

describe("List pipe", () => {
  it("should pipe list value through function", () => {
    const list = List([1, 2, 3, 4, 5])
    const result = list.pipe((value) => value.reduce((a, b) => a + b, 0))
    expect(result).toBe(15)
  })

  it("should pipe empty list through function", () => {
    const emptyList = List<number>([])
    const result = emptyList.pipe((value) => {
      // value is an empty array
      return value.length === 0 ? "empty" : "not empty"
    })
    expect(result).toBe("empty")
  })

  it("should pipe list through complex functions", () => {
    const list = List(["hello", "world"])
    const result = list.pipe((value) => value.map((str) => str.toUpperCase()).join("-"))
    expect(result).toBe("HELLO-WORLD")
  })

  it("should preserve values through piping", () => {
    const list = List([1, 2, 3])
    const original = list.toArray()

    // Pipe should not modify original list
    list.pipe((arr) => {
      arr.push(4)
      return arr
    })

    expect(list.toArray()).toEqual(original)
  })

  it("should enable transformations", () => {
    const list = List([1, 2, 3, 4, 5])

    const result = list.pipe((arr) => {
      return {
        sum: arr.reduce((a, b) => a + b, 0),
        average: arr.reduce((a, b) => a + b, 0) / arr.length,
        min: Math.min(...arr),
        max: Math.max(...arr),
      }
    })

    expect(result).toEqual({
      sum: 15,
      average: 3,
      min: 1,
      max: 5,
    })
  })
})
