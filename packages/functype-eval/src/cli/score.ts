/**
 * `functype-eval score <target>` — prints a per-dimension breakdown and a 0–100 fitness score.
 * Flags: `--json` (machine-readable), `--threshold N` (exit 1 when below), `--project <tsconfig>`.
 * An optional `functype-eval.config.json` in cwd may supply `{ "weights": { ... } }` overrides.
 */

import { existsSync, readFileSync } from "node:fs"
import { resolve } from "node:path"

import { score } from "../index"
import { type ScoreOptions, type ScoreResult } from "../types/index"

type ParsedArgs = {
  readonly target?: string
  readonly json: boolean
  readonly threshold?: number
  readonly project?: string
}

const EMPTY_ARGS: ParsedArgs = { json: false }

const parseArgs = (args: ReadonlyArray<string>): ParsedArgs =>
  args.reduce<{ acc: ParsedArgs; skip: boolean }>(
    ({ acc, skip }, arg, index) => {
      if (skip) return { acc, skip: false }
      const next = args[index + 1]
      if (arg === "--json") return { acc: { ...acc, json: true }, skip: false }
      if (arg === "--threshold") return { acc: { ...acc, threshold: Number(next) }, skip: true }
      if (arg.startsWith("--threshold=")) return { acc: { ...acc, threshold: Number(arg.slice(12)) }, skip: false }
      if (arg === "--project") return { acc: { ...acc, project: next }, skip: true }
      if (arg.startsWith("--project=")) return { acc: { ...acc, project: arg.slice(10) }, skip: false }
      if (!arg.startsWith("-") && acc.target === undefined) return { acc: { ...acc, target: arg }, skip: false }
      return { acc, skip: false }
    },
    { acc: EMPTY_ARGS, skip: false },
  ).acc

const loadConfig = (): ScoreOptions => {
  const path = resolve(process.cwd(), "functype-eval.config.json")
  if (!existsSync(path)) return {}
  const parsed = JSON.parse(readFileSync(path, "utf8")) as { weights?: ScoreOptions["weights"] }
  return parsed.weights === undefined ? {} : { weights: parsed.weights }
}

const pad = (value: string, width: number): string => value.padEnd(width)
const padStart = (value: string, width: number): string => value.padStart(width)

const formatTable = (result: ScoreResult): string => {
  const header = `  ${pad("Dimension", 15)}${padStart("Weight", 8)}${padStart("Score", 8)}   Detail`
  const divider = `  ${"─".repeat(46)}`
  const rows = result.dimensions.map(
    (d) =>
      `  ${pad(d.id, 15)}${padStart(d.weight.toFixed(2), 8)}${padStart(d.skipped ? "—" : d.score.toFixed(2), 8)}   ${d.detail}`,
  )
  return [
    `\n  functype-eval — ${result.target}`,
    "",
    header,
    divider,
    ...rows,
    divider,
    `  Fitness score:  ${result.score} / 100   (${result.loc} LOC)`,
    "",
  ].join("\n")
}

export const runScore = async (args: ReadonlyArray<string>): Promise<number> => {
  const parsed = parseArgs(args)
  if (parsed.target === undefined) {
    console.error("Usage: functype-eval score <target> [--json] [--threshold N] [--project <tsconfig>]")
    return 1
  }

  const config = loadConfig()
  const result = await score(parsed.target, {
    weights: config.weights,
    project: parsed.project ?? config.project,
  })

  // Empty-input guard: with no source files every density dimension is trivially 1.0 and the
  // composite is a vacuous 100. Don't present that as a passing score — report it and exit 2 (an
  // error distinct from a threshold failure, which exits 1). JSON callers still get the payload.
  if (result.fileCount === 0) {
    console.error(
      `functype-eval: no TypeScript sources found under ${result.target} — nothing to score.\n` +
        `  (looked for **/*.ts and **/*.tsx, excluding tests, .d.ts, node_modules, dist, lib)`,
    )
    if (parsed.json) console.log(JSON.stringify(result, null, 2))
    return 2
  }

  console.log(parsed.json ? JSON.stringify(result, null, 2) : formatTable(result))

  if (parsed.threshold !== undefined && result.score < parsed.threshold) {
    if (!parsed.json) {
      console.error(`✗ score ${result.score} is below threshold ${parsed.threshold}`)
    }
    return 1
  }
  return 0
}
