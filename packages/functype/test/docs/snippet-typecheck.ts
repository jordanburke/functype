import { readFileSync } from "node:fs"
import { posix } from "node:path"

import ts from "typescript"

/**
 * Type-checks TypeScript snippets against functype's src, the way a reader who copies them would compile
 * them. Shared by test/docs/quick-reference-typecheck.spec.ts (the snippets in markdown docs) and the site's
 * scripts/check-examples.ts (the snippets in the built site's HTML). The file name keeps it out of Vitest's
 * spec glob.
 *
 * - Imports resolve through the `exports` of functype, functype-os and functype-log, the way a consumer's
 *   would, so a snippet that imports from a subpath none of them publishes fails too.
 * - A prelude declares the snippets' placeholder values (`option`, `user`) with concrete types, which keeps
 *   calls on them checked.
 * - With `autoImport`, any functype value a snippet uses and neither imports nor declares is imported for it,
 *   on the snippet's first line so line numbers hold.
 */

// posix joins throughout, so virtual file names match what the compiler host is asked for on any OS
const { join } = posix
const PACKAGE_ROOT = join(import.meta.dirname.split("\\").join("/"), "..", "..")
export const REPO_ROOT = join(PACKAGE_ROOT, "..", "..")

/** Placeholders shared by the site's type pages (site/src/content). Page-specific ones are in SITE_PAGE_PRELUDES. */
export const SITE_PRELUDE = `
import type { Either, IO, List, Option, Try } from "functype"

declare global {
  type User = { readonly id: string; readonly name: string; readonly email: string; readonly age: number }
}

export {}
`

