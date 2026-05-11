import { describe, expect, it } from "vitest"

import { mergeObjects } from "@/util"

describe("mergeObjects type tests", () => {
  describe("type inference", () => {
    it("should infer intersection type O1 & O2", () => {
      const obj1 = { a: 1, b: "hello" }
      const obj2 = { c: true, d: [1, 2, 3] }
      const merged = mergeObjects(obj1, obj2)

      // Compile-time: merged should be { a: number, b: string } & { c: boolean, d: number[] }
      void (merged satisfies { a: number; b: string; c: boolean; d: number[] })

      expect(merged.a).toBe(1)
      expect(merged.b).toBe("hello")
      expect(merged.c).toBe(true)
      expect(merged.d).toEqual([1, 2, 3])
    })

    it("should preserve function types", () => {
      const obj1 = { fn: (x: number) => x * 2 }
      const obj2 = { name: "test" }
      const merged = mergeObjects(obj1, obj2)

      void (merged satisfies { fn: (x: number) => number; name: string })
      expect(merged.fn(5)).toBe(10)
    })

    it("should handle nested objects", () => {
      const obj1 = { outer: { inner: 1 } }
      const obj2 = { data: { value: "x" } }
      const merged = mergeObjects(obj1, obj2)

      void (merged satisfies { outer: { inner: number }; data: { value: string } })
      expect(merged.outer.inner).toBe(1)
      expect(merged.data.value).toBe("x")
    })
  })

  describe("generic constraints", () => {
    it("should require object types for both parameters", () => {
      // These should compile:
      mergeObjects({}, {})
      mergeObjects({ a: 1 }, { b: 2 })
      mergeObjects(() => {}, { prop: 1 }) // functions are objects

      // Note: To verify type errors, uncomment these lines - they should fail to compile:
      // mergeObjects(1, {})        // primitives not allowed
      // mergeObjects({}, "string") // primitives not allowed

      expect(true).toBe(true)
    })

    it("should handle readonly objects", () => {
      const obj1 = { a: 1 } as const
      const obj2 = { b: 2 } as const
      const merged = mergeObjects(obj1, obj2)

      void (merged satisfies { readonly a: 1; readonly b: 2 })
      expect(merged.a).toBe(1)
      expect(merged.b).toBe(2)
    })

    it("should handle arrays as objects", () => {
      const arr = [1, 2, 3]
      const obj = { name: "array" }
      const merged = mergeObjects(arr, obj)

      // Arrays are objects, so this should work
      expect(merged[0]).toBe(1)
      expect(merged.name).toBe("array")
    })
  })

  describe("edge cases", () => {
    it("should handle empty objects", () => {
      const obj1 = {}
      const obj2 = { a: 1 }
      const merged = mergeObjects(obj1, obj2)

      expect(merged.a).toBe(1)
    })

    it("should handle overlapping keys (second wins)", () => {
      const obj1 = { a: 1, b: 2 }
      const obj2 = { b: 3, c: 4 }
      const merged = mergeObjects(obj1, obj2)

      // Object.assign behavior: second object wins on conflicts
      expect(merged.a).toBe(1)
      expect(merged.b).toBe(3)
      expect(merged.c).toBe(4)
    })
  })
})
