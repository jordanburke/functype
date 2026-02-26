import { beforeAll, describe, expect, it } from "vitest"

import { formatInterfaces, formatOverview, formatType, getTypeByName, searchTypes } from "../src/lib/docs/formatters"
import { TYPES, initDocsData } from "../src/lib/docs/data"

beforeAll(async () => {
  await initDocsData()
})

describe("formatOverview", () => {
  it("returns overview with all categories", () => {
    const overview = formatOverview()
    expect(overview).toContain("functype")
    expect(overview).toContain("## Core")
    expect(overview).toContain("## Collection")
    expect(overview).toContain("## Effect")
    expect(overview).toContain("## Utility")
  })

  it("includes type names", () => {
    const overview = formatOverview()
    expect(overview).toContain("Option")
    expect(overview).toContain("Either")
    expect(overview).toContain("List")
    expect(overview).toContain("IO")
  })
})

describe("formatType", () => {
  it("formats Option type with methods", () => {
    const data = TYPES["Option"]!
    const result = formatType("Option", data)
    expect(result).toContain("# Option<T>")
    expect(result).toContain("Functor")
    expect(result).toContain("## Create")
    expect(result).toContain("Option(v)")
    expect(result).toContain("## Transform")
    expect(result).toContain(".map(f)")
  })

  it("includes full interface when requested", () => {
    const data = TYPES["Option"]!
    const result = formatType("Option", data, true)
    expect(result).toContain("## Full Interface")
    expect(result).toContain("```typescript")
    expect(result).toContain("isSome()")
  })

  it("omits full interface by default", () => {
    const data = TYPES["Option"]!
    const result = formatType("Option", data)
    expect(result).not.toContain("## Full Interface")
  })
})

describe("formatInterfaces", () => {
  it("returns interface hierarchy", () => {
    const result = formatInterfaces()
    expect(result).toContain("# Interfaces")
    expect(result).toContain("Functor")
    expect(result).toContain("Monad")
    expect(result).toContain("Foldable")
    expect(result).toContain("extends Applicative")
  })
})

describe("searchTypes", () => {
  it("returns results containing the queried type", () => {
    const result = searchTypes("Option")
    expect(result).toContain("Option")
    expect(result).toContain("Safe nullable handling")
  })

  it("returns multiple results for broad query", () => {
    const result = searchTypes("map")
    expect(result).toContain("matching types")
  })

  it("returns not found for gibberish", () => {
    const result = searchTypes("xyznonexistent")
    expect(result).toContain("No types found")
  })

  it("matches on interface name", () => {
    const result = searchTypes("Foldable")
    expect(result).toContain("matching types")
  })
})

describe("getTypeByName", () => {
  it("finds type by exact name", () => {
    const result = getTypeByName("Option")
    expect(result).toBeDefined()
    expect(result!.name).toBe("Option")
  })

  it("finds type case-insensitively", () => {
    const result = getTypeByName("option")
    expect(result).toBeDefined()
    expect(result!.name).toBe("Option")
  })

  it("returns undefined for unknown type", () => {
    const result = getTypeByName("FooBar")
    expect(result).toBeUndefined()
  })
})
