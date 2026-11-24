/**
 * `functype-eval baseline <dir>` and `functype-eval check <dir> [--update]`: a per-file ratchet.
 *
 * Both take one or more directories. `baseline` writes `.functype-baseline.json` in the current
 * directory, with paths relative to it. `check` fails (exit 1) when
 * any file's count for a tracked rule rose, or a file outside the baseline has findings; `--update`
 * rewrites the baseline, but only when nothing regressed. Tracked rules come from
 * `functype-eval.config.json` (`{ "trackedRules": [...] }`) in the current directory, else defaults.
 *
 * Exit codes: 0 ok, 1 regression (or a refused `--update`), 2 nothing to compare (bad arguments, a bad
 * config, no sources, no or unreadable baseline, different targets, or a file ESLint couldn't parse).
 */

import { existsSync, readFileSync, realpathSync, writeFileSync } from "node:fs"
import { join, resolve } from "node:path"

import {
  type Baseline,
  BASELINE_FILE,
  buildBaseline,
  collectCounts,
  type Collected,
  compareBaseline,
  type Comparison,
  parseBaseline,
  relativeTarget,
  resolveTrackedRules,
  serializeBaseline,
  shortRuleName,
} from "../baseline/index"
import { lintTarget } from "../scorers/eslint"

type ParsedArgs = {
  readonly targets: ReadonlyArray<string>
  readonly update: boolean
  /** Flags this command doesn't know. Any of them is an error, so a typo such as `--updat` can't pass silently. */
  readonly unknown: ReadonlyArray<string>
}

const parseArgs = (args: ReadonlyArray<string>, flags: ReadonlyArray<string>): ParsedArgs =>
  args.reduce<ParsedArgs>(
    (acc, arg) => {
      if (!arg.startsWith("-")) return { ...acc, targets: [...acc.targets, arg] }
      if (arg === "--update" && flags.includes(arg)) return { ...acc, update: true }
      return { ...acc, unknown: [...acc.unknown, arg] }
    },
    { targets: [], update: false, unknown: [] },
  )

/** The parsed args, or the usage error to print (exit 2). */
const argsFor = (args: ReadonlyArray<string>, flags: ReadonlyArray<string>, usage: string): ParsedArgs | string => {
  const parsed = parseArgs(args, flags)
  if (parsed.unknown.length > 0) return `functype-eval: unknown option ${parsed.unknown.join(", ")}\n${usage}`
  if (parsed.targets.length === 0) return usage
  return parsed
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value)

/** `trackedRules` from `functype-eval.config.json` in `cwd`, or undefined for the defaults. */
const configuredRules = (cwd: string): ReadonlyArray<string> | undefined => {
  const path = join(cwd, "functype-eval.config.json")
  if (!existsSync(path)) return undefined
  const parsed: unknown = JSON.parse(readFileSync(path, "utf8"))
  if (!isRecord(parsed)) throw new Error("functype-eval: functype-eval.config.json must be a JSON object")
  const rules = parsed.trackedRules
  if (rules === undefined) return undefined
  if (!Array.isArray(rules) || !rules.every((r): r is string => typeof r === "string")) {
    throw new Error("functype-eval: functype-eval.config.json: trackedRules must be an array of rule names")
  }
  return rules
}

/** The tracked rule ids, or the config error to print (exit 2, not the exit 1 of a regression). */
const trackedRulesFor = (cwd: string): ReadonlyArray<string> | string => {
  try {
    return resolveTrackedRules(configuredRules(cwd))
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    return message.startsWith("functype-eval") ? message : `functype-eval: functype-eval.config.json: ${message}`
  }
}

type Lint = Collected & { readonly targets: ReadonlyArray<string>; readonly trackedRules: ReadonlyArray<string> }

type Located = { readonly target: string; readonly targetAbs: string; readonly targetRel: string }

/** Resolve one target against `cwd`, or the error to print. */
const locate = (target: string, cwd: string): Located | string => {
  const targetAbs = resolve(cwd, target)
  if (!existsSync(targetAbs)) return `functype-eval: ${target} does not exist`
  const targetRel = relativeTarget(realpathSync(cwd), realpathSync(targetAbs))
  if (targetRel === ".." || targetRel.startsWith("../") || targetRel.startsWith("/")) {
    return `functype-eval: ${target} is outside the current directory; run from a directory that contains it`
  }
  return { target, targetAbs, targetRel }
}

/**
 * Lint the targets with the tracked rules; a string is the error to print (exit 2). Inline
 * `eslint-disable` comments are ignored, so a new one can't hide a rise.
 */
const lint = async (targets: ReadonlyArray<string>, cwd: string): Promise<Lint | string> => {
  const trackedRules = trackedRulesFor(cwd)
  if (typeof trackedRules === "string") return trackedRules
  const located = targets.map((target) => locate(target, cwd))
  const failed = located.find((l): l is string => typeof l === "string")
  if (failed !== undefined) return failed
  const ok = located.filter((l): l is Located => typeof l !== "string")

  const rules = trackedRules.map(shortRuleName)
  const linted = await Promise.all(
    ok.map(async ({ targetAbs, targetRel }) => ({
      results: await lintTarget(targetAbs, rules, { allowInlineConfig: false }),
      targetAbs,
      targetRel,
    })),
  )
  const collected = collectCounts(linted, trackedRules)
  if (collected.fileCount === 0) {
    return (
      `functype-eval: no TypeScript sources found under ${targets.join(", ")}.\n` +
      `  (looked for **/*.ts and **/*.tsx, excluding tests, .d.ts, node_modules, dist, lib)`
    )
  }
  if (collected.unparsable.length > 0) {
    return `functype-eval: ESLint couldn't parse ${collected.unparsable.join(", ")}; their findings are unknown`
  }
  return { ...collected, targets: [...new Set(ok.map((l) => l.targetRel))], trackedRules }
}

