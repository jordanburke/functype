import { describe, expect, it } from "vitest"

import { CATEGORIES, INTERFACES, TYPES, VERSION } from "@/cli/data"
import {
  formatInterfaces,
  formatJson,
  formatOverview,
  formatType,
  getAllTypeNames,
  getInterfacesData,
  getOverviewData,
  getType,
} from "@/cli/formatters"
import { FULL_INTERFACES } from "@/cli/full-interfaces"

describe("CLI Data", () => {
  it("should have all expected types", () => {
    const expectedTypes = [
      "Option",
      "Either",
      "Try",
      "List",
      "Set",
      "Map",
      "Lazy",
      "LazyList",
      "Task",
      "FPromise",
      "Cond",
      "Match",
      "Brand",
      "ValidatedBrand",
      "Tuple",
      "Stack",
    ]
    for (const type of expectedTypes) {
      expect(TYPES[type]).toBeDefined()
    }
  })

  it("should have all expected interfaces", () => {
    const expectedInterfaces = [
      "Functor",
      "Applicative",
      "Monad",
      "Foldable",
      "Extractable",
      "Matchable",
      "Traversable",
      "Collection",
      "Serializable",
    ]
    for (const iface of expectedInterfaces) {
      expect(INTERFACES[iface]).toBeDefined()
    }
  })

  it("should have categories covering all types", () => {
    const allCategoryTypes = Object.values(CATEGORIES).flat()
    const allTypes = Object.keys(TYPES)

    for (const type of allTypes) {
      expect(allCategoryTypes).toContain(type)
    }
  })

  it("should have version defined", () => {
    expect(VERSION).toBeDefined()
    expect(VERSION).toMatch(/^\d+\.\d+\.\d+$/)
  })
})

describe("CLI Formatters", () => {
  describe("formatOverview", () => {
    it("should include version", () => {
      const output = formatOverview()
      expect(output).toContain(VERSION)
    })

    it("should include all categories", () => {
      const output = formatOverview()
      expect(output).toContain("CORE")
      expect(output).toContain("COLLECTION")
      expect(output).toContain("ASYNC")
      expect(output).toContain("UTILITY")
    })

    it("should include all core types", () => {
      const output = formatOverview()
      expect(output).toContain("Option")
      expect(output).toContain("Either")
      expect(output).toContain("Try")
    })

    it("should include usage hints", () => {
      const output = formatOverview()
      expect(output).toContain("npx functype <Type>")
      expect(output).toContain("npx functype interfaces")
    })
  })

  describe("formatType", () => {
    it("should format Option correctly", () => {
      const result = getType("Option")
      expect(result).toBeDefined()
      const output = formatType(result!.name, result!.data)

      expect(output).toContain("Option<T>")
      expect(output).toContain("Functor")
      expect(output).toContain("Monad")
      expect(output).toContain("CREATE")
      expect(output).toContain("TRANSFORM")
      expect(output).toContain("EXTRACT")
      expect(output).toContain("CHECK")
      expect(output).toContain(".map(f)")
      expect(output).toContain(".flatMap(f)")
    })

    it("should format Either correctly", () => {
      const result = getType("Either")
      expect(result).toBeDefined()
      const output = formatType(result!.name, result!.data)

      expect(output).toContain("Either<T>")
      expect(output).toContain("Right(v)")
      expect(output).toContain("Left(e)")
      expect(output).toContain(".isRight")
      expect(output).toContain(".isLeft")
    })
  })

  describe("formatInterfaces", () => {
    it("should include all interfaces", () => {
      const output = formatInterfaces()
      expect(output).toContain("Functor<A>")
      expect(output).toContain("Monad<A>")
      expect(output).toContain("Foldable<A>")
      expect(output).toContain("Extractable<A>")
    })

    it("should include method signatures", () => {
      const output = formatInterfaces()
      expect(output).toContain(".map<B>(f: A => B)")
      expect(output).toContain(".flatMap<B>(f: A => Monad<B>)")
      expect(output).toContain(".fold<B>")
    })

    it("should show inheritance", () => {
      const output = formatInterfaces()
      expect(output).toContain("extends Functor")
      expect(output).toContain("extends Applicative")
    })
  })

  describe("getType", () => {
    it("should find types case-insensitively", () => {
      expect(getType("Option")).toBeDefined()
      expect(getType("option")).toBeDefined()
      expect(getType("OPTION")).toBeDefined()
      expect(getType("Option")?.name).toBe("Option")
      expect(getType("option")?.name).toBe("Option")
    })

    it("should return undefined for unknown types", () => {
      expect(getType("UnknownType")).toBeUndefined()
      expect(getType("")).toBeUndefined()
    })
  })

  describe("getAllTypeNames", () => {
    it("should return all type names", () => {
      const names = getAllTypeNames()
      expect(names.length).toBeGreaterThanOrEqual(16)
      expect(names).toContain("Option")
      expect(names).toContain("Either")
      expect(names).toContain("List")
    })
  })

  describe("JSON output", () => {
    it("should produce valid JSON for overview", () => {
      const data = getOverviewData()
      const json = formatJson(data)
      const parsed = JSON.parse(json)

      expect(parsed.version).toBe(VERSION)
      expect(parsed.types).toBeDefined()
      expect(parsed.categories).toBeDefined()
    })

    it("should produce valid JSON for interfaces", () => {
      const data = getInterfacesData()
      const json = formatJson(data)
      const parsed = JSON.parse(json)

      expect(parsed.Functor).toBeDefined()
      expect(parsed.Monad).toBeDefined()
    })

    it("should produce valid JSON for type", () => {
      const result = getType("Option")
      const json = formatJson({ [result!.name]: result!.data })
      const parsed = JSON.parse(json)

      expect(parsed.Option).toBeDefined()
      expect(parsed.Option.interfaces).toContain("Functor")
    })
  })
})

