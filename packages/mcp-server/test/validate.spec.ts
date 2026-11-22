import ts from "typescript"
import { describe, expect, it } from "vitest"

import { compilerOptions, createCompilerHost, VIRTUAL_FILENAME } from "../src/lib/validator/compiler-host"
import { lintCode } from "../src/lib/validator/lint"
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
  .getOrElse(() => 0)
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

describe("validateCode lints with eslint-plugin-functype's recommended preset", () => {
  it("reports a rule that needs no types, on the user's own line numbers", () => {
    const result = validateCode(`export function f(): number {\n  let n = 1\n  return n\n}`)
    expect(result.diagnostics).toEqual([])
    expect(result.lint?.map((d) => [d.line, d.rule])).toEqual([[2, "functype/no-let"]])
    expect(result.success).toBe(false)
  })

  it("runs the type-aware rules on the snippet: a dropped Either", () => {
    const code = `const parse = (s: string): Either<string, number> => (s === "" ? Left("empty") : Right(Number(s)))
export function run(s: string): void {
  parse(s)
}`
    const result = validateCode(code)
    expect(result.lint?.map((d) => [d.line, d.rule])).toEqual([[3, "functype/no-floating-result"]])
  })

  it("runs the type-aware rules on the snippet: an array changed in place", () => {
    const code = `export function f(): ReadonlyArray<number> {
  const acc: number[] = []
  acc.push(1)
  return acc
}`
    const result = validateCode(code)
    expect(result.lint?.map((d) => [d.line, d.rule])).toEqual([[3, "functype/no-array-mutation"]])
  })

  it("keeps line numbers right when the snippet has its own import", () => {
    const result = validateCode(
      `import { Option } from "functype"\nexport const x = Option(1)\nlet y = 2\nexport { y }`,
    )
    expect(result.importsPrepended).toBe(false)
    expect(result.lint?.map((d) => [d.line, d.rule])).toEqual([[3, "functype/no-let"]])
  })

  it("passes idiomatic code", () => {
    const result = validateCode(`export const total = List([1, 2, 3]).map((n) => n * 2).foldLeft(0)((a, b) => a + b)`)
    expect(result.lint).toEqual([])
    expect(result.success).toBe(true)
  })

  it("skips lint when the code has type errors, since the type-aware rules need the types", () => {
    const result = validateCode(`let x: number = Option(42)`)
    expect(result.success).toBe(false)
    expect(result.lint).toBeUndefined()
  })

  it("checks types alone with lint: false", () => {
    const result = validateCode(`export function f(): number {\n  let n = 1\n  return n\n}`, { lint: false })
    expect(result.lint).toBeUndefined()
    expect(result.success).toBe(true)
  })
})

describe("lintCode never passes a snippet it couldn't lint", () => {
  it("reports ESLint's own failure as an error, such as a file missing from the program", () => {
    const code = "export const x = 1\n"
    const program = ts.createProgram([VIRTUAL_FILENAME], compilerOptions, createCompilerHost(code))
    const findings = lintCode(code, "/not-in-the-program.ts", program)
    expect(findings.length).toBeGreaterThan(0)
    // An error with a line number, so validate's line filter keeps it: a fatal message has none.
    expect(findings.every((d) => d.severity === "error" && Number.isInteger(d.line))).toBe(true)
  })
})
