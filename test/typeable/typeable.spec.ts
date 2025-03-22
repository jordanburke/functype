import { describe, expect, it } from "vitest"

import { isTypeable, Typeable } from "../../src/typeable/Typeable"

describe("Typeable", () => {
  it("should create a Typeable with a tag", () => {
    const typed = Typeable({ _tag: "TestType", impl: {} })
    expect(typed._tag).toBe("TestType")
  })

  it("should support isTypeable for type checking", () => {
    const typed = Typeable({ _tag: "TestType", impl: {} })
    expect(isTypeable(typed, "TestType")).toBe(true)
    expect(isTypeable(typed, "OtherType")).toBe(false)
  })

  it("should work with different tag types", () => {
    const numberTagged = Typeable({ _tag: "1", impl: {} })
    expect(numberTagged._tag).toBe("1")
    expect(isTypeable(numberTagged, "1")).toBe(true)

    const specialCharTagged = Typeable({ _tag: "special-tag_123", impl: {} })
    expect(specialCharTagged._tag).toBe("special-tag_123")
    expect(isTypeable(specialCharTagged, "special-tag_123")).toBe(true)
  })

  it("should be composable with other objects", () => {
    interface MyInterface {
      data: string
      process(): string
    }

    const myObj: MyInterface = {
      data: "test data",
      process: () => "processed data",
    }

    const typed = {
      ...Typeable({ _tag: "MyType", impl: {} }),
      ...myObj,
    }

    expect(typed._tag).toBe("MyType")
    expect(isTypeable(typed, "MyType")).toBe(true)
    expect(typed.data).toBe("test data")
    expect(typed.process()).toBe("processed data")
  })
})
