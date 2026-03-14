import { RuleTester } from "@typescript-eslint/rule-tester"
import tsParser from "@typescript-eslint/parser"
import * as vitest from "vitest"

// Configure RuleTester to use Vitest
RuleTester.afterAll = vitest.afterAll
RuleTester.it = vitest.it
RuleTester.itOnly = vitest.it.only
RuleTester.describe = vitest.describe

// Create a rule tester instance configured for TypeScript using flat config
export const ruleTester = new RuleTester({
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

// Helper types for test cases
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
    data?: Record<string, unknown>
    line?: number
    column?: number
  }>
  output?: string
}

export type RuleTestCase = {
  valid: ValidTestCase[]
  invalid: InvalidTestCase[]
}
