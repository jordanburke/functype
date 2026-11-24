/**
 * Per-file baseline ("ratchet") for `functype-eval baseline` / `functype-eval check`.
 *
 * A baseline records, per source file, how many findings each tracked `eslint-plugin-functype` rule
 * reports. `check` compares a fresh lint against it: a count may fall or stay level, never rise, and
 * a file missing from the baseline may not appear with findings. Everything here except
 * `resolveTrackedRules` is pure, so the CLI only adds file I/O and printing.
 *
 * The file is byte-identical on every machine: repo-relative POSIX paths, keys sorted by code unit,
 * and no timestamp, package version or absolute path in it.
 */

import { posix, relative, sep } from "node:path"

import { type ESLint } from "eslint"
import functypePlugin from "eslint-plugin-functype"

export const BASELINE_FILE = ".functype-baseline.json"

/** Bumped only when the file's shape changes. `check` refuses a schema it doesn't know. */
export const BASELINE_SCHEMA = 1

/**
 * Rules tracked by default: the ones where a new finding is a real defect.
 *
 * `prefer-option`, `prefer-either` and `prefer-try` are left out on purpose. They still fire on
 * correct boundary code, such as a nullable database column or `useState<T | null>`, so tracking
 * them blocks good commits. A codebase that tracked every rule dropped from 988 baselined findings
 * to 156 once they were excluded: measuring the right thing, not real progress. Add them back via
 * `functype-eval.config.json` once they stop firing on boundary code.
 */
export const DEFAULT_TRACKED_RULES: ReadonlyArray<string> = [
  "no-imperative-loops",
  "prefer-functype-map",
  "prefer-functype-set",
  "prefer-map",
  "prefer-fold",
  "no-let",
  "prefer-flatmap",
  "prefer-do-notation",
]

/**
 * Rules that report nothing without type information. `baseline`/`check` lint syntactically (no
 * tsconfig), so tracking one of these would record a silent 0 forever. Each rule's JSDoc says
 * "Type-aware only".
 */
export const TYPE_AWARE_ONLY: ReadonlySet<string> = new Set([
  "no-array-mutation",
  "no-container-mutation",
  "no-floating-io",
  "no-floating-result",
  "no-serialize-container",
  "no-uncalled-method",
])

const PREFIX = "functype/"

/** Per-rule counts for one file, keyed by full rule id (`functype/<rule>`). */
export type FileCounts = Readonly<Record<string, number>>

/** Per-file counts keyed by repo-relative POSIX path. Files with no findings are absent. */
export type FileCountsByPath = Readonly<Record<string, FileCounts>>

export type Baseline = {
  readonly schema: number
  /** The linted directories, relative to the baseline's directory, POSIX, sorted. `"."` is the root itself. */
  readonly targets: ReadonlyArray<string>
  /** Full rule ids (`functype/<rule>`), sorted. */
  readonly trackedRules: ReadonlyArray<string>
  readonly files: FileCountsByPath
}

export type Regression = {
  readonly path: string
  readonly rule: string
  readonly before: number
  readonly after: number
  /** True when the file had no entry in the baseline at all. */
  readonly newFile: boolean
}

export type Comparison = {
  readonly regressions: ReadonlyArray<Regression>
  /** Files whose total tracked findings went down. */
  readonly filesDown: number
  /** Sum of every per-rule decrease. */
  readonly findingsDown: number
  /** Tracked findings in the current lint. */
  readonly findings: number
  /** Files with at least one tracked finding in the current lint. */
  readonly filesWithFindings: number
  /** Rules in the baseline that are no longer tracked; ignored by the comparison. */
  readonly ignoredRules: ReadonlyArray<string>
  /** Tracked rules the baseline never recorded; compared against 0. */
  readonly newRules: ReadonlyArray<string>
}

/** Sort by UTF-16 code unit, independent of locale, so every machine writes the same order. */
export const byCodeUnit = (a: string, b: string): number => (a < b ? -1 : a > b ? 1 : 0)

/** Own-key lookup: absent keys (and inherited ones such as `constructor`) read as undefined. */
const lookup = <V>(record: Readonly<Record<string, V>>, key: string): V | undefined =>
  Object.hasOwn(record, key) ? record[key] : undefined

const unique = (values: ReadonlyArray<string>): ReadonlyArray<string> => [...new Set(values)].sort(byCodeUnit)

/** `functype/no-let` and `no-let` both become `no-let`. */
export const shortRuleName = (name: string): string => (name.startsWith(PREFIX) ? name.slice(PREFIX.length) : name)

