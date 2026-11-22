/**
 * Lints a snippet with eslint-plugin-functype's `recommended` preset, the rules a project's build
 * runs, so an agent checking a snippet sees the same errors its build would (roadmap 7c).
 *
 * It reuses the TypeScript program the type check built, through typescript-eslint's `programs`
 * option, so the type-aware rules (`no-floating-result`, `no-array-mutation` and the rest) work on
 * the in-memory snippet.
 */

import tsParser from "@typescript-eslint/parser"
import type { Linter as LinterType } from "eslint"
import { Linter } from "eslint"
import functype from "eslint-plugin-functype"
import type ts from "typescript"

import type { LintDiagnostic } from "./types"

type Preset = { readonly rules: LinterType.RulesRecord }

const recommended = (functype.configs as Readonly<Record<string, Preset>>)["recommended"]
// Without the preset no rule would run, and every snippet would lint clean, so fail loudly instead.
if (recommended === undefined) throw new Error("eslint-plugin-functype has no recommended preset")

const config = (program: ts.Program): LinterType.Config[] => [
  {
    // A flat config matches only JavaScript files unless it names others.
    files: ["**/*.ts"],
    languageOptions: { parser: tsParser, parserOptions: { programs: [program] } },
    plugins: { functype: functype as unknown as NonNullable<LinterType.Config["plugins"]>[string] },
    rules: recommended.rules,
  },
]

/**
 * An error when the rule says so, and always for ESLint's own messages: a fatal parse failure, or
 * "No matching configuration found", which ESLint reports as a warning. Either means no rule ran,
 * so a warning would pass a snippet that was never linted.
 */
const severityOf = (message: LinterType.LintMessage): "error" | "warning" =>
  message.severity === 2 || message.fatal === true || message.ruleId === null ? "error" : "warning"

const toDiagnostic = (message: LinterType.LintMessage): LintDiagnostic => ({
  // A message about the whole file, such as a parse failure, has no position.
  line: message.line ?? 0,
  column: message.column ?? 0,
  message: message.message,
  rule: message.ruleId ?? (message.fatal === true ? "parse" : "eslint"),
  severity: severityOf(message),
})

/** The preset's findings on `code`, which must be the text of `fileName` in `program`. */
export const lintCode = (code: string, fileName: string, program: ts.Program): ReadonlyArray<LintDiagnostic> => {
  try {
    // `cwd: "/"`, so the virtual file's absolute path is inside the directory ESLint matches against.
    return new Linter({ configType: "flat", cwd: "/" })
      .verify(code, config(program), { filename: fileName })
      .map(toDiagnostic)
  } catch (e) {
    // A rule that throws: report it, rather than crash the tool or pass the snippet unlinted.
    const reason = e instanceof Error ? e.message : String(e)
    return [{ line: 0, column: 0, message: `Lint failed: ${reason}`, rule: "eslint", severity: "error" }]
  }
}
