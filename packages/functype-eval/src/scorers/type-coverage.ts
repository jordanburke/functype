/**
 * type-coverage dimension. This is the one dimension that needs the target's TypeScript program, so
 * it resolves a tsconfig per decision 2A: explicit `--project` → autodetect (walk up from target) →
 * else skip (the aggregator then renormalizes the remaining weights).
 *
 * We resolve the tsconfig with the TypeScript compiler API rather than letting `type-coverage-core`
 * do it: tcc resolves `extends` with naive `node_modules/<pkg>/tsconfig.json` path-joins and does
 * NOT honor package.json `exports`, so it chokes on `extends: "ts-builds/tsconfig"` (used across this
 * repo). TS's resolver honors exports/extends; we then hand the resolved options + file list to
 * `lintSync`. `notOnlyInCWD` + `absolutePath` make it count the target's files regardless of cwd.
 *
 * Returns a native ratio (`correctCount / totalCount`), not a density score.
 */

import { existsSync } from "node:fs"
import { dirname, isAbsolute, join, resolve } from "node:path"

import { lintSync } from "type-coverage-core"
import ts from "typescript"

export type TypeCoverageResult = {
  readonly skipped: boolean
  /** Coverage ratio 0.0–1.0 (`correctCount / totalCount`). Meaningless when `skipped`. */
  readonly score: number
  /** Coverage percentage 0–100, for display. */
  readonly percent: number
  /** The tsconfig actually used, if any. */
  readonly tsconfigPath?: string
}

const SKIPPED: TypeCoverageResult = { skipped: true, score: 0, percent: 0 }

/** Walk up from `dir` to the filesystem root looking for the nearest tsconfig.json. */
const findTsconfigUp = (dir: string): string | undefined => {
  const candidate = join(dir, "tsconfig.json")
  if (existsSync(candidate)) return candidate
  const parent = dirname(dir)
  return parent === dir ? undefined : findTsconfigUp(parent)
}

/** Resolve the nearest tsconfig: explicit path, else walk up from the target directory. */
export const resolveTsconfig = (target: string, explicit?: string): string | undefined => {
  if (explicit !== undefined && explicit !== "") {
    const path = isAbsolute(explicit) ? explicit : resolve(process.cwd(), explicit)
    return existsSync(path) ? path : undefined
  }
  return findTsconfigUp(resolve(target))
}

/** Fully resolve a tsconfig (following `extends`, honoring package `exports`) to options + files. */
const parseProject = (
  tsconfigPath: string,
): { options: ts.CompilerOptions; fileNames: ReadonlyArray<string> } | undefined => {
  const host: ts.ParseConfigFileHost = {
    fileExists: ts.sys.fileExists,
    readFile: ts.sys.readFile,
    readDirectory: ts.sys.readDirectory,
    useCaseSensitiveFileNames: ts.sys.useCaseSensitiveFileNames,
    getCurrentDirectory: ts.sys.getCurrentDirectory,
    onUnRecoverableConfigFileDiagnostic: () => undefined,
  }
  const parsed = ts.getParsedCommandLineOfConfigFile(tsconfigPath, undefined, host)
  return parsed === undefined ? undefined : { options: parsed.options, fileNames: parsed.fileNames }
}

export const scoreTypeCoverage = (target: string, explicit?: string): TypeCoverageResult => {
  const tsconfigPath = resolveTsconfig(target, explicit)
  if (tsconfigPath === undefined) return SKIPPED

  const project = parseProject(tsconfigPath)
  if (project === undefined || project.fileNames.length === 0) return SKIPPED

  // `files` whitelists the target's OWN sources (absolute paths). Without it, type-coverage-core
  // also walks resolved dependency `.d.ts` (e.g. functype's dist, which lives outside node_modules
  // and so isn't auto-excluded) — inflating the ratio toward 100% and spamming "unhandled node kind"
  // diagnostics on AST kinds its TS-5-era checker doesn't recognize under TS 6.
  const ownFiles = [...project.fileNames]
  const { correctCount, totalCount } = lintSync(project.options, ownFiles, {
    strict: false,
    absolutePath: true,
    notOnlyInCWD: true,
    files: ownFiles,
  })
  const score = totalCount === 0 ? 1 : correctCount / totalCount
  return { skipped: false, score, percent: score * 100, tsconfigPath }
}
