import { None, option } from "../../src"
import { Option } from "../../src"

describe("Option", () => {
  beforeEach(async () => {
    // Nothing
  })

  const something: Option<string> = option<string>("hello")
  const nothing: Option<string> = option()

  it("parse valid number", () => {
    expect(something.getOrElse("world")).toBe("hello")
  })

  it("map on Some", () => {
    expect(something.map((s) => s.length).getOrElse(0)).toBe(5)
  })

  it("parse invalid number", () => {
    expect(nothing.getOrElse("world")).toBe("world")
  })

  it("map on None", () => {
    expect(nothing.map(() => 10)).toEqual(None())
  })
})
