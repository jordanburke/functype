import { readFileSync } from "node:fs"
import { posix } from "node:path"

import ts from "typescript"
import { describe, expect, it } from "vitest"

import * as functype from "@/index"

/**
 * Type-checks every TypeScript block in the two quick references against the source: the package's
 * docs/quick-reference.md, and the functype skill's references/quick-reference.md that agents load.
 *
 * The quick reference is what agents and readers copy from, and it drifted from the code without
 * anything noticing: its Map section listed `entries()`, `addAll`, `merge` and an `add(k, v)` that
 * never existed, and its Tuple section showed `first()`/`mapFirst()`/`swap()`. A block that calls
 * something that does not exist now fails here, with the doc line it is on.
 *
 * - Imports resolve through the `exports` of functype and functype-os, the way a consumer's would,
 *   so a block that imports from a subpath neither package publishes fails too.
 * - The blocks are cheat sheets, so they use placeholder values (`option`, `list`, `defaultValue`)
 *   and stand-ins for the reader's own code (`User`, `UserSchema`). Each doc's prelude declares them
 *   with concrete types, which keeps calls on them checked. A block that needs a new placeholder
 *   adds it to its doc's prelude.
 * - The skill's blocks often leave out imports. For those, any functype export a block uses and
 *   neither imports nor declares is imported for it, on the block's first line so line numbers hold.
 * - A block that cannot compile on its own (pseudo-code, a fragment of another block) opts out
 *   with a ```ts ignore fence. That is visible in the doc, not a silent skip.
 */

// posix joins throughout, so virtual file names match what the compiler host is asked for on any OS
const { join } = posix
const PACKAGE_ROOT = join(import.meta.dirname.split("\\").join("/"), "..", "..")
const REPO_ROOT = join(PACKAGE_ROOT, "..", "..")

const DOCS_PRELUDE = `
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

const SKILL_PRELUDE = `
import type { Either, IO, List, Option, Try } from "functype"

