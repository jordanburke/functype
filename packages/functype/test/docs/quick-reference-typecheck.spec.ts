import { readFileSync } from "node:fs"
import { posix } from "node:path"

import ts from "typescript"
import { describe, expect, it } from "vitest"

/**
 * Type-checks every TypeScript block in docs/quick-reference.md against the package's own source.
 *
 * The quick reference is what agents and readers copy from, and it drifted from the code without
 * anything noticing: its Map section listed `entries()`, `addAll`, `merge` and an `add(k, v)` that
 * never existed, and its Tuple section showed `first()`/`mapFirst()`/`swap()`. A block that calls
 * something that does not exist now fails here, with the doc line it is on.
 *
 * - Imports resolve through package.json `exports`, the way a consumer's would, so a block that
 *   imports from a subpath functype does not publish fails too.
 * - The blocks are cheat sheets, so they use placeholder values (`option`, `list`, `defaultValue`)
 *   and stand-ins for the reader's own code (`User`, `UserSchema`). PRELUDE declares them with
 *   concrete types, which keeps calls on them checked. A block that needs a new placeholder adds it
 *   to PRELUDE.
 * - A block that cannot compile on its own (pseudo-code, a fragment of another block) opts out
 *   with a ```ts ignore fence. That is visible in the doc, not a silent skip.
 */

// posix joins throughout, so virtual file names match what the compiler host is asked for on any OS
const { join } = posix
const PACKAGE_ROOT = join(import.meta.dirname.split("\\").join("/"), "..", "..")
const DOC = join(PACKAGE_ROOT, "docs", "quick-reference.md")

const PRELUDE = `
import type { Either, HttpResponse, List, Map, Option, Set, Try } from "functype"

declare global {
  const option: Option<number>
  const either: Either<string, number>
  const tryVal: Try<number>
  const tryValue: Try<number>
  const list: List<number>
  const map: Map<string, number>
  const set: Set<number>
  const value: number
  const defaultValue: number
  const err: Error
  const data: unknown
  const jsonString: string
  const backup: () => number
  const operation: (x: number) => number

  type User = { readonly id: string; readonly name: string; readonly active: boolean }
  const UserSchema: { parse: (data: unknown) => User }
  const z: { array: <T>(schema: { parse: (data: unknown) => T }) => { parse: (data: unknown) => T[] } }
  const getToken: () => Promise<string>
  const logger: { info: (...args: unknown[]) => void }
  const defaultResponse: HttpResponse<User>
  const cachedResponse: HttpResponse<User>
}

export {}
`

type Block = { readonly line: number; readonly code: string }

/** Fenced ```ts / ```typescript blocks, with the doc line of each block's first code line. */
const extractBlocks = (markdown: string): ReadonlyArray<Block> =>
  [...markdown.matchAll(/^```(?:ts|typescript)([^\n]*)\n([\s\S]*?)^```/gm)]
    .filter((match) => !/\bignore\b/.test(match[1] ?? ""))
    .map((match) => ({
      line: markdown.slice(0, match.index).split("\n").length + 1,
      code: match[2] ?? "",
    }))

/** `functype` and each published subpath, mapped from the export's `types` target back to src. */
const exportPaths = (): Record<string, string[]> => {
  const pkg = JSON.parse(readFileSync(join(PACKAGE_ROOT, "package.json"), "utf8")) as {
    readonly exports: Record<string, { readonly types?: string } | string>
  }
  return Object.fromEntries(
    Object.entries(pkg.exports)
      .flatMap(([subpath, target]) =>
        typeof target === "object" && target.types !== undefined ? [[subpath, target.types] as const] : [],
      )
      .map(([subpath, types]) => [
        subpath === "." ? "functype" : `functype/${subpath.slice(2)}`,
        [join(PACKAGE_ROOT, types.replace("./dist/", "src/").replace(/\.d\.ts$/, ".ts"))],
      ]),
  )
}

type Result = {
  /** Diagnostics per block, mapped to doc lines. */
  readonly blocks: ReadonlyArray<ReadonlyArray<string>>
  /** Everything else: the prelude, or a global diagnostic. Any of these can turn placeholders into `any`. */
  readonly other: ReadonlyArray<string>
}

const typeCheck = (blocks: ReadonlyArray<Block>): Result => {
  const virtualDir = join(PACKAGE_ROOT, "__quick_reference__")
  const preludeFile = join(virtualDir, "prelude.ts")
  const blockFiles = blocks.map((_, i) => join(virtualDir, `block-${i}.ts`))
  const sources: Record<string, string> = Object.fromEntries([
    [preludeFile, PRELUDE],
    ...blocks.map((block, i) => [blockFiles[i], `${block.code}\nexport {}\n`]),
  ])

  const base = ts.getParsedCommandLineOfConfigFile(
    join(PACKAGE_ROOT, "tsconfig.json"),
    {},
    {
      ...ts.sys,
      onUnRecoverableConfigFileDiagnostic: (d) => {
        throw new Error(ts.flattenDiagnosticMessageText(d.messageText, " "))
      },
    },
  )
  const options: ts.CompilerOptions = {
    ...base?.options,
    noEmit: true,
    declaration: false,
    emitDeclarationOnly: false,
    noUnusedLocals: false,
    noUnusedParameters: false,
    paths: { ...base?.options.paths, ...exportPaths() },
  }
  const baseHost = ts.createCompilerHost(options)
  const host: ts.CompilerHost = {
    ...baseHost,
    readFile: (f) => sources[f] ?? baseHost.readFile(f),
    fileExists: (f) => f in sources || baseHost.fileExists(f),
    getSourceFile: (f, languageVersion, onError, shouldCreate) => {
      const source = sources[f]
      return source === undefined
        ? baseHost.getSourceFile(f, languageVersion, onError, shouldCreate)
        : ts.createSourceFile(f, source, languageVersion, true)
    },
  }

  const program = ts.createProgram([preludeFile, ...blockFiles], options, host)
  const diagnostics = ts.getPreEmitDiagnostics(program)
  const message = (d: ts.Diagnostic): string => `TS${d.code}: ${ts.flattenDiagnosticMessageText(d.messageText, " ")}`
  const lineOf = (d: ts.Diagnostic): number => d.file?.getLineAndCharacterOfPosition(d.start ?? 0).line ?? 0
  return {
    blocks: blocks.map((block, i) =>
      diagnostics
        .filter((d) => d.file?.fileName === blockFiles[i])
        .map((d) => `docs/quick-reference.md:${block.line + lineOf(d)} ${message(d)}`),
    ),
    other: diagnostics
      .filter((d) => !blockFiles.includes(d.file?.fileName ?? ""))
      .map((d) => `${d.file?.fileName ?? "(global)"}:${lineOf(d) + 1} ${message(d)}`),
  }
}

describe("docs/quick-reference.md", () => {
  const blocks = extractBlocks(readFileSync(DOC, "utf8"))

  it("has TypeScript blocks to check", () => {
    expect(blocks.length).toBeGreaterThan(10)
  })

  it("every TypeScript block type-checks against src", { timeout: 120_000 }, () => {
    const result = typeCheck(blocks)
    expect(result.other).toEqual([])
    expect(result.blocks.flat()).toEqual([])
  })
})