const plural = (n: number, word: string): string => `${n} ${word}${n === 1 ? "" : "s"}`

const BASELINE_USAGE = "Usage: functype-eval baseline <dir> [<dir> ...]"
const CHECK_USAGE = "Usage: functype-eval check <dir> [<dir> ...] [--update]"

export const runBaseline = async (args: ReadonlyArray<string>, cwd: string = process.cwd()): Promise<number> => {
  const parsed = argsFor(args, [], BASELINE_USAGE)
  if (typeof parsed === "string") {
    console.error(parsed)
    return 2
  }
  const result = await lint(parsed.targets, cwd)
  if (typeof result === "string") {
    console.error(result)
    return 2
  }
  const baseline = buildBaseline(result.targets, result.trackedRules, result.files)
  writeFileSync(join(cwd, BASELINE_FILE), serializeBaseline(baseline))
  const findings = Object.values(baseline.files).reduce(
    (total, counts) => total + Object.values(counts).reduce((a, b) => a + b, 0),
    0,
  )
  console.log(
    `Wrote ${BASELINE_FILE}: ${plural(findings, "finding")} in ${plural(Object.keys(baseline.files).length, "file")} ` +
      `(${plural(result.fileCount, "file")} linted, ${plural(result.trackedRules.length, "rule")} tracked).`,
  )
  return 0
}

const sameTargets = (a: ReadonlyArray<string>, b: ReadonlyArray<string>): boolean =>
  JSON.stringify([...a].sort()) === JSON.stringify([...b].sort())

const readBaseline = (cwd: string, args: string, targets: ReadonlyArray<string>): Baseline | string => {
  const path = join(cwd, BASELINE_FILE)
  if (!existsSync(path)) {
    return `functype-eval: no ${BASELINE_FILE} here. Create one with \`functype-eval baseline ${args}\`.`
  }
  try {
    const baseline = parseBaseline(readFileSync(path, "utf8"))
    return sameTargets(baseline.targets, targets)
      ? baseline
      : `functype-eval: ${BASELINE_FILE} was written for ${baseline.targets.join(", ")}, not ${[...targets].sort().join(", ")}. ` +
          `Check the same directories, or re-create the baseline.`
  } catch (error) {
    return `functype-eval: ${error instanceof Error ? error.message : String(error)}`
  }
}

const formatRegressions = (comparison: Comparison): string => {
  const rows = comparison.regressions.map((r) => ({
    path: r.path,
    rule: shortRuleName(r.rule),
    change: `${r.before} → ${r.after}${r.newFile ? "  (not in baseline)" : ""}`,
  }))
  const pathWidth = Math.max(...rows.map((r) => r.path.length))
  const ruleWidth = Math.max(...rows.map((r) => r.rule.length))
  return rows.map((r) => `  ${r.path.padEnd(pathWidth)}  ${r.rule.padEnd(ruleWidth)}  ${r.change}`).join("\n")
}

const notes = (comparison: Comparison): ReadonlyArray<string> => [
  ...(comparison.ignoredRules.length > 0
    ? [`  note: ignoring rules no longer tracked: ${comparison.ignoredRules.map(shortRuleName).join(", ")}`]
    : []),
  ...(comparison.newRules.length > 0
    ? [
        `  note: ${comparison.newRules.map(shortRuleName).join(", ")} not in the baseline, so compared against 0. ` +
          `Re-run \`functype-eval baseline\` to start tracking them.`,
      ]
    : []),
]

export const runCheck = async (args: ReadonlyArray<string>, cwd: string = process.cwd()): Promise<number> => {
  const parsed = argsFor(args, ["--update"], CHECK_USAGE)
  if (typeof parsed === "string") {
    console.error(parsed)
    return 2
  }
  const { targets, update } = parsed
  const result = await lint(targets, cwd)
  if (typeof result === "string") {
    console.error(result)
    return 2
  }
  const baseline = readBaseline(cwd, targets.join(" "), result.targets)
  if (typeof baseline === "string") {
    console.error(baseline)
    return 2
  }

  const comparison = compareBaseline(baseline, result.files, result.trackedRules)
  notes(comparison).forEach((line) => console.error(line))

  if (comparison.regressions.length > 0) {
    console.error(`✗ ${plural(comparison.regressions.length, "regression")} against ${BASELINE_FILE}:\n`)
    console.error(formatRegressions(comparison))
    console.error(
      update
        ? `\nRefusing to update ${BASELINE_FILE} while anything regressed. Fix the findings above first.`
        : "\nFix the new findings; counts may go down or stay level, never up.",
    )
    return 1
  }

  const down =
    comparison.findingsDown > 0
      ? `${plural(comparison.findingsDown, "finding")} down across ${plural(comparison.filesDown, "file")}`
      : "nothing went down"
  console.log(
    `✓ no regressions: ${plural(comparison.findings, "finding")} in ${plural(comparison.filesWithFindings, "file")}; ${down}.`,
  )

  if (!update) {
    if (comparison.findingsDown > 0)
      console.log(`  Run \`functype-eval check ${targets.join(" ")} --update\` to lock it in.`)
    return 0
  }
  const path = join(cwd, BASELINE_FILE)
  const next = serializeBaseline(buildBaseline(result.targets, result.trackedRules, result.files))
  if (next === readFileSync(path, "utf8")) {
    console.log(`  ${BASELINE_FILE} is already up to date.`)
    return 0
  }
  writeFileSync(path, next)
  console.log(`  Updated ${BASELINE_FILE}.`)
  return 0
}
