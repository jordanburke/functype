/**
 * Core validation function — type-checks functype code snippets using the TypeScript Compiler API.
 */

import ts from "typescript"

import { compilerOptions, createCompilerHost, VIRTUAL_FILENAME } from "./compiler-host"
import type { ValidateOptions, ValidationDiagnostic, ValidationResult } from "./types"

const DEFAULT_IMPORTS = `import { Option, Some, None, Either, Right, Left, Try, List, Set, Map, Lazy, LazyList, Task, IO, Cond, Match, Brand, ValidatedBrand, Tuple, Stack, Ok, Err } from "functype"\n`

const hasFunctypeImport = (code: string): boolean => /from\s+["']functype(?:\/[^"']*)?["']/.test(code)

export const validateCode = (code: string, options: ValidateOptions = {}): ValidationResult => {
  const autoImport = options.autoImport ?? true
  const shouldPrepend = autoImport && !hasFunctypeImport(code)
  const importLineCount = shouldPrepend ? 1 : 0
  const fullCode = shouldPrepend ? DEFAULT_IMPORTS + code : code

  const host = createCompilerHost(fullCode)
  const program = ts.createProgram([VIRTUAL_FILENAME], compilerOptions, host)
  const allDiagnostics = ts.getPreEmitDiagnostics(program)

  const fileDiagnostics = allDiagnostics.filter((d) => d.file?.fileName === VIRTUAL_FILENAME)

  const rawDiagnostics = fileDiagnostics.map((d) => {
    const { line, character } = d.file!.getLineAndCharacterOfPosition(d.start ?? 0)
    return {
      originalLine: line,
      line: line - importLineCount + 1,
      column: character + 1,
      message: ts.flattenDiagnosticMessageText(d.messageText, "\n"),
      code: d.code,
      severity: (d.category === ts.DiagnosticCategory.Error ? "error" : "warning") as "error" | "warning",
    }
  })

  // Filter out diagnostics from the prepended import line(s) and map to final type
  const userDiagnostics: ValidationDiagnostic[] = rawDiagnostics
    .filter((d) => !shouldPrepend || d.originalLine >= importLineCount)
    .map(({ originalLine: _, ...rest }) => rest)

  return {
    success: userDiagnostics.filter((d) => d.severity === "error").length === 0,
    diagnostics: userDiagnostics,
    importsPrepended: shouldPrepend,
  }
}
