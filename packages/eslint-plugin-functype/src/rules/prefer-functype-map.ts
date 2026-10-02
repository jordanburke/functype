import type { Rule } from "eslint"

import type { ASTNode } from "../types/ast"
import { bindingOf, functypeLocalName } from "../utils/collection-binding"
import { getFunctypeImportsLegacy, isAlreadyUsingFunctype } from "../utils/functype-detection"
import { createImportFixer } from "../utils/import-fixer"
import { annotatesMutatedBinding, isMutatedCollection, MAP_MUTATORS } from "../utils/mutable-collection"
import { flowsIntoReadonlyContract } from "../utils/readonly-contract"

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
          allowMutable: {
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
      suggestMapEmpty: "Replace with {{name}}.empty()",
      suggestMapOf: "Replace with {{name}}.of(...)",
      suggestMapFrom: "Replace with {{name}}(...)",
      suggestUseLocalName: "Replace with {{name}}",
      suggestAddImport: "Add {{symbol}} import from functype",
    },
  },

  create(context) {
    const options = context.options[0] || {}
    const allowInTests = options.allowInTests !== false
    // A native Map the code mutates on purpose (cache, registry, accumulator) is a deliberate choice —
    // functype's Map is immutable and cannot express it (#324).
    const allowMutable = options.allowMutable !== false

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

    return {
      NewExpression(node: ASTNode) {
        if (allowInTests && isInTestFile()) return

        // Only flag `new Map(...)` calls
        if (!node.callee || node.callee.type !== "Identifier" || node.callee.name !== "Map") return

        if (allowMutable && isMutatedCollection(node, MAP_MUTATORS, context.sourceCode)) return

        // `Map` may be functype's import (under any name), a local shadow, or the native built-in (#350).
        if (bindingOf(node.callee, "Map", context.sourceCode) !== "native") return

        // A native Map flowing into a declared `ReadonlyMap` contract is what that contract requires (#350).
        if (flowsIntoReadonlyContract(node, "ReadonlyMap")) return

        // Skip if already using functype
        if (isAlreadyUsingFunctype(node, functypeImports)) return

        const sourceCode = context.sourceCode
        const imported = functypeLocalName(sourceCode, "Map")
        const name = imported ?? "Map"
        const args = node.arguments as ASTNode[]

        const suggestions: Rule.SuggestionReportDescriptor[] = []

        if (args.length === 0) {
          // new Map() → Map.empty()
          suggestions.push({
            messageId: "suggestMapEmpty",
            data: { name },
            fix(fixer) {
              return fixer.replaceText(node, `${name}.empty()`)
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
            data: { name },
            fix(fixer) {
              return fixer.replaceText(node, `${name}.of(${mapOfArgs})`)
            },
          })
        } else if (args.length === 1) {
          // new Map(someVar) → Map(someVar)
          const argText = sourceCode.getText(args[0])
          suggestions.push({
            messageId: "suggestMapFrom",
            data: { name },
            fix(fixer) {
              return fixer.replaceText(node, `${name}(${argText})`)
            },
          })
        } else {
          // Generic fallback for any other args
          suggestions.push({
            messageId: "suggestMapEmpty",
            data: { name },
            fix(fixer) {
              return fixer.replaceText(node, `${name}.empty()`)
            },
          })
        }

        if (imported === null) {
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

        if (allowMutable && annotatesMutatedBinding(node, MAP_MUTATORS, context.sourceCode)) return

        if (node.typeName.type === "Identifier" && bindingOf(node.typeName, "Map", context.sourceCode) !== "native")
          return

        // Extract key/value type params if present (typeArguments for newer TS-ESLint, typeParameters for older)
        const typeParams = node.typeArguments?.params ?? node.typeParameters?.params
        const keyType = typeParams?.[0] ? sourceCode.getText(typeParams[0]) : "K"
        const valueType = typeParams && typeParams.length >= 2 ? sourceCode.getText(typeParams[1]) : "V"

        // Already imported under another name (`Map as FMap`): point at that name instead of adding a
        // second import that would shadow the native `Map` the rest of the file uses.
        const imported = functypeLocalName(sourceCode, "Map")
        const suggestions: Rule.SuggestionReportDescriptor[] =
          imported === null
            ? [{ messageId: "suggestAddImport", data: { symbol: "Map" }, fix: createImportFixer(sourceCode, "Map") }]
            : [
                {
                  messageId: "suggestUseLocalName",
                  data: { name: imported },
                  fix: (fixer) => fixer.replaceText(node.typeName, imported),
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
