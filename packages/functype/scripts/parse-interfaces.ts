/**
 * Shared parser for extracting and flattening the `extends` chain of a
 * declared interface across the functype source tree.
 *
 * Used by:
 *   - scripts/generate-interfaces.ts  (writes src/cli/interfaces.generated.ts)
 *   - test/cli/data-sync.spec.ts      (asserts cli/data.ts stays in sync)
 *
 * Why both call the same parser: the validation test fails when data.ts drifts
 * from source, and the generator is the canonical way to regenerate it.
 */

import * as fs from "fs"
import * as path from "path"

export interface SourceLocation {
  /** Path relative to the functype package root. */
  file: string
  /** Name of the interface to extract (may differ from the public type name, e.g. Either → EitherBase). */
  name: string
}

/**
 * Types that have a primary interface declaration we can parse. Keyed by the
 * public name used in src/cli/data.ts.
 */
export const TYPE_SOURCES: Record<string, SourceLocation> = {
  Option: { file: "src/option/Option.ts", name: "Option" },
  // Either is a discriminated union; EitherBase holds the shared method surface.
  Either: { file: "src/either/Either.ts", name: "EitherBase" },
  Try: { file: "src/try/Try.ts", name: "Try" },
  List: { file: "src/list/List.ts", name: "List" },
  Set: { file: "src/set/Set.ts", name: "Set" },
  Map: { file: "src/map/Map.ts", name: "Map" },
  Obj: { file: "src/obj/Obj.ts", name: "Obj" },
  Lazy: { file: "src/lazy/Lazy.ts", name: "Lazy" },
  LazyList: { file: "src/list/LazyList.ts", name: "LazyList" },
  Tuple: { file: "src/tuple/Tuple.ts", name: "Tuple" },
  // Task entries in data.ts describe the TaskOutcome surface.
  Task: { file: "src/core/task/Task.ts", name: "TaskOutcome" },
}

/**
 * Intermediate wrapper interfaces whose extends chain we want to inline rather
 * than surface to consumers. If you add a new wrapper here it gets walked.
 */
export const WRAPPER_SOURCES: Record<string, SourceLocation> = {
  Functype: { file: "src/functype/Functype.ts", name: "Functype" },
  FunctypeBase: { file: "src/functype/Functype.ts", name: "FunctypeBase" },
  FunctypeSum: { file: "src/functype/FunctypeSum.ts", name: "FunctypeSum" },
  FunctypeCollection: { file: "src/functype/Functype.ts", name: "FunctypeCollection" },
  AsyncMonad: { file: "src/typeclass/Functor.ts", name: "AsyncMonad" },
  Monad: { file: "src/typeclass/Functor.ts", name: "Monad" },
  Applicative: { file: "src/typeclass/Functor.ts", name: "Applicative" },
}

/**
 * Names dropped from the final output because they describe implementation
 * shape rather than a user-facing capability. The Functype* wrappers are
 * expanded transitively, so we drop the wrapper names themselves but keep
 * typeclasses they expand into (Functor, Applicative, Monad, AsyncMonad, …).
 */
export const INTERNAL_NAMES = new Set<string>([
  "Typeable",
  "Pipe",
  "ContainerOps",
  "CollectionOps",
  "Functype",
  "FunctypeBase",
  "FunctypeSum",
  "FunctypeCollection",
])

/**
 * Parse the `extends` clause of an interface declaration and return the
 * extended interface names with their generic instantiation stripped.
 *
 * Handles multi-line declarations and `Omit<X, ...>` (returns X).
 */
export function parseExtendsClause(sourceText: string, interfaceName: string): string[] {
  // Match the interface header; tolerate generic params after the name.
  const declRe = new RegExp(`export\\s+interface\\s+${interfaceName}\\b`)
  const match = declRe.exec(sourceText)
  if (!match) return []

  // From the match, walk forward until the first '{' at depth 0 of angle/paren
  // brackets — that's where the body starts.
  const start = match.index
  let i = start
  let angle = 0
  let paren = 0
  while (i < sourceText.length) {
    const ch = sourceText[i]
    if (ch === "<") angle++
    else if (ch === ">") angle--
    else if (ch === "(") paren++
    else if (ch === ")") paren--
    else if (ch === "{" && angle === 0 && paren === 0) break
    i++
  }
  const header = sourceText.slice(start, i)

  // Pull out everything after the *top-level* `extends` keyword. We have to
  // skip occurrences nested inside generic-parameter bounds like
  // `<out T extends Type>` — those are not the interface's extends clause.
  const extendsIdx = findTopLevelExtends(header)
  if (extendsIdx === -1) return []
  const extendsText = header.slice(extendsIdx + "extends".length).trim()

  // Split the extends list at top-level commas (ignore commas inside <…>).
  const parents = splitTopLevel(extendsText)

  // Normalize each entry: strip generics, unwrap Omit<X, …> → X.
  return parents.map(normalizeParent).filter((s): s is string => s.length > 0)
}

