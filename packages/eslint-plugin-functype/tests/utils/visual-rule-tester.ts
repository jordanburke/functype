import { RuleTester } from "@typescript-eslint/rule-tester"
import type { Rule } from "eslint"
import { ruleTester, type InvalidTestCase, type ValidTestCase } from "./rule-tester"

interface VisualTestCase extends InvalidTestCase {
  showTransformation?: boolean
}

interface VisualRuleTestCase {
  valid: ValidTestCase[]
  invalid: VisualTestCase[]
}

/**
 * Visual Rule Tester that displays before/after transformations
 */
export class VisualRuleTester {
  private static colorize = {
    red: (text: string) => `\x1b[31m${text}\x1b[0m`,
    green: (text: string) => `\x1b[32m${text}\x1b[0m`,
    blue: (text: string) => `\x1b[34m${text}\x1b[0m`,
    yellow: (text: string) => `\x1b[33m${text}\x1b[0m`,
    bold: (text: string) => `\x1b[1m${text}\x1b[0m`,
    dim: (text: string) => `\x1b[2m${text}\x1b[0m`,
  }

  private static formatCode(code: string): string {
    return code
      .split("\n")
      .map((line, index) => {
        const lineNum = (index + 1).toString().padStart(3, " ")
        return `${this.colorize.dim(lineNum)}│ ${line}`
      })
      .join("\n")
  }

  private static printTransformation(testCase: VisualTestCase, ruleName: string): void {
    if (!testCase.output || testCase.showTransformation === false) {
      return
    }

    const separator = "─".repeat(60)

    console.log(`\n${this.colorize.blue("━".repeat(80))}`)
    console.log(`${this.colorize.bold("🔧 TRANSFORMATION:")} ${this.colorize.yellow(testCase.name || "Unnamed test")}`)
    console.log(`${this.colorize.bold("📋 RULE:")} ${this.colorize.blue(ruleName)}`)
    console.log(`${this.colorize.blue(separator)}`)

    console.log(`${this.colorize.red("❌ BEFORE:")}`)
    console.log(this.formatCode(testCase.code.trim()))

    console.log(`\n${this.colorize.green("✅ AFTER:")}`)
    console.log(this.formatCode(testCase.output.trim()))

    // Show violations
    if (testCase.errors.length > 0) {
      console.log(`\n${this.colorize.yellow("⚠️  VIOLATIONS:")}`)
      testCase.errors.forEach((error, index) => {
        const message = error.messageId
        const data = error.data ? ` (${JSON.stringify(error.data)})` : ""
        console.log(`${this.colorize.dim(`   ${index + 1}.`)} ${message}${data}`)
      })
    }

    console.log(`${this.colorize.blue("━".repeat(80))}`)
  }

  /**
   * Run tests with visual output for transformations
   */
  static run(
    ruleName: string,
    rule: Rule.RuleModule,
    tests: VisualRuleTestCase,
    options: { showAll?: boolean } = {},
  ): void {
    const { showAll = false } = options

    // Convert to standard test format and add transformation logging
    const standardTests = {
      valid: tests.valid,
      invalid: tests.invalid.map((testCase) => {
        // Show transformation if explicitly enabled or if showAll is true
        const shouldShow = showAll || testCase.showTransformation !== false

        if (shouldShow && testCase.output) {
          // Print transformation info before the test runs
          setTimeout(() => {
            this.printTransformation(testCase, ruleName)
          }, 0)
        }

        // Return standard test case
        return {
          name: testCase.name,
          code: testCase.code,
          ...(testCase.options === undefined ? {} : { options: testCase.options }),
          errors: testCase.errors,
          output: testCase.output,
        }
      }),
    }

    // Run the actual tests
    ruleTester.run(ruleName, rule, standardTests)
  }

  /**
   * Helper to mark test cases for transformation display
   */
  static withTransformation(testCase: InvalidTestCase): VisualTestCase {
    return {
      ...testCase,
      showTransformation: true,
    }
  }

  /**
   * Create a batch of test cases with transformation display
   */
  static showTransformations(testCases: InvalidTestCase[]): VisualTestCase[] {
    return testCases.map((testCase) => VisualRuleTester.withTransformation(testCase))
  }
}

// Export convenience functions
export const { run: runVisualTest, withTransformation, showTransformations } = VisualRuleTester
