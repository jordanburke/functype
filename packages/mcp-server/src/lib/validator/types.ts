export type ValidationDiagnostic = {
  line: number
  column: number
  message: string
  code: number
  severity: "error" | "warning"
}

export type ValidationResult = {
  success: boolean
  diagnostics: ValidationDiagnostic[]
  importsPrepended: boolean
}

export type ValidateOptions = {
  autoImport?: boolean
}
