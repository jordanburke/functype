import { describe, expect, test, it } from "vitest"

import { Tuple } from "@/tuple"

describe("Tuple", () => {
  describe("basic operations", () => {
    test("map should apply function to the tuple and return new Tuple", () => {
      const tuple = Tuple([1, 2, 3])
      const mapped = tuple.map((values) => values.map((x) => x * 2))
      expect(mapped.toArray()).toEqual([2, 4, 6])
    })

    test("flatMap should apply function to the tuple and return new Tuple", () => {
      const tuple = Tuple([1, "two", 3])
      const flatMapped = tuple.flatMap((values) =>
        Tuple(
          values.map((x) => {
            if (typeof x === "number") {
              return x * 2
            } else {
              return x + x
            }
          }),
        ),
      )
      expect(flatMapped.toArray()).toEqual([2, "twotwo", 6])
    })

    test("get should return the value at the specified index", () => {
      const tuple = Tuple([1, "two", true])
      expect(tuple.get(0)).toBe(1)
      expect(tuple.get(1)).toBe("two")
      expect(tuple.get(2)).toBe(true)
    })

    test("toArray should return the internal array", () => {
      const tuple = Tuple([1, "two", true])
      expect(tuple.toArray()).toEqual([1, "two", true])
    })

    test("should preserve literal types with const type parameters", () => {
      // This tests TypeScript's type inference - run tsc to verify
      const literalTuple = Tuple([1, "hello", true] as const)

      // With the enhanced implementation, TypeScript knows the exact type at each position
      const first = literalTuple.get(0)
      expect(first).toBe(1)
      // TypeScript would know first is exactly 1, not just number

      const second = literalTuple.get(1)
      expect(second).toBe("hello")
      // TypeScript would know second is exactly "hello", not just string
    })

    test("should have length property", () => {
      const tuple = Tuple([1, 2, 3, 4, 5])
      expect(tuple.length).toBe(5)

      const empty = Tuple.empty()
      expect(empty.length).toBe(0)
    })

    test("should be iterable", () => {
      const tuple = Tuple([1, 2, 3])
      const values = [...tuple]
      expect(values).toEqual([1, 2, 3])
    })
  })

  describe("Companion methods", () => {
    it("should create tuple with of method", () => {
      const tuple = Tuple.of(1, "hello", true)
      expect(tuple.toArray()).toEqual([1, "hello", true])
    })

    it("should create pair with specialized method", () => {
      const pair = Tuple.pair("key", 42)
      expect(pair.toArray()).toEqual(["key", 42])
      expect(pair.length).toBe(2)
    })

    it("should create triple with specialized method", () => {
      const triple = Tuple.triple("x", 10, true)
      expect(triple.toArray()).toEqual(["x", 10, true])
      expect(triple.length).toBe(3)
    })

    it("should create empty tuple", () => {
      const empty = Tuple.empty()
      expect(empty.toArray()).toEqual([])
      expect(empty.length).toBe(0)
    })

    it("should create from array with from method", () => {
      const tuple = Tuple.from([1, 2, 3])
      expect(tuple.toArray()).toEqual([1, 2, 3])
    })
  })

  describe("Foldable interface", () => {
    it("should implement fold", () => {
      const tuple = Tuple([1, 2, 3])
      const result = tuple.fold(
        () => "empty",
        (value) => `first value: ${value}`,
      )
      expect(result).toBe("first value: 1")
    })

    it("should fold empty tuple", () => {
      const tuple = Tuple.empty()
      const result = tuple.fold(
        () => "empty",
        (value) => `first value: ${value}`,
      )
      expect(result).toBe("empty")
    })

    it("should implement foldLeft", () => {
      const tuple = Tuple([1, 2, 3, 4])
      const result = tuple.foldLeft(0)((acc, x) => acc + x)
      expect(result).toBe(10)
    })

    it("should implement foldRight", () => {
      const tuple = Tuple(["a", "b", "c"])
      const result = tuple.foldRight("")((x, acc) => x + acc)
      expect(result).toBe("abc")
    })
  })

  describe("Pipe interface", () => {
    it("should pipe through functions", () => {
      const tuple = Tuple([1, 2, 3])
      const result = tuple.pipe((t) => t.map((arr) => arr.map((x) => x * 2))).pipe((t) => t.toArray())
      expect(result).toEqual([2, 4, 6])
    })
  })

  describe("Serializable interface", () => {
    it("should serialize to JSON", () => {
      const tuple = Tuple([1, "hello", true])
      const json = tuple.serialize().toJSON()
      expect(json).toBe('{"_tag":"Tuple","value":[1,"hello",true]}')
    })

    it("should serialize to YAML", () => {
      const tuple = Tuple(["a", "b", "c"])
      const yaml = tuple.serialize().toYAML()
      expect(yaml).toBe('_tag: Tuple\nvalue: ["a","b","c"]')
    })

    it("should serialize to binary", () => {
      const tuple = Tuple([1, 2])
      const binary = tuple.serialize().toBinary()
      // Should be base64 encoded
      expect(binary).toMatch(/^[A-Za-z0-9+/=]+$/)
    })
  })

  describe("Typeable interface", () => {
    it("should have _tag property", () => {
      const tuple = Tuple([1, 2, 3])
      expect(tuple._tag).toBe("Tuple")
    })
  })

  describe("toString", () => {
    it("should show tuple elements", () => {
      const tuple = Tuple([1, "hello", true])
      expect(tuple.toString()).toBe("Tuple(1, hello, true)")
    })

    it("should handle empty tuple", () => {
      const tuple = Tuple.empty()
      expect(tuple.toString()).toBe("Tuple()")
    })

    it("should handle nested objects", () => {
      const tuple = Tuple([{ a: 1 }, [1, 2, 3], null])
      expect(tuple.toString()).toBe("Tuple([object Object], 1,2,3, null)")
    })
  })
})
