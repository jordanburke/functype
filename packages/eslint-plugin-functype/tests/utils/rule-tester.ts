import { RuleTester } from "@typescript-eslint/rule-tester"
import tsParser from "@typescript-eslint/parser"
import type { Rule, RuleTester as ESLintRuleTester } from "eslint"
import * as vitest from "vitest"

// Configure RuleTester to use Vitest
RuleTester.afterAll = vitest.afterAll
RuleTester.it = vitest.it
RuleTester.itOnly = vitest.it.only
RuleTester.describe = vitest.describe

/** What typescript-eslint's `RuleTester.run` is typed to accept, with its type parameters at their bounds. */
type TesterRule = Parameters<RuleTester["run"]>[1]
type TesterTests = Parameters<RuleTester["run"]>[2]

/** A rule's valid and invalid cases, in ESLint's own test case types. */
export type RuleTests = {
  readonly valid: ReadonlyArray<string | ESLintRuleTester.ValidTestCase>
  readonly invalid: ReadonlyArray<ESLintRuleTester.InvalidTestCase>
}

/** A `RuleTester` whose `run` takes this plugin's rules and cases as ESLint types them. */
export type PluginRuleTester = {
  readonly run: (ruleName: string, rule: Rule.RuleModule, tests: RuleTests) => void
}

/**
 * Wraps a typescript-eslint `RuleTester` so it takes ESLint's types.
 *
 * This plugin's rules are ESLint's own `Rule.RuleModule`, but typescript-eslint types `RuleTester.run` for its
 * own `RuleModule` and test cases, and those types lag ESLint 10. Its `SourceCode` has no `getLoc`, `getRange`,
 * `isGlobalReference` or `traverse`, so neither rule type is assignable to the other. Its `TestCaseError`
 * has no `message`, and its `suggestions` takes no count, though its run time checks both. The tester lints
 * with ESLint's own `Linter`, so at run time the rule gets the context `Rule.RuleModule` declares, and the
 * cases are read the way ESLint's types describe them. These two casts are the only place the types meet.
 */
export const forPluginRules = (tester: RuleTester): PluginRuleTester => ({
  run: (ruleName, rule, tests) => tester.run(ruleName, rule as unknown as TesterRule, tests as unknown as TesterTests),
})

// Create a rule tester instance configured for TypeScript using flat config
const tsRuleTester = new RuleTester({
  languageOptions: {
    parser: tsParser,
    parserOptions: {
      ecmaVersion: 2020,
      sourceType: "module",
      ecmaFeatures: {
        jsx: true,
      },
    },
  },
})

export const ruleTester = forPluginRules(tsRuleTester)

// Helper types for test cases

/** Values for a message's `{{placeholders}}`, as ESLint types them. */
type PlaceholderData = NonNullable<ESLintRuleTester.TestCaseError["data"]>

export type ValidTestCase = {
  name?: string
  code: string
  options?: unknown[]
  languageOptions?: {
    ecmaVersion?: number
    sourceType?: "script" | "module"
    globals?: Record<string, boolean>
  }
}

export type InvalidTestCase = ValidTestCase & {
  errors: Array<{
    messageId: string
    data?: PlaceholderData
    line?: number
    column?: number
    suggestions?: Array<{
      messageId: string
      data?: PlaceholderData
      output: string
    }>
  }>
  output?: string
}

export type RuleTestCase = {
  valid: ValidTestCase[]
  invalid: InvalidTestCase[]
}
