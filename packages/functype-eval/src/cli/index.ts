#!/usr/bin/env node

import { runBench } from "./bench"
import { runScore } from "./score"

declare const __VERSION__: string

const HELP = `
functype-eval v${__VERSION__}

FP fitness scoring for functional TypeScript codebases using the functype ecosystem.

Usage: functype-eval <command> [options]

Commands:
  score <target>        Score a directory's functype/FP adherence (0–100)
  bench                 LLM eval harness (Phase 2, not yet implemented)

Score options:
  --json                Emit the result as JSON (for CI)
  --threshold <n>       Exit 1 if the score is below <n>
  --project <tsconfig>  tsconfig for the type-coverage dimension (else autodetected, else skipped)

Global:
  -v, --version         Show version number
  -h, --help            Show help

Examples:
  functype-eval score ./src
  functype-eval score ./src --json --threshold 80
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
