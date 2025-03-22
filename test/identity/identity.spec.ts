import { describe, expect, it } from "vitest"

import { Identity as createIdentity } from "../../src/identity/Identity"

describe("Identity", () => {
  describe("creation", () => {
    it("should create an Identity with a primitive value", () => {
      const id = createIdentity(42)
      expect(id.id).toBe(42)
    })

    it("should create an Identity with an object value", () => {
      const obj = { name: "test" }
      const id = createIdentity(obj)
      expect(id.id).toBe(obj)
    })
  })

  describe("isSame", () => {
    it("should return true for identical primitive values", () => {
      const id1 = createIdentity(42)
      const id2 = createIdentity(42)
      expect(id1.isSame?.(id2)).toBe(true)
    })

    it("should return false for different primitive values", () => {
      const id1 = createIdentity(42)
      const id2 = createIdentity(43)
      expect(id1.isSame?.(id2)).toBe(false)
    })

    it("should return true for identical object references", () => {
      const obj = { name: "test" }
      const id1 = createIdentity(obj)
      const id2 = createIdentity(obj)
      expect(id1.isSame?.(id2)).toBe(true)
    })

    it("should return false for different object references with same content", () => {
      const id1 = createIdentity({ name: "test" })
      const id2 = createIdentity({ name: "test" })
      expect(id1.isSame?.(id2)).toBe(false)
    })
  })
})
