import { describe, expect, it } from "vitest"

import { None, Option, Some } from "../../src/option/Option"

describe("Option pipe", () => {
  it("should pipe Some value through function", () => {
    const some = Some(5)
    const result = some.pipe((value) => value * 2)
    expect(result).toBe(10)
  })

  it("should pipe None value through function", () => {
    const none = None<number>()
    // When piping None, we get undefined as the input to our function
    const result = none.pipe((value) => {
      // value is undefined as never, but we can still return something
      return 42
    })
    expect(result).toBe(42)
  })

  it("should pipe Some value through complex functions", () => {
    const some = Some("hello")
    const result = some.pipe((value) => value.toUpperCase().split("").reverse().join(""))
    expect(result).toBe("OLLEH")
  })

  it("should compose operations", () => {
    const some = Some(5)
    const doubled = some.pipe((value) => value * 2)
    const result = doubled.toString() + "!"

    expect(result).toBe("10!")
  })

  it("should work with Option factory function", () => {
    const option = Option(10)
    const result = option.pipe((value) => value * 3)
    expect(result).toBe(30)

    const none = Option(null)
    const noneResult = none.pipe((value) => {
      // value is undefined here
      return "default"
    })
    expect(noneResult).toBe("default")
  })
})
