import type { Rule } from "eslint"

import type { ASTNode } from "../types/ast"
import { bindingOf, functypeLocalName, isExplicitNativeCollection } from "../utils/collection-binding"
import { getFunctypeImportsLegacy, isAlreadyUsingFunctype } from "../utils/functype-detection"
import { createImportFixer } from "../utils/import-fixer"
import { annotatesMutatedBinding, isMutatedCollection, SET_MUTATORS } from "../utils/mutable-collection"
import { flowsIntoReadonlyContract } from "../utils/readonly-contract"

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
          allowMutable: {
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
      suggestSetEmpty: "Replace with {{name}}.empty()",
      suggestSetOf: "Replace with {{name}}.of(...)",
      suggestSetFrom: "Replace with {{name}}(...)",
      suggestUseLocalName: "Replace with {{name}}",
      suggestAddImport: "Add {{symbol}} import from functype",
    },
  },

  create(context) {
    const options = context.options[0] || {}
    const allowInTests = options.allowInTests !== false
    // A native Set the code mutates on purpose (cache, registry, accumulator) is a deliberate choice —
    // functype's Set is immutable and cannot express it (#324).
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

        // The built-in, however it's spelled: bare `Set` that resolves to the global (functype's import
        // or a local shadow doesn't count, #350), or explicit `globalThis.Set` — the spelling the
        // functype-by-default convention uses, which must not be an escape hatch (#349).
        const isBareNative =
          node.callee?.type === "Identifier" &&
          node.callee.name === "Set" &&
          bindingOf(node.callee, "Set", context.sourceCode) === "native"
        if (!isBareNative && !isExplicitNativeCollection(node.callee, "Set", context.sourceCode)) return

        if (allowMutable && isMutatedCollection(node, SET_MUTATORS, context.sourceCode)) return

        // A native Set flowing into a declared `ReadonlySet` contract is what that contract requires (#350).
        if (flowsIntoReadonlyContract(node, "ReadonlySet")) return

        // Skip if already in a functype context
        if (isAlreadyUsingFunctype(node, functypeImports)) return

        const sourceCode = context.sourceCode
        const imported = functypeLocalName(sourceCode, "Set")
        const name = imported ?? "Set"
        const args = node.arguments || []
        const suggestions: Rule.SuggestionReportDescriptor[] = []

        if (args.length === 0) {
          // new Set() → Set.empty()
          suggestions.push({
            messageId: "suggestSetEmpty",
            data: { name },
            fix(fixer) {
              return fixer.replaceText(node, `${name}.empty()`)
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
            data: { name },
            fix(fixer) {
              return fixer.replaceText(node, `${name}.of(${argsText})`)
            },
          })
        } else if (args.length === 1) {
          // new Set(someVar) → Set(someVar)
          const argText = sourceCode.getText(args[0])
          suggestions.push({
            messageId: "suggestSetFrom",
            data: { name },
            fix(fixer) {
              return fixer.replaceText(node, `${name}(${argText})`)
            },
          })
        } else {
          // Fallback for unexpected cases
          suggestions.push({
            messageId: "suggestSetEmpty",
            data: { name },
            fix(fixer) {
              return fixer.replaceText(node, `${name}.empty()`)
            },
          })
        }

        if (imported === null) {
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
        // `Set<…>` or the explicit `globalThis.Set<…>`.
        const typeName = node.typeName.type === "Identifier" ? node.typeName.name : sourceCode.getText(node.typeName)

        if (typeName !== "Set" && typeName !== "globalThis.Set") return

        if (allowMutable && annotatesMutatedBinding(node, SET_MUTATORS, context.sourceCode)) return

        if (node.typeName.type === "Identifier" && bindingOf(node.typeName, "Set", context.sourceCode) !== "native")
          return

        // Extract type parameter if present (typeArguments for newer TS-ESLint, typeParameters for older)
        const typeParamNode = node.typeParameters?.params?.[0] ?? node.typeArguments?.params?.[0]
        const typeParam = typeParamNode ? sourceCode.getText(typeParamNode) : "T"

        // Already imported under another name (`Set as FSet`): point at that name instead of adding a
        // second import that would shadow the native `Set` the rest of the file uses.
        const imported = functypeLocalName(sourceCode, "Set")
        const suggestions: Rule.SuggestionReportDescriptor[] =
          imported === null
            ? [{ messageId: "suggestAddImport", data: { symbol: "Set" }, fix: createImportFixer(sourceCode, "Set") }]
            : [
                {
                  messageId: "suggestUseLocalName",
                  data: { name: imported },
                  fix: (fixer) => fixer.replaceText(node.typeName, imported),
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
