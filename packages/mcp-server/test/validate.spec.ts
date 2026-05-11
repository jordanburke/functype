import { describe, expect, it } from "vitest"

import { validateCode } from "../src/lib/validator/validate"

describe("validateCode", () => {
  describe("valid code", () => {
    it("passes for valid Option usage", () => {
      const result = validateCode(`const x = Option(42).map(n => n + 1)`)
      expect(result.success).toBe(true)
      expect(result.diagnostics).toHaveLength(0)
    })

    it("passes for valid Either usage", () => {
      const result = validateCode(`const x = Right(42).map(n => n + 1)`)
      expect(result.success).toBe(true)
    })

    it("passes for valid List usage", () => {
      const result = validateCode(`const xs = List([1, 2, 3]).map(n => n * 2).toArray()`)
      expect(result.success).toBe(true)
    })

    it("passes for chained operations", () => {
      const code = `
const result = Option(42)
  .map(n => n + 1)
  .filter(n => n > 0)
  .orElse(0)
`
      const result = validateCode(code)
      expect(result.success).toBe(true)
    })
  })

  describe("invalid code", () => {
    it("fails for type mismatch", () => {
      const result = validateCode(`const x: number = Option(42)`)
      expect(result.success).toBe(false)
      expect(result.diagnostics.length).toBeGreaterThan(0)
      expect(result.diagnostics[0]!.severity).toBe("error")
    })

    it("reports correct error info", () => {
      const result = validateCode(`const x: string = 42`)
      expect(result.success).toBe(false)
      expect(result.diagnostics[0]!.line).toBe(1)
      expect(result.diagnostics[0]!.message).toContain("Type 'number' is not assignable to type 'string'")
    })
  })

  describe("auto-import", () => {
    it("prepends imports when no functype import exists", () => {
      const result = validateCode(`const x = Option(42)`)
      expect(result.importsPrepended).toBe(true)
      expect(result.success).toBe(true)
    })

    it("preserves explicit imports", () => {
      const code = `import { Option } from "functype"\nconst x = Option(42)`
      const result = validateCode(code)
      expect(result.importsPrepended).toBe(false)
      expect(result.success).toBe(true)
    })

    it("respects autoImport=false", () => {
      const result = validateCode(`const x = Option(42)`, { autoImport: false })
      expect(result.importsPrepended).toBe(false)
      // Should fail because Option is not imported
      expect(result.success).toBe(false)
    })
  })

  describe("line number offset", () => {
    it("reports correct line numbers with prepended imports", () => {
      const code = `const a = 1\nconst b: string = 42`
      const result = validateCode(code)
      expect(result.importsPrepended).toBe(true)
      // Error should be on line 2 of the user's code
      const errorDiag = result.diagnostics.find((d) => d.severity === "error")
      expect(errorDiag).toBeDefined()
      expect(errorDiag!.line).toBe(2)
    })
  })
})
