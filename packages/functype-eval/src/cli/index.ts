#!/usr/bin/env node

import { runBaseline, runCheck } from "./baseline"
import { runBench } from "./bench"
import { runScore } from "./score"

declare const __VERSION__: string

const HELP = `
functype-eval v${__VERSION__}

FP fitness scoring for functional TypeScript codebases using the functype ecosystem.

Usage: functype-eval <command> [options]

Commands:
  score <target>        Score a directory's functype/FP adherence (0–100)
  baseline <dir>        Write .functype-baseline.json: per-file counts for the tracked rules
  check <dir>           Exit 1 if any file's tracked count rose, or a new file has findings
  bench                 LLM eval harness (Phase 2, not yet implemented)

Score options:
  --json                Emit the result as JSON (for CI)
  --threshold <n>       Exit 1 if the score is below <n>
  --project <tsconfig>  tsconfig for the type-coverage dimension (else autodetected, else skipped)

Check options:
  --update              Rewrite the baseline when counts went down or stayed level (refused on any regression)

Tracked rules default to no-imperative-loops, prefer-functype-map, prefer-functype-set, prefer-map,
prefer-fold, no-let, prefer-flatmap and prefer-do-notation. Override them with
{ "trackedRules": [...] } in functype-eval.config.json.

Global:
  -v, --version         Show version number
  -h, --help            Show help

Exit codes (score):
  0  scored ok (and at/above --threshold if given)
  1  score below --threshold
  2  no TypeScript sources found under the target — nothing to score

Exit codes (baseline / check):
  0  baseline written / nothing regressed
  1  a count rose, or --update was refused
  2  nothing to compare: no sources, no or unreadable baseline, different target, unparsable file

Examples:
  functype-eval score ./src
  functype-eval score ./src --json --threshold 80
  functype-eval baseline ./src
  functype-eval check ./src
  functype-eval check ./src --update
`

const main = async (argv: ReadonlyArray<string>): Promise<number> => {
  const args = argv.slice(2)
  const command = args[0]

  if (args.includes("--version") || args.includes("-v")) {
    console.log(__VERSION__)
    return 0
  }
  if (args.length === 0 || command === "--help" || command === "-h" || command === "help") {
    console.log(HELP)
    return 0
  }
  if (command === "score") return runScore(args.slice(1))
  if (command === "baseline") return runBaseline(args.slice(1))
  if (command === "check") return runCheck(args.slice(1))
  if (command === "bench") return runBench(args.slice(1))

  console.error(`Unknown command: ${command}`)
  console.error(HELP)
  return 1
}

main(process.argv)
  .then((code) => process.exit(code))
  .catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : String(error))
    process.exit(1)
  })
