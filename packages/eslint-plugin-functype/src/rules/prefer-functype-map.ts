import type { Rule } from "eslint"

import type { ASTNode } from "../types/ast"
import { getFunctypeImportsLegacy, isAlreadyUsingFunctype } from "../utils/functype-detection"
import { createImportFixer, hasFunctypeSymbol } from "../utils/import-fixer"

const rule: Rule.RuleModule = {
  meta: {
    type: "suggestion",
    hasSuggestions: true,
    docs: {
      description: "Prefer functype Map<K, V> over native Map for immutable key-value collections",
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
      preferFunctypeMap: "Prefer functype Map<{{keyType}}, {{valueType}}> over native Map",
      preferFunctypeMapLiteral: "Prefer Map.of(...) or Map.empty() over new Map()",
      suggestMapEmpty: "Replace with Map.empty()",
      suggestMapOf: "Replace with Map.of(...)",
      suggestMapFrom: "Replace with Map(...)",
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

    function isMapImportedFromFunctype(): boolean {
      return hasFunctypeSymbol(context.sourceCode, "Map")
    }

    return {
      NewExpression(node: ASTNode) {
        if (allowInTests && isInTestFile()) return

        // Only flag `new Map(...)` calls
        if (!node.callee || node.callee.type !== "Identifier" || node.callee.name !== "Map") return

        // Skip if Map is already imported from functype
        if (isMapImportedFromFunctype()) return

        // Skip if already using functype
        if (isAlreadyUsingFunctype(node, functypeImports)) return

        const sourceCode = context.sourceCode
        const args = node.arguments as ASTNode[]

        const suggestions: Rule.SuggestionReportDescriptor[] = []

        if (args.length === 0) {
          // new Map() → Map.empty()
          suggestions.push({
            messageId: "suggestMapEmpty",
            fix(fixer) {
              return fixer.replaceText(node, "Map.empty()")
            },
          })
        } else if (args.length === 1 && args[0].type === "ArrayExpression") {
          // new Map([["a", 1], ["b", 2]]) → Map.of(["a", 1], ["b", 2])
          const arrayArg = args[0] as ASTNode
          const elements = arrayArg.elements as ASTNode[]
          const tupleTexts = elements.map((el: ASTNode) => sourceCode.getText(el))
          const mapOfArgs = tupleTexts.join(", ")
          suggestions.push({
            messageId: "suggestMapOf",
            fix(fixer) {
              return fixer.replaceText(node, `Map.of(${mapOfArgs})`)
            },
          })
        } else if (args.length === 1) {
          // new Map(someVar) → Map(someVar)
          const argText = sourceCode.getText(args[0])
          suggestions.push({
            messageId: "suggestMapFrom",
            fix(fixer) {
              return fixer.replaceText(node, `Map(${argText})`)
            },
          })
        } else {
          // Generic fallback for any other args
          suggestions.push({
            messageId: "suggestMapEmpty",
            fix(fixer) {
              return fixer.replaceText(node, "Map.empty()")
            },
          })
        }

        if (!isMapImportedFromFunctype()) {
          suggestions.push({
            messageId: "suggestAddImport",
            data: { symbol: "Map" },
            fix: createImportFixer(sourceCode, "Map"),
          })
        }

        context.report({
          node,
          messageId: "preferFunctypeMapLiteral",
          suggest: suggestions,
        })
      },

      TSTypeReference(node: ASTNode) {
        if (allowInTests && isInTestFile()) return

        if (!node.typeName) return

        const sourceCode = context.sourceCode
        const typeName = node.typeName.type === "Identifier" ? node.typeName.name : sourceCode.getText(node.typeName)

        if (typeName !== "Map") return

        // Skip if Map is already imported from functype
        if (isMapImportedFromFunctype()) return

        // Extract key/value type params if present (typeArguments for newer TS-ESLint, typeParameters for older)
        let keyType = "K"
        let valueType = "V"
        const typeParams = node.typeArguments?.params ?? node.typeParameters?.params
        if (typeParams && typeParams.length >= 2) {
          keyType = sourceCode.getText(typeParams[0])
          valueType = sourceCode.getText(typeParams[1])
        } else if (typeParams && typeParams.length === 1) {
          keyType = sourceCode.getText(typeParams[0])
        }

        const suggestions: Rule.SuggestionReportDescriptor[] = [
          {
            messageId: "suggestAddImport",
            data: { symbol: "Map" },
            fix: createImportFixer(sourceCode, "Map"),
          },
        ]

        context.report({
          node,
          messageId: "preferFunctypeMap",
          data: { keyType, valueType },
          suggest: suggestions,
        })
      },
    }
  },
}

export default rule