/** Page-specific site placeholders, appended to SITE_PRELUDE. Names may differ in shape between pages. */
export const SITE_PAGE_PRELUDES: Readonly<Record<string, string>> = {
  "do-notation": `
declare global {
  type Profile = { readonly settingsId: string; readonly email: Option<string> }
  const input: { readonly name: string; readonly age: number; readonly email: string }
  const validateName: (name: string | { readonly name: string }) => Either<string, string>
  const validateAge: (age: number) => Either<string, number>
  const validateEmail: (email: string | { readonly email: string }) => Either<string, string>
  const id: string
  const findUser: (id: string) => Option<{ readonly profile: Option<Profile> }>
  const readConfig: () => { readonly url: string }
  const connectDB: (config: { readonly url: string }) => { readonly query: (sql: string) => ReadonlyArray<User> }
  const fetchUser: (id: string) => Promise<Either<Error, User>>
  const fetchPosts: (userId: string) => Promise<Either<Error, ReadonlyArray<string>>>
  const getUser: (id: string) => Option<User & { readonly profileId: string }>
  const getProfile: (profileId: string) => Option<Profile>
  const getSettings: (settingsId: string) => Option<{ readonly theme: string }>
}
`,
  either: `
declare global {
  type UserInput = { readonly name: string; readonly age: number; readonly email: string }
  const either: Either<string, number>
  const rows: ReadonlyArray<{ readonly id: string }>
  const saveRow: (row: { readonly id: string }) => Promise<Either<Error, { readonly id: string }>>
  const ids: ReadonlyArray<string>
  const fetchUser: (id: string) => Promise<Either<Error, User>>
  const validateUser: (input: UserInput) => Either<ReadonlyArray<string>, User>
  const input: UserInput
  const validateName: (name: string) => Either<string, string>
  const validateAge: (age: number) => Either<string, number>
  const validateEmail: (email: string) => Either<string, string>
}
`,
  http: `
import type { Decoder, HttpError, HttpRequestView } from "functype"
declare global {
  type Schema<T> = { readonly parse: (data: unknown) => T }
  class AppError extends Error {
    constructor(cause: HttpError)
  }
  const UserSchema: Schema<User>
  const PostSchema: Schema<{ readonly id: string; readonly title: string }>
  const OrderSchema: Schema<{ readonly id: string; readonly total: number }>
  const ConfigSchema: Schema<{ readonly apiUrl: string }>
  const GraphQLResultSchema: Schema<{ readonly data: unknown }>
  const z: { readonly array: <T>(schema: Schema<T>) => Schema<T[]> }
  const Value: { readonly Decode: <T>(schema: Schema<T>, data: unknown) => T }
  const parse: <T>(schema: Schema<T>, data: unknown) => T
  const UserDecoder: Decoder<User>
  const userDecoder: Decoder<User>
  const usersDecoder: Decoder<ReadonlyArray<User>>
  const newUser: { readonly name: string; readonly email: string }
  const token: string
  const getToken: () => Promise<string>
  const logger: { readonly info: (...args: ReadonlyArray<unknown>) => void }
  const myMockFetch: typeof globalThis.fetch
  const addBearer: (request: HttpRequestView) => IO<never, HttpError, HttpRequestView>
  const refreshToken: () => IO<never, HttpError, void>
  const redactSensitiveHeaders: (headers: Headers) => Headers
  const maybeCursor: Option<string>
  const api: ReturnType<typeof import("functype").Http.client>
}
`,
  io: `
import type { Exit, HttpError, Tag } from "functype"
declare global {
  type LoggerService = { readonly log: (message: string) => void }
  type AppConfig = { readonly url: string }
  class WrappedError extends Error {
    constructor(cause: unknown)
  }
  class AuthError extends Error {}
  const Logger: Tag<LoggerService>
  const Config: Tag<AppConfig>
  const consoleLogger: LoggerService
  const appConfig: AppConfig
  const program: IO<LoggerService | AppConfig, never, void>
  const fetchData: () => Promise<unknown>
  const input: string
  const io: IO<never, HttpError, number>
  const fallback: number
  const defaultValue: number
  const fallbackIO: IO<never, never, number>
  const io1: IO<never, Error, number>
  const io2: IO<never, Error, number>
  const io3: IO<never, Error, number>
  const items: ReadonlyArray<string>
  const save: (item: string) => IO<never, Error, void>
  const getUser: (id: string) => IO<never, Error, User>
  const getPosts: (userId: string) => IO<never, Error, ReadonlyArray<string>>
  const openFile: (path: string) => { readonly read: () => string; readonly close: () => void }
  const path: string
  const openConnection: () => { readonly query: (sql: string) => ReadonlyArray<User>; readonly close: () => void }
  const sql: string
  const checkStatus: IO<never, Error, { readonly done: boolean }>
  const signal: AbortSignal
  const lastKnown: { readonly done: boolean }
  const loadReport: IO<never, Error, string>
  const url: string
  const effect: IO<never, Error, number>
  const bad: string
  const exit: Exit<Error, number>
  const report: (error: Error) => number | null
  const crash: (defect: unknown) => number | null
  const taggedIO: IO<never, { readonly _tag: "NotFound" } | { readonly _tag: "Timeout" }, string>
  const pollJob: IO<never, Error, { readonly done: boolean }>
  const pollUntilReady: IO<never, Error, { readonly status: "pending" | "ready" }>
}
`,
  list: `
declare global {
  const ids: ReadonlyArray<string>
  const fetchUser: (id: string) => Promise<User>
  const list: List<number>
}
`,
  match: `
declare global {
  const statusCode: number
  const value: string | number | boolean
  const name: string | undefined
  const result: Either<string, number>
  const tryValue: Try<number>
  const score: number
  const age: number
  const expensiveCompute: () => number
  const httpMethod: "GET" | "POST" | "PUT" | "DELETE"
  const handleGet: () => string
  const handlePost: () => string
  const handlePut: () => string
  const handleOther: () => string
  const action: { readonly type: "INCREMENT" | "DECREMENT" | "RESET" | "NOOP" }
  const state: number
  const order: { readonly total: number; readonly isPrime: boolean; readonly isLocal: boolean }
  const errors: ReadonlyArray<string>
  const warnings: ReadonlyArray<string>
  const status: number
}
`,
  obj: `
declare global {
  const isAdmin: boolean
  const userAgent: string
  const requiresAuth: boolean
  const accessToken: string | undefined
}
`,
  option: `
declare global {
  const user: User | undefined
  const name: string | null
  const option: Option<number>
}
`,
  set: `
declare global {
  const nums: import("functype").Set<number>
}
`,
  try: `
declare global {
  type Config = { readonly url: string }
  class CustomError extends Error {}
  const jsonString: string
  const readFile: (path: string) => string
  const path: string
  const validate: (data: unknown) => unknown
  const riskyOperation: () => number
  const fallbackValue: number
  const primarySource: () => string
  const backupSource: () => string
  const parse: (raw: string) => { readonly data: { readonly children: ReadonlyArray<{ readonly data: unknown }> } }
  const raw: string
  const fetchData: () => ReadonlyArray<string>
  const result: Try<string>
  const readConfig: () => Config
  const connectDB: (config: Config) => { readonly query: (sql: string) => ReadonlyArray<User> }
  const riskyCall: () => number
  const input: string
  const tryValue: Try<number>
}
`,
  wire: `
declare global {
  type InviteId = string & { readonly __brand: "InviteId" }
  type UserRow = import("functype").Wire<{ readonly id: string; readonly email: string | null }>
  type UserRows = import("functype").Wire<ReadonlyArray<UserRow>>
  type Row = { readonly id: string }
  const db: { readonly query: (sql: string) => { readonly rows: UserRows } }
  const enrich: (row: UserRow) => UserRow
}
`,
}

export const SITE_PAGES = [
  "do-notation",
  "either",
  "http",
  "io",
  "list",
  "logger",
  "match",
  "mcp-server",
  "obj",
  "option",
  "set",
  "try",
  "upgrading-to-2",
  "wire",
] as const

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