const pluginRuleNames = (): ReadonlySet<string> =>
  new Set(Object.keys((functypePlugin as { readonly rules?: Record<string, unknown> }).rules ?? {}))

/**
 * Turn configured rule names (with or without the `functype/` prefix) into sorted full rule ids.
 * Throws on an empty list, a name the plugin doesn't have, or a type-aware-only rule.
 */
export const resolveTrackedRules = (names: ReadonlyArray<string> = DEFAULT_TRACKED_RULES): ReadonlyArray<string> => {
  if (names.length === 0) {
    throw new Error("functype-eval: trackedRules is empty, so check would always pass. List at least one rule.")
  }
  const short = unique(names.map(shortRuleName))
  const known = pluginRuleNames()
  const unknown = short.filter((name) => !known.has(name))
  if (unknown.length > 0) {
    throw new Error(
      `functype-eval: unknown rule(s) in trackedRules: ${unknown.join(", ")}.\n` +
        `  eslint-plugin-functype has: ${[...known].sort(byCodeUnit).join(", ")}`,
    )
  }
  const typeAware = short.filter((name) => TYPE_AWARE_ONLY.has(name))
  if (typeAware.length > 0) {
    throw new Error(
      `functype-eval: ${typeAware.join(", ")} need type information, which baseline/check doesn't load, ` +
        `so they would always count 0. Remove them from trackedRules.`,
    )
  }
  return short.map((name) => `${PREFIX}${name}`)
}

/** Convert a native relative path to POSIX. `separator` is a parameter so tests can feed `\`. */
export const toPosixPath = (path: string, separator: string = sep): string => path.split(separator).join("/")

/** Where `target` sits relative to `root`, as a POSIX path (`"."` when they're the same directory). */
export const relativeTarget = (root: string, target: string): string => {
  const rel = toPosixPath(relative(root, target))
  return rel === "" ? "." : rel
}

export type Collected = {
  readonly files: FileCountsByPath
  /** Number of distinct source files ESLint linted (with or without findings). */
  readonly fileCount: number
  /** Files ESLint couldn't parse. Their findings are unknown, so callers must not trust the counts. */
  readonly unparsable: ReadonlyArray<string>
}

/** One target's ESLint results. `targetAbs` is the directory as given to ESLint; `targetRel` its POSIX path from the root. */
export type LintedTarget = {
  readonly results: ReadonlyArray<ESLint.LintResult>
  readonly targetAbs: string
  readonly targetRel: string
}

/**
 * Tally tracked findings per file from ESLint's results, over one or more targets. Each key becomes
 * `targetRel/<path under target>`, so overlapping targets (`src` and `src/sub`) yield the same key
 * for a shared file, and a path seen twice keeps one entry: no file is counted twice.
 */
export const collectCounts = (linted: ReadonlyArray<LintedTarget>, trackedRules: ReadonlyArray<string>): Collected => {
  const tracked = new Set(trackedRules)
  const entries = linted.flatMap(({ results, targetAbs, targetRel }) =>
    results.map((result) => ({
      key: posix.join(targetRel, toPosixPath(relative(targetAbs, result.filePath))),
      fatal: result.messages.some((message) => message.fatal === true),
      counts: result.messages
        .map((message) => message.ruleId)
        .filter((id): id is string => id !== null && tracked.has(id))
        .reduce<Record<string, number>>((acc, id) => ({ ...acc, [id]: (lookup(acc, id) ?? 0) + 1 }), {}),
    })),
  )
  const perFile = new Map(entries.map((entry) => [entry.key, entry.counts] as const))
  const files = Object.fromEntries([...perFile].filter(([, counts]) => Object.keys(counts).length > 0))
  const unparsable = unique(entries.filter((entry) => entry.fatal).map((entry) => entry.key))
  return { files, fileCount: perFile.size, unparsable }
}

const sortCounts = (counts: FileCounts): FileCounts =>
  Object.fromEntries(
    Object.keys(counts)
      .sort(byCodeUnit)
      .map((rule) => [rule, lookup(counts, rule) ?? 0] as const)
      .filter(([, n]) => n > 0),
  )