describe("Token Efficiency", () => {
  it("overview should be reasonably compact", () => {
    const output = formatOverview()
    // Rough word count as token estimate
    const wordCount = output.split(/\s+/).length
    // Target: <400 tokens, so ~300 words should be safe
    expect(wordCount).toBeLessThan(400)
  })

  it("type output should be compact", () => {
    const result = getType("Option")
    const output = formatType(result!.name, result!.data)
    const wordCount = output.split(/\s+/).length
    // Target: <200 tokens per type
    expect(wordCount).toBeLessThan(200)
  })

  it("interfaces output should be compact", () => {
    const output = formatInterfaces()
    const wordCount = output.split(/\s+/).length
    // Target: <300 tokens
    expect(wordCount).toBeLessThan(350)
  })
})

describe("Full Interfaces", () => {
  it("should have full interface definitions", () => {
    expect(Object.keys(FULL_INTERFACES).length).toBeGreaterThanOrEqual(8)
  })

  it("should include Option interface with JSDoc", () => {
    expect(FULL_INTERFACES.Option).toBeDefined()
    expect(FULL_INTERFACES.Option).toContain("export interface Option<T")
    expect(FULL_INTERFACES.Option).toContain("Returns true if this Option is a Some")
    expect(FULL_INTERFACES.Option).toContain("isSome()")
    expect(FULL_INTERFACES.Option).toContain("map<U")
    expect(FULL_INTERFACES.Option).toContain("flatMap<U")
  })

  it("should include Either interface", () => {
    expect(FULL_INTERFACES.Either).toBeDefined()
    expect(FULL_INTERFACES.Either).toContain("export interface Either<L")
    expect(FULL_INTERFACES.Either).toContain("isLeft()")
    expect(FULL_INTERFACES.Either).toContain("isRight()")
  })

  it("should include List interface", () => {
    expect(FULL_INTERFACES.List).toBeDefined()
    expect(FULL_INTERFACES.List).toContain("export interface List<A")
  })

  it("should include type definitions (not just interfaces)", () => {
    // FPromise and Stack are defined as types
    expect(FULL_INTERFACES.FPromise).toBeDefined()
    expect(FULL_INTERFACES.FPromise).toContain("export type FPromise<T")

    expect(FULL_INTERFACES.Stack).toBeDefined()
    expect(FULL_INTERFACES.Stack).toContain("export type Stack<A")
  })

  it("should produce valid JSON for full interfaces", () => {
    const json = formatJson(FULL_INTERFACES)
    const parsed = JSON.parse(json)

    expect(parsed.Option).toBeDefined()
    expect(typeof parsed.Option).toBe("string")
    expect(parsed.Option).toContain("export interface")
  })
})