function findTopLevelExtends(header: string): number {
  const word = "extends"
  let angle = 0
  let paren = 0
  for (let i = 0; i <= header.length - word.length; i++) {
    const ch = header[i]
    if (ch === "<") {
      angle++
      continue
    }
    if (ch === ">") {
      angle--
      continue
    }
    if (ch === "(") {
      paren++
      continue
    }
    if (ch === ")") {
      paren--
      continue
    }
    if (angle !== 0 || paren !== 0) continue
    if (header.slice(i, i + word.length) !== word) continue
    // Word-boundary check on both sides.
    const before = i === 0 ? " " : header[i - 1]
    const after = header[i + word.length] ?? " "
    if (/\w/.test(before ?? "") || /\w/.test(after)) continue
    return i
  }
  return -1
}

function splitTopLevel(input: string): string[] {
  const parts: string[] = []
  let depth = 0
  let buf = ""
  for (const ch of input) {
    if (ch === "<") depth++
    else if (ch === ">") depth--
    else if (ch === "," && depth === 0) {
      parts.push(buf.trim())
      buf = ""
      continue
    }
    buf += ch
  }
  if (buf.trim().length > 0) parts.push(buf.trim())
  return parts
}

function normalizeParent(raw: string): string {
  // Drop trailing junk (whitespace, `{`).
  const trimmed = raw.replace(/[\s{].*$/s, "")
  // Identifier before the first `<`.
  const lt = trimmed.indexOf("<")
  const head = lt === -1 ? trimmed : trimmed.slice(0, lt)

  if (head === "Omit") {
    // Omit<X, ...> — extract the first generic argument's identifier.
    const innerStart = trimmed.indexOf("<")
    const innerEnd = matchingClose(trimmed, innerStart)
    if (innerStart === -1 || innerEnd === -1) return ""
    const inner = trimmed.slice(innerStart + 1, innerEnd)
    const firstArg = splitTopLevel(inner)[0] ?? ""
    return normalizeParent(firstArg)
  }

  return head.trim()
}

function matchingClose(s: string, openIdx: number): number {
  if (openIdx < 0 || s[openIdx] !== "<") return -1
  let depth = 0
  for (let i = openIdx; i < s.length; i++) {
    if (s[i] === "<") depth++
    else if (s[i] === ">") {
      depth--
      if (depth === 0) return i
    }
  }
  return -1
}

/**
 * Resolve an interface name into a flat list of leaf interface names by
 * recursively walking known wrapper interfaces.
 */
export function expandName(
  name: string,
  packageRoot: string,
  registry: Record<string, SourceLocation>,
  seen: Set<string>,
): string[] {
  if (seen.has(name)) return []
  seen.add(name)

  const source = registry[name]
  if (!source) return [name] // leaf, not a known wrapper

  const filePath = path.join(packageRoot, source.file)
  const text = fs.readFileSync(filePath, "utf-8")
  const parents = parseExtendsClause(text, source.name)
  // Include `name` itself — the caller filters out internal/wrapper names.
  // Without this, intermediate typeclasses like AsyncMonad/Monad/Applicative
  // would be invisible in the output even though they're true of the type.
  return [name, ...parents.flatMap((parent) => expandName(parent, packageRoot, registry, seen))]
}

/**
 * Compute the canonical interface list for a named type. Returns a deduped,
 * sorted list of leaf interface names with internal infrastructure dropped.
 *
 * @param typeName  Public name used as a key in src/cli/data.ts.
 * @param packageRoot Path to the functype package root (where src/ lives).
 * @returns Interface names, or null if `typeName` has no parseable source.
 */
export function computeInterfacesForType(typeName: string, packageRoot: string): string[] | null {
  const source = TYPE_SOURCES[typeName]
  if (!source) return null

  const filePath = path.join(packageRoot, source.file)
  const text = fs.readFileSync(filePath, "utf-8")
  const parents = parseExtendsClause(text, source.name)

  const allSources: Record<string, SourceLocation> = { ...TYPE_SOURCES, ...WRAPPER_SOURCES }
  // Seed `seen` with the starting type to prevent self-recursion on aliases.
  const seen = new Set<string>([typeName, source.name])
  const expanded = parents.flatMap((p) => expandName(p, packageRoot, allSources, seen))

  const filtered = expanded.filter((n) => !INTERNAL_NAMES.has(n))
  return Array.from(new Set(filtered)).sort()
}

/**
 * Compute interfaces for every entry in TYPE_SOURCES.
 */
export function computeAllInterfaces(packageRoot: string): Record<string, string[]> {
  const out: Record<string, string[]> = {}
  for (const typeName of Object.keys(TYPE_SOURCES)) {
    const list = computeInterfacesForType(typeName, packageRoot)
    if (list) out[typeName] = list
  }
  return out
}
