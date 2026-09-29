import { join } from "node:path"

import ts from "typescript"
import { describe, expect, it } from "vitest"

/**
 * Declaration emit is where a phantom-brand type can break a consumer without any `--noEmit` check
 * noticing (#332 review). If `Wire<T>` resolves to a type that references the unexported brand symbol,
 * any exported value whose type is INFERRED from a Wire value fails the consumer's `.d.ts` build
 * (TS4023/TS4058). This compiles a consumer module with declarations on and checks both that it
 * succeeds and that the alias name survives, so hovers and emitted types say `Wire<…>`.
 */

const WIRE_MODULE = join(import.meta.dirname, "..", "..", "src", "wire", "index.ts")
  .split("\\")
  .join("/")

const consumer = `
import type { Wire } from "${WIRE_MODULE.replace(/\.ts$/, "")}"

type Row = { readonly id: string; readonly email: string | null }
declare const rows: ReadonlyArray<Row>

const wired = rows as Wire<ReadonlyArray<Row>>
export const inferredValue = wired
export const inferredObject = { rows: wired }
export function inferredReturn() { return wired }
export const inferredRow = { id: "1", email: null } as Wire<Row>
`

const emitDeclarations = (source: string): { diagnostics: ReadonlyArray<string>; dts: string } => {
  const fileName = join(import.meta.dirname, "__wire_consumer__.ts")
    .split("\\")
    .join("/")
  const options: ts.CompilerOptions = {
    strict: true,
    declaration: true,
    emitDeclarationOnly: true,
    module: ts.ModuleKind.ESNext,
    moduleResolution: ts.ModuleResolutionKind.Bundler,
    target: ts.ScriptTarget.ES2022,
    skipLibCheck: true,
    noEmitOnError: false,
  }
  const host = ts.createCompilerHost(options)
  const readFile = host.readFile.bind(host)
  const fileExists = host.fileExists.bind(host)
  host.readFile = (f) => (f === fileName ? source : readFile(f))
  host.fileExists = (f) => f === fileName || fileExists(f)
  const outputs: Record<string, string> = {}
  host.writeFile = (f, text) => {
    outputs[f] = text
  }
  const program = ts.createProgram([fileName], options, host)
  const result = program.emit(program.getSourceFile(fileName))
  const diagnostics = [...ts.getPreEmitDiagnostics(program), ...result.diagnostics]
    .filter((d) => d.file?.fileName === fileName)
    .map((d) => `TS${d.code}: ${ts.flattenDiagnosticMessageText(d.messageText, "\n")}`)
  const dts = Object.entries(outputs).find(([f]) => f.endsWith("__wire_consumer__.d.ts"))?.[1] ?? ""
  return { diagnostics, dts }
}

describe("Wire<T> declaration emit", () => {
  const { diagnostics, dts } = emitDeclarations(consumer)

  it("emits declarations for exports whose type is inferred from a Wire value", () => {
    expect(diagnostics).toEqual([])
  })

  it("keeps the Wire alias name in the emitted types", () => {
    expect(dts).toContain("inferredValue: Wire<")
    expect(dts).toContain("inferredRow: Wire<")
  })
})
