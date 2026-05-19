import type { Rule } from "eslint"

import type { ASTNode } from "../types/ast"
import { getFunctypeImportsLegacy, isAlreadyUsingFunctype, isFunctypeType } from "../utils/functype-detection"
import { createImportFixer, hasFunctypeSymbol } from "../utils/import-fixer"

const rule: Rule.RuleModule = {
  meta: {
    type: "suggestion",
    hasSuggestions: true,
    docs: {
      description: "Prefer Option<T> over nullable types (T | null | undefined)",
      recommended: true,
    },
    schema: [
      {
        type: "object",
        properties: {
          allowNullableIntersections: {
            type: "boolean",
            default: false,
          },
        },
        additionalProperties: false,
      },
    ],
    messages: {
      preferOption: "Prefer Option<{{type}}> over nullable type '{{nullable}}'",
      preferOptionReturn: "Prefer Option<{{type}}> as return type over nullable '{{nullable}}'",
      suggestOptionType: "Replace with Option<{{type}}>",
      suggestAddImport: "Add {{symbol}} import from functype",
    },
  },

  create(context) {
    // const options = context.options[0] || {}
    // Remove unused variable
    // const _allowNullableIntersections = options.allowNullableIntersections || false

    // Get functype imports if available (but still apply rule even without explicit import)
    const functypeImports = getFunctypeImportsLegacy(context)

    return {
      TSUnionType(node: ASTNode) {
        if (!node.types || node.types.length < 2) return

        const hasNull = node.types.some(
          (type: ASTNode) => type.type === "TSNullKeyword" || type.type === "TSUndefinedKeyword",
        )

        if (!hasNull) return

        const nonNullTypes = node.types.filter(
          (type: ASTNode) => type.type !== "TSNullKeyword" && type.type !== "TSUndefinedKeyword",
        )

        if (nonNullTypes.length === 1) {
          const nonNullType = nonNullTypes[0]

          // Skip if it's already an Option type or other functype type
          if (isFunctypeType(nonNullType, functypeImports)) return

          // Skip if we're already in a functype context
          if (isAlreadyUsingFunctype(node, functypeImports)) return

          const sourceCode = context.sourceCode
          const nonNullTypeText = sourceCode.getText(nonNullType)
          const fullType = sourceCode.getText(node)

          // Skip if it's already an Option type (fallback check)
          if (nonNullTypeText.startsWith("Option<")) return

          const suggestions: Rule.SuggestionReportDescriptor[] = [
            {
              messageId: "suggestOptionType",
              data: { type: nonNullTypeText },
              fix(fixer) {
                return fixer.replaceText(node, `Option<${nonNullTypeText}>`)
              },
            },
          ]

          if (!hasFunctypeSymbol(sourceCode, "Option")) {
            suggestions.push({
              messageId: "suggestAddImport",
              data: { symbol: "Option" },
              fix: createImportFixer(sourceCode, "Option"),
            })
          }

          context.report({
            node,
            messageId: "preferOption",
            data: {
              type: nonNullTypeText,
              nullable: fullType,
            },
            suggest: suggestions,
          })
        }
      },
    }
  },
}

export default rule
