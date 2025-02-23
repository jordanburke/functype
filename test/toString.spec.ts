import { describe, expect, it } from "vitest"

import { Left, Right } from "../src"
import { None, Some } from "../src"
import { List } from "../src"

describe("Serialization", () => {
  describe("Either", () => {
    it("should correctly serialize Right", () => {
      const right = Right<string, number>(42)
      expect(right.toString()).toBe("Right(42)")
    })

    it("should correctly serialize Left", () => {
      const left = Left<string, number>("error")
      expect(left.toString()).toBe('Left("error")')
    })

    it("should handle complex objects", () => {
      const right = Right({ foo: "bar", num: 42 })
      expect(right.toString()).toBe('Right({"foo":"bar","num":42})')
    })

    it("should handle nested Either", () => {
      const nested = Right(Right(42))
      expect(nested.toString()).toBe('Right({"_tag":"Right","value":42})')
    })
  })

  describe("Option", () => {
    it("should correctly serialize Some", () => {
      const some = Some(42)
      expect(some.toString()).toBe("Some(42)")
    })

    it("should correctly serialize None", () => {
      const none = None()
      expect(none.toString()).toBe("None")
    })

    it("should handle complex objects", () => {
      const some = Some({ foo: "bar", num: 42 })
      expect(some.toString()).toBe('Some({"foo":"bar","num":42})')
    })
  })

  describe("List", () => {
    it("should correctly serialize empty list", () => {
      const list = List<number>()
      expect(list.toString()).toBe("List([])")
    })

    it("should correctly serialize list with values", () => {
      const list = List([1, 2, 3])
      expect(list.toString()).toBe("List([1,2,3])")
    })

    it("should handle complex objects", () => {
      const list = List([{ foo: "bar" }, { baz: 42 }])
      expect(list.toString()).toBe('List([{"foo":"bar"},{"baz":42}])')
    })
  })

  describe("Circular References", () => {
    it("should handle circular references in objects", () => {
      const circular = { foo: "bar", self: undefined as unknown }
      circular.self = circular
      const right = Right(circular)
      expect(() => right.toString()).not.toThrow()
    })

    it("should handle circular references in arrays", () => {
      const circular: unknown[] = ["foo"]
      circular.push(circular)
      const list = List(circular)
      expect(() => list.toString()).not.toThrow()
    })
  })

  describe("Special Values", () => {
    it("should handle undefined", () => {
      const right = Right<string, undefined>(undefined)
      expect(right.toString()).toBe("Right(undefined)")
    })

    it("should handle null", () => {
      const right = Right<string, null>(null)
      expect(right.toString()).toBe("Right(null)")
    })

    it("should handle Date objects", () => {
      const date = new Date("2024-01-01")
      const right = Right(date)
      expect(right.toString()).toContain("2024-01-01")
    })
  })
})
