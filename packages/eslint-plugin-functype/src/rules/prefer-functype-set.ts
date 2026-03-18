import type { Rule } from "eslint"

import type { ASTNode } from "../types/ast"
import { getFunctypeImportsLegacy, isAlreadyUsingFunctype } from "../utils/functype-detection"
import { createImportFixer, hasFunctypeSymbol } from "../utils/import-fixer"

const rule: Rule.RuleModule = {
  meta: {
    type: "suggestion",
    hasSuggestions: true,
    docs: {
      description: "Prefer functype Set<T> over native Set for immutable collections",
      recommended: true,
    },
    schema: [
      {
        type: "object",
        properties: {
          allowInTests: {
            type: "boolean",
            default: true,
          },
        },
        additionalProperties: false,
      },
    ],
    messages: {
      preferFunctypeSet: "Prefer functype Set<{{type}}> over native Set",
      preferFunctypeSetLiteral: "Prefer Set.of(...) or Set.empty() over new Set()",
      suggestSetEmpty: "Replace with Set.empty()",
      suggestSetOf: "Replace with Set.of(...)",
      suggestSetFrom: "Replace with Set(...)",
      suggestAddImport: "Add {{symbol}} import from functype",
    },
  },

  create(context) {
    const options = context.options[0] || {}
    const allowInTests = options.allowInTests !== false

    function isInTestFile() {
      const filename = context.filename
      return (
        /\.(test|spec)\.(ts|js|tsx|jsx)$/.test(filename) ||
        filename.includes("__tests__") ||
        filename.includes("/test/") ||
        filename.includes("/tests/")
      )
    }

    const functypeImports = getFunctypeImportsLegacy(context)

    function isSetImportedFromFunctype() {
      return hasFunctypeSymbol(context.sourceCode, "Set")
    }

    return {
      NewExpression(node: ASTNode) {
        if (allowInTests && isInTestFile()) return

        // Only handle `new Set(...)` calls
        if (!node.callee || node.callee.type !== "Identifier" || node.callee.name !== "Set") return

        // Skip if Set is already imported from functype
        if (isSetImportedFromFunctype()) return

        // Skip if already in a functype context
        if (isAlreadyUsingFunctype(node, functypeImports)) return

        const sourceCode = context.sourceCode
        const args = node.arguments || []
        const suggestions: Rule.SuggestionReportDescriptor[] = []

        if (args.length === 0) {
          // new Set() → Set.empty()
          suggestions.push({
            messageId: "suggestSetEmpty",
            fix(fixer) {
              return fixer.replaceText(node, "Set.empty()")
            },
          })
        } else if (args.length === 1 && args[0].type === "ArrayExpression") {
          // new Set(["a", "b", "c"]) → Set.of("a", "b", "c")
          const arrayNode = args[0]
          const elements = arrayNode.elements || []
          const elementTexts = elements.map((el: ASTNode) => sourceCode.getText(el))
          const argsText = elementTexts.join(", ")
          suggestions.push({
            messageId: "suggestSetOf",
            fix(fixer) {
              return fixer.replaceText(node, `Set.of(${argsText})`)
            },
          })
        } else if (args.length === 1) {
          // new Set(someVar) → Set(someVar)
          const argText = sourceCode.getText(args[0])
          suggestions.push({
            messageId: "suggestSetFrom",
            fix(fixer) {
              return fixer.replaceText(node, `Set(${argText})`)
            },
          })
        } else {
          // Fallback for unexpected cases
          suggestions.push({
            messageId: "suggestSetEmpty",
            fix(fixer) {
              return fixer.replaceText(node, "Set.empty()")
            },
          })
        }

        if (!isSetImportedFromFunctype()) {
          suggestions.push({
            messageId: "suggestAddImport",
            data: { symbol: "Set" },
            fix: createImportFixer(sourceCode, "Set"),
          })
        }

        context.report({
          node,
          messageId: "preferFunctypeSetLiteral",
          suggest: suggestions,
        })
      },

      TSTypeReference(node: ASTNode) {
        if (allowInTests && isInTestFile()) return

        if (!node.typeName) return

        const sourceCode = context.sourceCode
        const typeName =
          node.typeName.type === "Identifier" ? node.typeName.name : sourceCode.getText(node.typeName)

        if (typeName !== "Set") return

        // Skip if Set is already imported from functype
        if (isSetImportedFromFunctype()) return

        // Extract type parameter if present
        let typeParam = "T"
        if (node.typeParameters?.params?.[0]) {
          typeParam = sourceCode.getText(node.typeParameters.params[0])
        } else if (node.typeArguments?.params?.[0]) {
          typeParam = sourceCode.getText(node.typeArguments.params[0])
        }

        const suggestions: Rule.SuggestionReportDescriptor[] = [
          {
            messageId: "suggestAddImport",
            data: { symbol: "Set" },
            fix: createImportFixer(sourceCode, "Set"),
          },
        ]

        context.report({
          node,
          messageId: "preferFunctypeSet",
          data: { type: typeParam },
          suggest: suggestions,
        })
      },
    }
  },
}

export default rule
