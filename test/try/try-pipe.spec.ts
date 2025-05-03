import { describe, expect, it } from "vitest"

import { Try } from "../../src/try/Try"

describe("Try pipe", () => {
  it("should pipe successful values through functions", () => {
    const success = Try(() => 42)
    const result = success.pipe((value) => value * 2)
    expect(result).toBe(84)
  })

  it("should pipe successful values through complex functions", () => {
    const success = Try(() => "hello")
    const result = success.pipe((value) => value.toUpperCase().split("").reverse().join(""))
    expect(result).toBe("OLLEH")
  })

  it("should throw when piping a failure", () => {
    const failure = Try(() => {
      throw new Error("Something went wrong")
    })

    expect(() => {
      failure.pipe((value) => value)
    }).toThrow("Something went wrong")
  })

  it("should allow transforming values", () => {
    const success = Try(() => ({ name: "John", age: 30 }))

    const result = success.pipe((person) => ({
      displayName: `${person.name}, ${person.age}`,
      isAdult: person.age >= 18,
    }))

    expect(result).toEqual({
      displayName: "John, 30",
      isAdult: true,
    })
  })

  it("should work with Try.prototype.map for successful operations", () => {
    const success = Try(() => 10)

    // Using map
    const mapResult = success.map((x) => x * 3)
    expect(mapResult.get()).toBe(30)

    // Using pipe
    const pipeResult = success.pipe((x) => x * 3)
    expect(pipeResult).toBe(30)
  })

  it("should work with Try companion for handling results of operations", () => {
    const parseNumber = (str: string) =>
      Try(() => {
        const num = parseInt(str, 10)
        if (isNaN(num)) throw new Error(`Cannot parse '${str}' as number`)
        return num
      })

    const validResult = parseNumber("42").pipe((num) => num.toString(16))
    expect(validResult).toBe("2a")

    const invalidOp = parseNumber("not a number")
    expect(() => {
      invalidOp.pipe((num) => num.toString(16))
    }).toThrow("Cannot parse 'not a number' as number")
  })
})