export const buildBaseline = (
  targets: ReadonlyArray<string>,
  trackedRules: ReadonlyArray<string>,
  files: FileCountsByPath,
): Baseline => ({
  schema: BASELINE_SCHEMA,
  targets: unique(targets),
  trackedRules: unique(trackedRules),
  files: Object.fromEntries(
    Object.keys(files)
      .sort(byCodeUnit)
      .map((path) => [path, sortCounts(lookup(files, path) ?? {})] as const)
      .filter(([, counts]) => Object.keys(counts).length > 0),
  ),
})

/** Serialize with a fixed key order and a trailing newline, so the file diffs cleanly. */
export const serializeBaseline = (baseline: Baseline): string => {
  const ordered = buildBaseline(baseline.targets, baseline.trackedRules, baseline.files)
  return `${JSON.stringify(
    { schema: ordered.schema, targets: ordered.targets, trackedRules: ordered.trackedRules, files: ordered.files },
    null,
    2,
  )}\n`
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value)

const isCounts = (value: unknown): value is FileCounts =>
  isRecord(value) && Object.values(value).every((n) => typeof n === "number" && Number.isInteger(n) && n >= 0)

/** Parse and validate a baseline file. Throws with a readable message on any problem. */
export const parseBaseline = (text: string): Baseline => {
  const raw: unknown = JSON.parse(text)
  if (!isRecord(raw)) throw new Error(`${BASELINE_FILE} is not a JSON object`)
  if (raw.schema !== BASELINE_SCHEMA) {
    throw new Error(
      `${BASELINE_FILE} has schema ${JSON.stringify(raw.schema)}; this functype-eval reads schema ${BASELINE_SCHEMA}. ` +
        `Re-create it with \`functype-eval baseline <dir>\`.`,
    )
  }
  const { targets, trackedRules, files } = raw
  if (!Array.isArray(targets) || !targets.every((t): t is string => typeof t === "string")) {
    throw new Error(`${BASELINE_FILE}: "targets" must be an array of directories`)
  }
  if (!Array.isArray(trackedRules) || !trackedRules.every((r): r is string => typeof r === "string")) {
    throw new Error(`${BASELINE_FILE}: "trackedRules" must be an array of strings`)
  }
  if (!isRecord(files) || !Object.values(files).every(isCounts)) {
    throw new Error(`${BASELINE_FILE}: "files" must map paths to { rule: count } objects`)
  }
  return { schema: BASELINE_SCHEMA, targets, trackedRules, files: files as FileCountsByPath }
}

const sum = (values: ReadonlyArray<number>): number => values.reduce((total, n) => total + n, 0)

const countOf = (files: FileCountsByPath, path: string, rule: string): number => {
  const counts = lookup(files, path)
  return counts === undefined ? 0 : (lookup(counts, rule) ?? 0)
}

/**
 * Compare a fresh lint against the baseline, over the currently tracked rules only.
 *
 * - A rule the baseline has but that is no longer tracked is ignored (and dropped on `--update`).
 * - A tracked rule the baseline never recorded is compared against 0, so its findings show as
 *   regressions until the baseline is re-created: tracking a new rule is an explicit decision.
 */
export const compareBaseline = (
  baseline: Baseline,
  current: FileCountsByPath,
  trackedRules: ReadonlyArray<string>,
): Comparison => {
  const tracked = unique(trackedRules)
  const trackedSet = new Set(tracked)
  const baselineRules = unique([...baseline.trackedRules, ...Object.values(baseline.files).flatMap(Object.keys)])
  const paths = unique([...Object.keys(baseline.files), ...Object.keys(current)])

  const deltas = paths.flatMap((path) =>
    tracked.map((rule) => ({
      path,
      rule,
      before: countOf(baseline.files, path, rule),
      after: countOf(current, path, rule),
      newFile: lookup(baseline.files, path) === undefined,
    })),
  )

  const fileTotal = (counts: FileCounts | undefined): number =>
    sum(Object.entries(counts ?? {}).flatMap(([rule, n]) => (trackedSet.has(rule) ? [n] : [])))

  return {
    regressions: deltas.filter((d) => d.after > d.before),
    filesDown: paths.filter((path) => fileTotal(lookup(current, path)) < fileTotal(lookup(baseline.files, path)))
      .length,
    findingsDown: sum(deltas.filter((d) => d.after < d.before).map((d) => d.before - d.after)),
    findings: sum(Object.values(current).map(fileTotal)),
    filesWithFindings: Object.values(current).filter((counts) => fileTotal(counts) > 0).length,
    ignoredRules: baselineRules.filter((rule) => !trackedSet.has(rule)),
    newRules: tracked.filter((rule) => !baseline.trackedRules.includes(rule)),
  }
}
