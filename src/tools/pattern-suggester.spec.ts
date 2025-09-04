import { describe, expect, it } from "vitest"

import { formatSuggestion, searchPatterns, suggestPattern, suggestPatterns } from "./pattern-suggester"

describe("Pattern Suggester", () => {
  describe("suggestPattern", () => {
    it("should suggest Option for null checks", () => {
      const code = "if (value !== null && value !== undefined) { return value.toUpperCase() }"
      const suggestion = suggestPattern(code)

      expect(suggestion._tag === "Some").toBe(true)
      expect(suggestion.getOrThrow().pattern).toBe("null-check")
    })

    it("should suggest Try for try-catch blocks", () => {
      const code = "try { return JSON.parse(str) } catch (e) { return null }"
      const suggestion = suggestPattern(code)

      expect(suggestion._tag === "Some").toBe(true)
      expect(suggestion.getOrThrow().pattern).toBe("try-catch")
    })

    it("should suggest Match for switch statements", () => {
      const code = "switch(status) { case 'success': return data; case 'error': return null; }"
      const suggestion = suggestPattern(code)

      expect(suggestion._tag === "Some").toBe(true)
      expect(suggestion.getOrThrow().pattern).toBe("switch-case")
    })

    it("should return None for code without patterns", () => {
      const code = "const x = 5"
      const suggestion = suggestPattern(code)

      expect(suggestion._tag === "None").toBe(true)
    })
  })

  describe("suggestPatterns", () => {
    it("should return multiple matching patterns", () => {
      const code = "if (user?.profile?.name) { array.push(user.profile.name) }"
      const suggestions = suggestPatterns(code)

      expect(suggestions.size).toBeGreaterThan(1)
      const patterns = suggestions.map((s) => s.pattern).toArray()
      expect(patterns).toContain("optional-chaining")
      expect(patterns).toContain("array-push")
    })

    it("should limit results", () => {
      const code = "if (x) { try { array.map() } catch {} }"
      const suggestions = suggestPatterns(code, 2)

      expect(suggestions.size).toBeLessThanOrEqual(2)
    })
  })

  describe("searchPatterns", () => {
    it("should find patterns by tag", () => {
      const results = searchPatterns("null")

      expect(results.size).toBeGreaterThan(0)
      expect(results.exists((p) => p.pattern === "null-check")).toBe(true)
    })

    it("should find patterns by description keyword", () => {
      const results = searchPatterns("error")

      expect(results.size).toBeGreaterThan(0)
      expect(results.exists((p) => p.tags.includes("error") || p.description.includes("error"))).toBe(true)
    })
  })

  describe("formatSuggestion", () => {
    it("should format pattern nicely", () => {
      const pattern = suggestPattern("try { } catch { }").getOrThrow()
      const formatted = formatSuggestion(pattern)

      expect(formatted).toContain("### ")
      expect(formatted).toContain("**Before:**")
      expect(formatted).toContain("**After:**")
      expect(formatted).toContain("Confidence:")
    })
  })
})
