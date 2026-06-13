import type { Rule } from "eslint"
import type { SourceCode } from "eslint"

type ImportSpec = {
  type: string
  imported?: { type: string; name: string }
}
type ImportNode = {
  type: "ImportDeclaration"
  source: { type: string; value: string }
  specifiers?: readonly ImportSpec[]
}

const isImportDecl = (node: { type: string }): node is ImportNode => node.type === "ImportDeclaration"

const isFunctypeImportDecl = (node: { type: string }): node is ImportNode =>
  isImportDecl(node) && node.source?.type === "Literal" && node.source.value === "functype"

const specifierMatches = (spec: ImportSpec, symbolName: string): boolean =>
  spec.type === "ImportNamespaceSpecifier" ||
  (spec.type === "ImportSpecifier" && spec.imported?.type === "Identifier" && spec.imported.name === symbolName)

/**
 * Check if a given symbol is already imported from functype
 */
export function hasFunctypeSymbol(sourceCode: SourceCode, symbolName: string): boolean {
  return (sourceCode.ast.body as readonly unknown[])
    .filter((n): n is ImportNode => isFunctypeImportDecl(n as { type: string }))
    .flatMap((node) => node.specifiers ?? [])
    .some((spec) => specifierMatches(spec, symbolName))
}

/**
 * Create a fixer function that adds a symbol to the functype import.
 * Returns a factory compatible with ESLint suggest[].fix signature.
 */
export function createImportFixer(
  sourceCode: SourceCode,
  symbolName: string,
): (fixer: Rule.RuleFixer) => Rule.Fix | null {
  return (fixer: Rule.RuleFixer): Rule.Fix | null => {
    // Already imported — nothing to do.
    if (hasFunctypeSymbol(sourceCode, symbolName)) return null

    const program = sourceCode.ast
    const imports = (program.body as readonly unknown[]).filter((n): n is ImportNode =>
      isImportDecl(n as { type: string }),
    )
    const lastImportNode = imports.at(-1) ?? null
    const existingFunctypeImport = imports.find((n) => isFunctypeImportDecl(n)) ?? null

    if (existingFunctypeImport) {
      // Namespace import (`import * as F from "functype"`) — can't add named.
      const hasNamespace =
        existingFunctypeImport.specifiers?.some((s) => s.type === "ImportNamespaceSpecifier") ?? false
      if (hasNamespace) return null

      // Append after the last named specifier if one exists.
      const namedSpecifiers = (existingFunctypeImport.specifiers ?? []).filter((s) => s.type === "ImportSpecifier")
      const lastSpecifier = namedSpecifiers.at(-1)
      if (lastSpecifier) return fixer.insertTextAfter(lastSpecifier as never, `, ${symbolName}`)

      // No named specifiers — fill the empty braces.
      const importText = sourceCode.getText(existingFunctypeImport as never)
      return fixer.replaceText(existingFunctypeImport as never, importText.replace(/\{(\s*)\}/, `{ ${symbolName} }`))
    }

    // No existing functype import — insert a new one.
    const newImport = `import { ${symbolName} } from "functype"`
    if (lastImportNode) return fixer.insertTextAfter(lastImportNode as never, `\n${newImport}`)

    const firstNode = program.body[0]
    if (firstNode) return fixer.insertTextBefore(firstNode, `${newImport}\n`)
    return fixer.insertTextBeforeRange([0, 0], `${newImport}\n`)
  }
}
