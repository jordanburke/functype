import { describe, expect, it } from "vitest"

import { functypeExamples, functypeLookup, getAllFunctypes, searchFunctypes } from "./functype-lookup"

describe("Functype Lookup Tools", () => {
  describe("functypeLookup", () => {
    it("should return info for valid functype", () => {
      const result = functypeLookup("Option")

      expect(result.found).toBe(true)
      expect(result.name).toBe("Option")
      expect(result.description).toContain("may or may not exist")
      expect(result.sourcePath).toBe("src/option/Option.ts")
      expect(result.interfaces).toContain("Functor")
      expect(result.keyMethods).toContain("map")
    })

    it("should handle case insensitive lookup", () => {
      const result = functypeLookup("list")

      expect(result.found).toBe(true)
      expect(result.name).toBe("List")
    })

    it("should return not found for invalid type", () => {
      const result = functypeLookup("NonExistent")

      expect(result.found).toBe(false)
      expect(result.description).toContain("not found")
    })
  })

  describe("functypeExamples", () => {
    it("should return examples for Option", () => {
      const examples = functypeExamples("Option")

      expect(examples.size).toBeGreaterThan(0)
      const first = examples.head
      expect(first?.title).toContain("Option")
      expect(first?.code).toContain("import { Option }")
    })

    it("should return examples for List", () => {
      const examples = functypeExamples("List")

      expect(examples.size).toBeGreaterThan(0)
      const first = examples.head
      expect(first?.code).toContain("import { List }")
    })
  })

  describe("searchFunctypes", () => {
    it("should find types by name", () => {
      const results = searchFunctypes("Option")

      expect(results.size).toBeGreaterThan(0)
      expect(results.exists((type) => type.name === "Option")).toBe(true)
    })

    it("should find types by description", () => {
      const results = searchFunctypes("immutable")

      expect(results.size).toBeGreaterThan(0)
      expect(results.exists((type) => type.description.includes("immutable"))).toBe(true)
    })

    it("should find types by use case", () => {
      const results = searchFunctypes("error handling")

      expect(results.size).toBeGreaterThan(0)
      expect(
        results.exists((type) => type.commonUseCases.some((useCase) => useCase.toLowerCase().includes("error"))),
      ).toBe(true)
    })
  })

  describe("getAllFunctypes", () => {
    it("should return all available types", () => {
      const types = getAllFunctypes()

      expect(types.size).toBeGreaterThan(10)
      expect(types.contains("Option")).toBe(true)
      expect(types.contains("List")).toBe(true)
      expect(types.contains("Either")).toBe(true)
    })
  })
})
