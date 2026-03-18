import type { Rule } from "eslint"
import type { SourceCode } from "eslint"

/**
 * Check if a given symbol is already imported from functype
 */
export function hasFunctypeSymbol(sourceCode: SourceCode, symbolName: string): boolean {
  const program = sourceCode.ast

  for (const node of program.body) {
    if (node.type === "ImportDeclaration" && node.source.type === "Literal" && node.source.value === "functype") {
      if (node.specifiers) {
        for (const spec of node.specifiers) {
          if (spec.type === "ImportNamespaceSpecifier") {
            return true
          }
          if (spec.type === "ImportSpecifier" && spec.imported.type === "Identifier" && spec.imported.name === symbolName) {
            return true
          }
        }
      }
    }
  }

  return false
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
    const program = sourceCode.ast

    let existingFunctypeImport: (typeof program.body)[number] | null = null
    let lastImportNode: (typeof program.body)[number] | null = null

    for (const node of program.body) {
      if (node.type === "ImportDeclaration") {
        lastImportNode = node
        if (node.source.type === "Literal" && node.source.value === "functype") {
          existingFunctypeImport = node
        }
      }
    }

    // If already imported, nothing to do
    if (hasFunctypeSymbol(sourceCode, symbolName)) {
      return null
    }

    if (existingFunctypeImport && existingFunctypeImport.type === "ImportDeclaration") {
      const importDecl = existingFunctypeImport

      // Check for namespace import — can't add named imports alongside it
      const hasNamespace = importDecl.specifiers?.some((s) => s.type === "ImportNamespaceSpecifier") ?? false
      if (hasNamespace) {
        return null
      }

      // Find the last named specifier and append after it
      const specifiers = importDecl.specifiers ?? []
      const namedSpecifiers = specifiers.filter((s) => s.type === "ImportSpecifier")

      if (namedSpecifiers.length > 0) {
        const lastSpecifier = namedSpecifiers[namedSpecifiers.length - 1]
        if (lastSpecifier) {
          return fixer.insertTextAfter(lastSpecifier, `, ${symbolName}`)
        }
      }

      // No named specifiers yet — insert before closing brace
      const importText = sourceCode.getText(importDecl)
      const newText = importText.replace(/\{(\s*)\}/, `{ ${symbolName} }`)
      return fixer.replaceText(importDecl, newText)
    }

    // No existing functype import — add a new one
    const newImport = `import { ${symbolName} } from "functype"`

    if (lastImportNode) {
      return fixer.insertTextAfter(lastImportNode, `\n${newImport}`)
    }

    // No imports at all — insert at top of file
    const firstNode = program.body[0]
    if (firstNode) {
      return fixer.insertTextBefore(firstNode, `${newImport}\n`)
    }

    return fixer.insertTextBeforeRange([0, 0], `${newImport}\n`)
  }
}