/** functype's tsconfig, as a no-emit check whose imports resolve to the packages' src. */
const compilerOptions = (): ts.CompilerOptions => {
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
  return {
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
      ...exportPaths(join(REPO_ROOT, "packages", "functype-log")),
      ...exportPaths(join(REPO_ROOT, "packages", "functype-react")),
      ...exportPaths(join(REPO_ROOT, "packages", "functype-kysely")),
      ...exportPaths(join(REPO_ROOT, "packages", "functype-hono")),
      // functype-kysely's README imports Kysely's types; functype itself doesn't depend on it.
      kysely: [join(REPO_ROOT, "packages", "functype-kysely", "node_modules", "kysely", "dist", "index.d.ts")],
      // functype-hono's README imports Hono, which functype doesn't depend on either.
      hono: [join(REPO_ROOT, "packages", "functype-hono", "node_modules", "hono", "dist", "types", "index.d.ts")],
      "hono/*": [
        join(REPO_ROOT, "packages", "functype-hono", "node_modules", "hono", "dist", "types", "*", "index.d.ts"),
        join(REPO_ROOT, "packages", "functype-hono", "node_modules", "hono", "dist", "types", "*.d.ts"),
      ],
    },
  }
}

/** Value exports of functype's src/index.ts, read by the compiler: the names a snippet can use without importing. */
const functypeValueNames = (): ReadonlyArray<string> => {
  const index = join(PACKAGE_ROOT, "src", "index.ts")
  const program = ts.createProgram([index], compilerOptions())
  const checker = program.getTypeChecker()
  const source = program.getSourceFile(index)
  const module = source === undefined ? undefined : checker.getSymbolAtLocation(source)
  if (module === undefined) throw new Error(`cannot read the exports of ${index}`)
  const typeOnly = (declaration: ts.Declaration): boolean =>
    (ts.isExportSpecifier(declaration) || ts.isImportSpecifier(declaration)) &&
    (declaration.isTypeOnly || declaration.parent.parent.isTypeOnly)
  // A value export reaches a value through aliases none of which is `export type` / `import type`
  const isValue = (symbol: ts.Symbol): boolean =>
    (symbol.flags & ts.SymbolFlags.Alias) === 0
      ? (symbol.flags & ts.SymbolFlags.Value) !== 0
      : !(symbol.declarations ?? []).some(typeOnly) && isValue(checker.getImmediateAliasedSymbol(symbol) ?? symbol)
  return checker
    .getExportsOfModule(module)
    .filter(isValue)
    .map((symbol) => symbol.name)
}

const FUNCTYPE_NAMES = functypeValueNames()

/** Escapes every regex metacharacter, so a name can be matched literally inside a RegExp. */
const escape = (name: string): string => name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")

/** `import { … } from "functype"; ` for the functype names `code` uses but neither imports nor declares. */
export const autoImport = (code: string): string => {
  const imported = new globalThis.Set(
    [...code.matchAll(/^import\s+(?:type\s+)?\{([^}]*)\}/gm)].flatMap((m) =>
      (m[1] ?? "").split(",").map(
        (spec) =>
          spec
            .replace(/^\s*type\s+/, "")
            .split(/\s+as\s+/)
            .at(-1)
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

export type SnippetDoc = {
  /** Where the snippets come from, used in failure messages: a path from the repo root, or a page. */
  readonly path: string
  readonly prelude: string
  readonly autoImport: boolean
}

export type Snippet = {
  /** The line of the snippet's first code line in its doc, used in failure messages. */
  readonly line: number
  readonly code: string
  /** Overrides the doc's `autoImport` for this snippet. */
  readonly autoImport?: boolean
}

export type Result = {
  /** Diagnostics per block, mapped to doc lines. */
  readonly blocks: ReadonlyArray<ReadonlyArray<string>>
  /** Everything else: the prelude, or a global diagnostic. Any of these can turn placeholders into `any`. */
  readonly other: ReadonlyArray<string>
}

export const typeCheck = (doc: SnippetDoc, blocks: ReadonlyArray<Snippet>): Result => {
  const virtualDir = join(PACKAGE_ROOT, "__quick_reference__")
  const preludeFile = join(virtualDir, "prelude.ts")
  const blockFiles = blocks.map((_, i) => join(virtualDir, `block-${i}.ts`))
  const sources: Record<string, string> = Object.fromEntries([
    [preludeFile, doc.prelude],
    ...blocks.map((block, i) => [
      blockFiles[i],
      `${(block.autoImport ?? doc.autoImport) ? autoImport(block.code) : ""}${block.code}\nexport {}\n`,
    ]),
  ])

  const options = compilerOptions()
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
  // Only the snippets' own files are checked; functype's src is type-checked by its own compile step.
  const diagnostics = [
    ...program.getConfigFileParsingDiagnostics(),
    ...program.getOptionsDiagnostics(),
    ...program.getGlobalDiagnostics(),
    ...[preludeFile, ...blockFiles].flatMap((file) => {
      const source = program.getSourceFile(file)
      return source === undefined
        ? []
        : [...program.getSyntacticDiagnostics(source), ...program.getSemanticDiagnostics(source)]
    }),
  ]
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
