/**
 * Runs `eslint-plugin-functype` against a target directory via the ESLint Node API (flat config,
 * ESLint 10+) and returns raw per-rule violation counts. No shelling out, no reimplemented rules.
 *
 * The plugin is registered under the `functype` namespace so `functype/<rule>` ids resolve, and
 * `@typescript-eslint/parser` is supplied so `.ts`/`.tsx` sources parse — the rules themselves are
 * purely syntactic (AST-only), so no type information / target tsconfig is required here.
 */

import { resolve } from "node:path"

import tsParser from "@typescript-eslint/parser"
import { ESLint, type Linter } from "eslint"
import functypePlugin from "eslint-plugin-functype"

import { DEFAULT_DIMENSIONS, type DimensionConfig, enabledRuleNames } from "../types/index"

/** Files excluded from scoring across all scorers (build output, deps, tests, declarations). */
export const IGNORE_GLOBS: ReadonlyArray<string> = [
  "**/node_modules/**",
  "**/dist/**",
  "**/lib/**",
  "**/coverage/**",
  "**/*.d.ts",
  "**/*.test.ts",
  "**/*.test.tsx",
  "**/*.spec.ts",
  "**/*.spec.tsx",
]

/** Per-rule violation counts keyed by full rule id (`functype/<rule>`). */
export type RuleCounts = ReadonlyMap<string, number>

const buildEslint = (cwd: string, rules: ReadonlyArray<string>): ESLint => {
  const ruleRecord: Linter.RulesRecord = Object.fromEntries(rules.map((rule) => [`functype/${rule}`, "error"]))

  return new ESLint({
    // Run with cwd = target so flat-config `files` globs match the target's files (they're matched
    // relative to cwd; a target outside our own cwd would otherwise match nothing → no rules applied).
    cwd,
    // Ignore any ESLint config the target ships — the score must reflect our rule set, not theirs.
    overrideConfigFile: true,
    overrideConfig: [
      { ignores: [...IGNORE_GLOBS] },
      {
        files: ["**/*.ts", "**/*.tsx"],
        languageOptions: {
          parser: tsParser as Linter.Parser,
          ecmaVersion: "latest",
          sourceType: "module",
        },
        plugins: { functype: functypePlugin as unknown as ESLint.Plugin },
        rules: ruleRecord,
      },
    ],
  })
}

/**
 * Lint every `.ts`/`.tsx` file under `target` and tally violations per rule. Returns zero counts
 * (an empty map's `get` semantics) when no source files match.
 */
export const scoreEslint = async (
  target: string,
  dimensions: ReadonlyArray<DimensionConfig> = DEFAULT_DIMENSIONS,
): Promise<RuleCounts> => {
  const rules = enabledRuleNames(dimensions)
  const eslint = buildEslint(resolve(target), rules)

  const results = await lintOrEmpty(eslint, "**/*.{ts,tsx}")

  const initial = new Map<string, number>(rules.map((rule) => [`functype/${rule}`, 0]))
  return results
    .flatMap((result) => result.messages)
    .reduce((counts, message) => {
      const id = message.ruleId
      return id !== null && counts.has(id) ? counts.set(id, (counts.get(id) ?? 0) + 1) : counts
    }, initial)
}

/** `lintFiles` throws when a pattern matches nothing; treat that as "no violations". */
const lintOrEmpty = async (eslint: ESLint, pattern: string): Promise<ESLint.LintResult[]> => {
  try {
    return await eslint.lintFiles([pattern])
  } catch (error) {
    if (error instanceof Error && /No files matching|were found|were ignored/i.test(error.message)) {
      return []
    }
    throw error
  }
}
