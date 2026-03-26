import { describe, expect, it } from "vitest"

import { Obj } from "@/obj"
import { None } from "@/option"

describe("Obj", () => {
  const user = Obj({ name: "John", age: 30, role: "admin" })

  describe("Construction", () => {
    it("should create from plain object", () => {
      const obj = Obj({ x: 1 })
      expect(obj.value()).toEqual({ x: 1 })
    })

    it("should create via Obj.of", () => {
      const obj = Obj.of({ x: 1 })
      expect(obj.value()).toEqual({ x: 1 })
    })

    it("should create empty via Obj.empty", () => {
      const obj = Obj.empty<{ x: number }>()
      expect(obj.value()).toEqual({})
      expect(obj.isEmpty).toBe(true)
    })
  })

  describe("get", () => {
    it("should return Some for existing key", () => {
      expect(user.get("name").orElse("")).toBe("John")
    })

    it("should return None for missing value", () => {
      const obj = Obj({ x: undefined as string | undefined })
      expect(obj.get("x")).toEqual(None())
    })
  })

  describe("set", () => {
    it("should return new Obj with updated key", () => {
      const updated = user.set("age", 31)
      expect(updated.get("age").orElse(0)).toBe(31)
      // Original unchanged
      expect(user.get("age").orElse(0)).toBe(30)
    })
  })

  describe("assign", () => {
    it("should merge partial of same shape", () => {
      const updated = user.assign({ name: "Jane", age: 25 })
      expect(updated.value()).toEqual({ name: "Jane", age: 25, role: "admin" })
    })

    it("should not modify original", () => {
      user.assign({ name: "Jane" })
      expect(user.get("name").orElse("")).toBe("John")
    })
  })

  describe("merge", () => {
    it("should merge with new keys", () => {
      const merged = user.merge({ city: "NYC" })
      expect(merged.value()).toEqual({ name: "John", age: 30, role: "admin", city: "NYC" })
    })
  })

  describe("when", () => {
    it("should merge when condition is true", () => {
      const obj = Obj({ a: 1 }).when(true, { a: 2 })
      expect(obj.get("a").orElse(0)).toBe(2)
    })

    it("should not merge when condition is false", () => {
      const obj = Obj({ a: 1 }).when(false, { a: 2 })
      expect(obj.get("a").orElse(0)).toBe(1)
    })

    it("should accept predicate function", () => {
      const obj = Obj({ a: 1 }).when(() => true, { a: 2 })
      expect(obj.get("a").orElse(0)).toBe(2)
    })

    it("should work in fluent chains for HTTP headers", () => {
      const requiresAuth = true
      const token = "my-token"

      const headers = Obj({ "User-Agent": "MyApp/1.0" } as Record<string, string>)
        .assign({ "Content-Type": "application/json" })
        .when(requiresAuth, { Authorization: `Bearer ${token}` })
        .value()

      expect(headers).toEqual({
        "User-Agent": "MyApp/1.0",
        "Content-Type": "application/json",
        Authorization: "Bearer my-token",
      })
    })

    it("should skip auth header when not required", () => {
      const requiresAuth = false

      const headers = Obj({ "User-Agent": "MyApp/1.0" } as Record<string, string>)
        .when(requiresAuth, { Authorization: "Bearer secret" })
        .value()

      expect(headers).toEqual({ "User-Agent": "MyApp/1.0" })
      expect("Authorization" in headers).toBe(false)
    })
  })

  describe("omit", () => {
    it("should remove specified keys", () => {
      const result = user.omit("role")
      expect(result.value()).toEqual({ name: "John", age: 30 })
    })

    it("should remove multiple keys", () => {
      const result = user.omit("age", "role")
      expect(result.value()).toEqual({ name: "John" })
    })
  })

  describe("pick", () => {
    it("should keep only specified keys", () => {
      const result = user.pick("name", "role")
      expect(result.value()).toEqual({ name: "John", role: "admin" })
    })

    it("should return empty for no keys", () => {
      const result = user.pick()
      expect(result.value()).toEqual({})
    })
  })

  describe("keys / values / entries", () => {
    const obj = Obj({ a: 1, b: 2 })

    it("should return keys as List", () => {
      const keys = obj.keys()
      expect(keys.toArray()).toEqual(["a", "b"])
    })

    it("should return values as List", () => {
      const vals = obj.values()
      expect(vals.toArray()).toEqual([1, 2])
    })

    it("should return entries as List of Tuples", () => {
      const ents = obj.entries()
      expect(ents.size).toBe(2)
      expect(ents.toArray().map((t) => t.toArray())).toEqual([
        ["a", 1],
        ["b", 2],
      ])
    })
  })

  describe("has", () => {
    it("should return true for existing key", () => {
      expect(user.has("name")).toBe(true)
    })

    it("should return false for missing key", () => {
      expect(user.has("missing" as keyof typeof user.data)).toBe(false)
    })
  })

  describe("isEmpty / size", () => {
    it("should report isEmpty for empty obj", () => {
      expect(Obj.empty().isEmpty).toBe(true)
    })

    it("should report not isEmpty for non-empty obj", () => {
      expect(user.isEmpty).toBe(false)
    })

    it("should report correct size", () => {
      expect(user.size).toBe(3)
      expect(Obj.empty().size).toBe(0)
    })
  })

  describe("Functype contract", () => {
    it("should fold with onEmpty for empty", () => {
      const result = Obj.empty().fold(
        () => "empty",
        () => "has value",
      )
      expect(result).toBe("empty")
    })

    it("should fold with onValue for non-empty", () => {
      const result = Obj({ x: 1 }).fold(
        () => "empty",
        (v) => `value: ${v.x}`,
      )
      expect(result).toBe("value: 1")
    })

    it("should match on Obj", () => {
      const result = user.match({ Obj: (v) => v.name })
      expect(result).toBe("John")
    })

    it("should pipe value through function", () => {
      const result = Obj({ x: 5 }).pipe((v) => v.x * 2)
      expect(result).toBe(10)
    })

    it("should foldLeft", () => {
      const result = Obj({ x: 5 }).foldLeft(10)((acc, v) => acc + v.x)
      expect(result).toBe(15)
    })

    it("should foldRight", () => {
      const result = Obj({ x: 5 }).foldRight(10)((v, acc) => v.x + acc)
      expect(result).toBe(15)
    })
  })

  describe("Extractable", () => {
    it("should orElse return data (always has value)", () => {
      expect(user.orElse({ name: "X", age: 0, role: "X" })).toEqual(user.value())
    })

    it("should orThrow return data", () => {
      expect(user.orThrow()).toEqual(user.value())
    })

    it("should orNull return data", () => {
      expect(user.orNull()).toEqual(user.value())
    })
  })

  describe("Reshapeable", () => {
    it("should convert to Option", () => {
      const opt = Obj({ x: 1 }).toOption()
      expect(opt.orElse({ x: 0 })).toEqual({ x: 1 })
    })

    it("should convert to Either", () => {
      const either = Obj({ x: 1 }).toEither("error")
      expect(
        either.fold(
          () => "left",
          (v) => `right: ${v.x}`,
        ),
      ).toBe("right: 1")
    })

    it("should convert to List", () => {
      const list = Obj({ x: 1 }).toList()
      expect(list.size).toBe(1)
    })

    it("should convert to Try", () => {
      const t = Obj({ x: 1 }).toTry()
      expect(
        t.fold(
          () => "fail",
          (v) => `ok: ${v.x}`,
        ),
      ).toBe("ok: 1")
    })
  })

  describe("Serialization", () => {
    it("should serialize to string", () => {
      expect(Obj({ x: 1 }).toString()).toBe('Obj({"x":1})')
    })

    it("should toValue", () => {
      expect(Obj({ x: 1 }).toValue()).toEqual({ _tag: "Obj", value: { x: 1 } })
    })

    it("should serialize and deserialize via JSON", () => {
      const original = Obj({ x: 1, y: "hello" })
      const json = original.serialize().toJSON()
      const restored = Obj.fromJSON<{ x: number; y: string }>(json)
      expect(restored.value()).toEqual(original.value())
    })

    it("should serialize and deserialize via binary", () => {
      const original = Obj({ x: 1 })
      const binary = original.serialize().toBinary()
      const restored = Obj.fromBinary<{ x: number }>(binary)
      expect(restored.value()).toEqual(original.value())
    })
  })

  describe("Doable", () => {
    it("should doUnwrap with ok result", () => {
      const result = Obj({ x: 1 }).doUnwrap()
      expect(result).toEqual({ ok: true, value: { x: 1 } })
    })
  })

  describe("Immutability", () => {
    it("should not mutate original on set", () => {
      const original = Obj({ x: 1 })
      original.set("x", 2)
      expect(original.value()).toEqual({ x: 1 })
    })

    it("should not mutate original on assign", () => {
      const original = Obj({ x: 1 })
      original.assign({ x: 2 })
      expect(original.value()).toEqual({ x: 1 })
    })

    it("should not mutate original on merge", () => {
      const original = Obj({ x: 1 })
      original.merge({ y: 2 })
      expect(original.value()).toEqual({ x: 1 })
    })

    it("should not mutate original on omit", () => {
      const original = Obj({ x: 1, y: 2 })
      original.omit("y")
      expect(original.value()).toEqual({ x: 1, y: 2 })
    })
  })

  describe("Chaining", () => {
    it("should support fluent method chaining", () => {
      const result = Obj({ a: 1, b: 2, c: 3 }).set("a", 10).assign({ b: 20 }).omit("c").value()

      expect(result).toEqual({ a: 10, b: 20 })
    })
  })
})
