export type ValidationDiagnostic = {
  line: number
  column: number
  message: string
  code: number
  severity: "error" | "warning"
}

/** A finding from eslint-plugin-functype's `recommended` preset. */
export type LintDiagnostic = {
  line: number
  column: number
  message: string
  /** The rule, such as `functype/no-floating-result`. */
  rule: string
  severity: "error" | "warning"
}

export type ValidationResult = {
  /** True when the snippet has no type errors and, when linted, no lint errors: a build would pass. */
  success: boolean
  /** Type errors from the TypeScript compiler. */
  diagnostics: ValidationDiagnostic[]
  /** Lint findings, or `undefined` when linting was turned off or the snippet has type errors. */
  lint?: LintDiagnostic[]
  importsPrepended: boolean
}

export type ValidateOptions = {
  autoImport?: boolean
  /** Also run eslint-plugin-functype's `recommended` preset. Default: true. */
  lint?: boolean
}
