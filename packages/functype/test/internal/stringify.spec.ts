import { describe, expect, it } from "vitest"

import { safeStringify } from "../../src/internal/stringify"

describe("safeStringify", () => {
  describe("primitives", () => {
    it("should stringify null", () => {
      expect(safeStringify(null)).toBe("null")
    })

    it("should stringify numbers", () => {
      expect(safeStringify(42)).toBe("42")
      expect(safeStringify(0)).toBe("0")
      expect(safeStringify(-1)).toBe("-1")
      expect(safeStringify(3.14)).toBe("3.14")
    })

    it("should stringify Infinity and NaN as null", () => {
      expect(safeStringify(Infinity)).toBe("null")
      expect(safeStringify(-Infinity)).toBe("null")
      expect(safeStringify(NaN)).toBe("null")
    })

    it("should stringify booleans", () => {
      expect(safeStringify(true)).toBe("true")
      expect(safeStringify(false)).toBe("false")
    })

    it("should stringify strings with JSON escaping", () => {
      expect(safeStringify("hello")).toBe('"hello"')
      expect(safeStringify('he said "hi"')).toBe('"he said \\"hi\\""')
      expect(safeStringify("line\nnew")).toBe('"line\\nnew"')
    })

    it("should stringify BigInt as quoted string", () => {
      expect(safeStringify(BigInt(123))).toBe('"123"')
    })

    it("should return undefined for undefined", () => {
      expect(safeStringify(undefined)).toBeUndefined()
    })

    it("should return undefined for symbols", () => {
      expect(safeStringify(Symbol("test"))).toBeUndefined()
    })

    it("should return undefined for functions", () => {
      expect(safeStringify(() => {})).toBeUndefined()
    })
  })

  describe("objects with sorted keys", () => {
    it("should sort object keys alphabetically", () => {
      expect(safeStringify({ b: 2, a: 1 })).toBe('{"a":1,"b":2}')
    })

    it("should sort nested object keys", () => {
      expect(safeStringify({ z: { b: 2, a: 1 }, a: 1 })).toBe('{"a":1,"z":{"a":1,"b":2}}')
    })

    it("should skip undefined values in objects", () => {
      expect(safeStringify({ a: 1, b: undefined, c: 3 })).toBe('{"a":1,"c":3}')
    })

    it("should skip function values in objects", () => {
      expect(safeStringify({ a: 1, b: () => {}, c: 3 })).toBe('{"a":1,"c":3}')
    })

    it("should skip symbol values in objects", () => {
      expect(safeStringify({ a: 1, b: Symbol("x"), c: 3 })).toBe('{"a":1,"c":3}')
    })
  })

  describe("arrays", () => {
    it("should stringify arrays", () => {
      expect(safeStringify([1, 2, 3])).toBe("[1,2,3]")
    })

    it("should replace undefined in arrays with null", () => {
      expect(safeStringify([1, undefined, 3])).toBe("[1,null,3]")
    })

    it("should handle nested arrays", () => {
      expect(safeStringify([[1, 2], [3]])).toBe("[[1,2],[3]]")
    })
  })

  describe("circular references", () => {
    it("should handle circular references in objects", () => {
      const obj: Record<string, unknown> = { a: 1 }
      obj.self = obj
      expect(safeStringify(obj)).toBe('{"a":1,"self":"[Circular]"}')
    })

    it("should handle circular references in arrays", () => {
      const arr: unknown[] = [1]
      arr.push(arr)
      expect(safeStringify(arr)).toBe('[1,"[Circular]"]')
    })

    it("should handle deeply nested circular references", () => {
      const obj: Record<string, unknown> = { a: { b: {} } }
      ;(obj.a as Record<string, unknown>).b = obj
      expect(safeStringify(obj)).toBe('{"a":{"b":"[Circular]"}}')
    })

    it("should allow shared (non-circular) references", () => {
      const shared = { x: 1 }
      const obj = { a: shared, b: shared }
      // Both should be fully serialized — shared refs are NOT circular
      expect(safeStringify(obj)).toBe('{"a":{"x":1},"b":{"x":1}}')
    })
  })

  describe("toJSON protocol", () => {
    it("should respect toJSON method", () => {
      const obj = { toJSON: () => ({ simplified: true }) }
      expect(safeStringify(obj)).toBe('{"simplified":true}')
    })

    it("should respect Date.toJSON()", () => {
      const date = new Date("2024-01-01T00:00:00.000Z")
      expect(safeStringify(date)).toBe('"2024-01-01T00:00:00.000Z"')
    })
  })

  describe("template literal coercion", () => {
    it("should produce 'undefined' string in template literal for undefined input", () => {
      // This is how it's used: `Some(${safeStringify(undefined)})`
      expect(`Some(${safeStringify(undefined)})`).toBe("Some(undefined)")
    })

    it("should produce 'null' string in template literal for null input", () => {
      expect(`Some(${safeStringify(null)})`).toBe("Some(null)")
    })
  })

  describe("no-throw guarantee", () => {
    it("should not throw for Map", () => {
      expect(() => safeStringify(new Map([["a", 1]]))).not.toThrow()
    })

    it("should not throw for Set", () => {
      expect(() => safeStringify(new Set([1, 2, 3]))).not.toThrow()
    })

    it("should not throw for RegExp", () => {
      expect(() => safeStringify(/test/g)).not.toThrow()
    })

    it("should not throw for Error", () => {
      expect(() => safeStringify(new Error("test"))).not.toThrow()
    })
  })
})
