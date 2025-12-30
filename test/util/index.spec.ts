import { describe, expect, it } from "vitest"

import { parseNumber } from "@/either"

describe("Utility Functions", () => {
  describe("parseNumber", () => {
    it("should correctly parse valid number strings", () => {
      const result = parseNumber("123")
      expect(result.isRight()).toBe(true)
      expect(result.value).toBe(123)
    })

    it("should handle negative numbers", () => {
      const result = parseNumber("-42")
      expect(result.isRight()).toBe(true)
      expect(result.value).toBe(-42)
    })

    it("should handle zero", () => {
      const result = parseNumber("0")
      expect(result.isRight()).toBe(true)
      expect(result.value).toBe(0)
    })

    it("should return Left with ParseError for invalid numbers", () => {
      const result = parseNumber("not-a-number")
      expect(result.isLeft()).toBe(true)
    })

    it("should truncate decimal parts in integers", () => {
      const result = parseNumber("123.456")
      expect(result.isRight()).toBe(true)
      expect(result.value).toBe(123)
    })
  })
})