declare global {
  type Row = { readonly id: string; readonly name: string }
  type User = {
    readonly id: string
    readonly name: string
    readonly email: string
    readonly isActive: boolean
    readonly profile?: { readonly avatar?: { readonly url: string }; readonly settings?: { readonly theme: string } }
  }
  type Saved = { readonly id: string }
  const row: Row
  const rows: ReadonlyArray<Row>
  const id: string
  const ids: ReadonlyArray<string>
  const userId: string
  const user: User | undefined
  const users: ReadonlyArray<User>
  const items: ReadonlyArray<string>
  const array: ReadonlyArray<number>
  const files: ReadonlyArray<string>
  const urls: ReadonlyArray<string>
  const paths: ReadonlyArray<string>
  const eithers: ReadonlyArray<Either<string, number>>
  const options: ReadonlyArray<Option<number>>
  const tries: ReadonlyArray<Try<number>>
  const input: string
  const token: string
  const requiresAuth: boolean
  const validThemes: ReadonlyArray<string>
  const defaultValue: number
  const parseRow: (raw: string) => Either<string, Row>
  const lookupUser: (id: string) => Option<User>
  const readFileSync: (path: string) => string
  const saveRow: (row: Row) => Promise<Either<Error, Saved>>
  const fetchUser: (id: string) => Promise<Either<Error, User>>
  const fetchUserAsync: (id: string) => Promise<Option<User>>
  const stat: (file: string) => Promise<number>
  const get: (url: string) => Promise<string>
  const riskyOperation: () => number
  const validateEmail: (input: string) => Either<string, string>
  const validateDomain: (email: string) => Either<string, string>
  const checkBlacklist: (email: string) => Either<string, string>
  const sendWelcome: (email: string) => void
  const value: number
  const fetchPage: (url: string) => IO<never, Error, string>
  const api: { readonly getUser: (id: string) => Promise<User> }
  const heavyComputation: () => number
  const computeOnce: () => number

  // SKILL.md
  type Config = { readonly name: string; readonly port: number }
  type DatabaseService = { readonly query: () => ReadonlyArray<string>; readonly findUser: (id: string) => Promise<User> }
  class NetworkError extends Error {
    readonly _tag: "NetworkError"
    constructor(cause?: unknown)
  }
  const str: string
  const findUser: (id: string) => User | undefined
  const configStr: string
  const defaultConfig: Config
  const validateConfig: (config: unknown) => Either<string, Config>
  const computation: () => number
  const error: Error
  const promise: Promise<number>
  const url: string
  const myDb: DatabaseService
  const effect: IO<never, Error, number>
  const onSuccess: (value: number) => string
  const onFailure: (error: Error) => string
  const onInterrupted: (fiberId: string) => string
  const hugeArray: ReadonlyArray<number>
  const fetchProfileAsync: (userId: string) => Promise<Option<{ readonly bio: string }>>
  const option: Option<number>
  const either: Either<string, number>
  const tryVal: Try<number>
  const yamlString: string
  const binaryData: string
  const fetchedUsers: ReadonlyArray<User>
  const existingSet: globalThis.Set<string>

  // references/common-patterns.md
  type Data = { readonly id: string }
  class UserNotFoundError extends Error {
    constructor(id: string, cause?: unknown)
  }
  const callback: ((...args: ReadonlyArray<number>) => void) | undefined
  const arg1: number
  const arg2: number
  const condition: boolean
  const compute: () => number
  const fetchData: (url: string) => Either<string, string>
  const parseData: (raw: string) => Either<{ readonly type: "parse"; readonly details: string }, unknown>
  const validateData: (value: unknown) => Either<{ readonly type: "validation"; readonly field: string }, Data>
  const fetchFromAPI: () => number
  const cachedData: number
  const userAgent: string
  const accessToken: string | undefined
  const userIds: ReadonlyArray<string>
  const fetchPageSafe: (url: string) => Promise<Either<Error, string>>
  const found: ReadonlyArray<{ readonly files: ReadonlyArray<string> }>
  const folders: ReadonlyArray<string>
  const listFiles: (folder: string) => Promise<ReadonlyArray<string>>
  const jsonString: string
  const defaultObject: unknown
  const sendEmail: (email: string) => void
  const db: { readonly findUser: (id: string) => Promise<User | null>; readonly saveUser: (user: User) => Promise<void> }
  const fallbackData: unknown
  const openConnection: () => { readonly query: (sql: string) => Promise<ReadonlyArray<User>>; readonly close: () => void }
  const onNavigateAway: (f: () => void) => void
  const renderData: (data: unknown) => void
  const data: string
  const splitIntoChunks: (data: string) => ReadonlyArray<string>
  const uploadChunk: (chunk: string | undefined) => Promise<void>
  const updateProgressBar: (percent: number) => void
  const loadAndParseConfig: () => Promise<Config>
  const currentUser: User | undefined
  const form: { readonly email: string; readonly age: number; readonly name: string }
  const validateAge: (age: number) => Either<string, number>
  const validateName: (name: string) => Either<string, string>
}

