import { describe, expect, it } from "vitest"

import { Typeable } from "../../src/typeable/Typeable"
import { Valuable } from "../../src/valuable/Valuable"

describe("Valuable", () => {
  it("should create a Valuable with a value", () => {
    const val = Valuable({ _tag: "Test", value: 42 })
    expect(val.toValue()).toEqual({ _tag: "Test", value: 42 })
  })

  it("should handle complex values", () => {
    const complexValue = { a: 1, b: "test", c: [1, 2, 3] }
    const val = Valuable({ _tag: "Complex", value: complexValue })
    expect(val.toValue()).toEqual({ _tag: "Complex", value: complexValue })
  })

  it("should be composable with Typeable", () => {
    const typeable = Typeable({ _tag: "TypedValue" })
    const valuable = Valuable({ _tag: "TypedValue", value: "important data" })
    
    expect(typeable._tag).toBe("TypedValue")
    expect(valuable.toValue()._tag).toBe("TypedValue")
    expect(valuable.toValue().value).toBe("important data")
  })
})