export {}
`

/** Value exports of functype, the names a block can use without importing. */
const FUNCTYPE_NAMES: ReadonlyArray<string> = Object.keys(functype)

const escape = (name: string): string => name.replace(/[$]/g, "\\$")

/** `import { … } from "functype"; ` for the functype names `code` uses but neither imports nor declares. */
const autoImport = (code: string): string => {
  const imported = new globalThis.Set(
    [...code.matchAll(/^import\s+(?:type\s+)?\{([^}]*)\}/gm)].flatMap((m) =>
      (m[1] ?? "").split(",").map(
        (spec) =>
          spec
            .replace(/^\s*type\s+/, "")
            .split(/\s+as\s+/)
            .pop()
            ?.trim() ?? "",
      ),
    ),
  )
  const declared = (name: string): boolean =>
    new RegExp(`\\b(?:const|let|var|function|class|type|interface)\\s+${escape(name)}\\b`).test(code)
  const used = FUNCTYPE_NAMES.filter(
    (name) =>
      !imported.has(name) &&
      !declared(name) &&
      new RegExp(`(?<![\\w$.])${escape(name)}(?![\\w$])`).test(code.replace(/\/\/.*$/gm, "")),
  )
  return used.length === 0 ? "" : `import { ${used.join(", ")} } from "functype"; `
}

type DocSpec = {
  /** Path from the repo root, used in failure messages. */
  readonly path: string
  readonly prelude: string
  readonly autoImport: boolean
}

const DOCS: ReadonlyArray<DocSpec> = [
  { path: "packages/functype/docs/quick-reference.md", prelude: DOCS_PRELUDE, autoImport: false },
  { path: ".claude/skills/functype/references/quick-reference.md", prelude: SKILL_PRELUDE, autoImport: true },
  { path: ".claude/skills/functype/SKILL.md", prelude: SKILL_PRELUDE, autoImport: true },
  { path: ".claude/skills/functype/references/common-patterns.md", prelude: SKILL_PRELUDE, autoImport: true },
]

type Block = { readonly line: number; readonly code: string }

/**
 * Fenced ```ts / ```typescript blocks, with the doc line of each block's first code line. A fence may be
 * indented, as inside a list item; its code is dedented by the fence's indent.
 */
const extractBlocks = (markdown: string): ReadonlyArray<Block> =>
  [...markdown.matchAll(/^([ \t]*)```(?:ts|typescript)([^\n]*)\n([\s\S]*?)^\1```/gm)]
    .filter((match) => !/\bignore\b/.test(match[2] ?? ""))
    .map((match) => {
      const indent = match[1] ?? ""
      return {
        line: markdown.slice(0, match.index).split("\n").length + 1,
        code: (match[3] ?? "")
          .split("\n")
          .map((line) => (line.startsWith(indent) ? line.slice(indent.length) : line))
          .join("\n"),
      }
    })

/** A package's name and each published subpath, mapped from the export's `types` target back to src. */
const exportPaths = (packageDir: string): Record<string, string[]> => {
  const pkg = JSON.parse(readFileSync(join(packageDir, "package.json"), "utf8")) as {
    readonly name: string
    readonly exports: Record<string, { readonly types?: string } | string>
  }
  return Object.fromEntries(
    Object.entries(pkg.exports)
      .flatMap(([subpath, target]) =>
        typeof target === "object" && target.types !== undefined ? [[subpath, target.types] as const] : [],
      )
      .map(([subpath, types]) => [
        subpath === "." ? pkg.name : `${pkg.name}/${subpath.slice(2)}`,
        [join(packageDir, types.replace("./dist/", "src/").replace(/\.d\.ts$/, ".ts"))],
      ]),
  )
}

type Result = {
  /** Diagnostics per block, mapped to doc lines. */
  readonly blocks: ReadonlyArray<ReadonlyArray<string>>
  /** Everything else: the prelude, or a global diagnostic. Any of these can turn placeholders into `any`. */
  readonly other: ReadonlyArray<string>
}

const typeCheck = (doc: DocSpec, blocks: ReadonlyArray<Block>): Result => {
  const virtualDir = join(PACKAGE_ROOT, "__quick_reference__")
  const preludeFile = join(virtualDir, "prelude.ts")
  const blockFiles = blocks.map((_, i) => join(virtualDir, `block-${i}.ts`))
  const sources: Record<string, string> = Object.fromEntries([
    [preludeFile, doc.prelude],
    ...blocks.map((block, i) => [
      blockFiles[i],
      `${doc.autoImport ? autoImport(block.code) : ""}${block.code}\nexport {}\n`,
    ]),
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
    paths: {
      ...base?.options.paths,
      ...exportPaths(PACKAGE_ROOT),
      ...exportPaths(join(REPO_ROOT, "packages", "functype-os")),
    },
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
        .map((d) => `${doc.path}:${block.line + lineOf(d)} ${message(d)}`),
    ),
    other: diagnostics
      .filter((d) => !blockFiles.includes(d.file?.fileName ?? ""))
      .map((d) => `${d.file?.fileName ?? "(global)"}:${lineOf(d) + 1} ${message(d)}`),
  }
}

describe.each(DOCS)("$path", (doc) => {
  const blocks = extractBlocks(readFileSync(join(REPO_ROOT, doc.path), "utf8"))

  it("has TypeScript blocks to check", () => {
    expect(blocks.length).toBeGreaterThan(10)
  })

  it("every TypeScript block type-checks against src", { timeout: 120_000 }, () => {
    const result = typeCheck(doc, blocks)
    expect(result.other).toEqual([])
    expect(result.blocks.flat()).toEqual([])
  })
})
