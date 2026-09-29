import type { Rule } from "eslint"

import type { ASTNode } from "../types/ast"
import { INTEROP_TAG, isInsideTaggedDeclaration } from "../utils/boundary-tags"
import { getFunctypeImportsLegacy, isAlreadyUsingFunctype, isFunctypeType } from "../utils/functype-detection"
import { createImportFixer, hasFunctypeSymbol } from "../utils/import-fixer"
import { DEFAULT_WIRE_TYPES, isInsideWireType, WIRE_TYPES_SCHEMA } from "../utils/wire-types"

const REACT_STATE_HOOKS: ReadonlySet<string> = new Set(["useState", "useRef"])

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
          allowInteropMarker: {
            type: "boolean",
            default: true,
          },
          wireTypes: WIRE_TYPES_SCHEMA,
          allowNullableIntersections: {
            type: "boolean",
            default: false,
          },
          allowUseState: {
            type: "boolean",
            default: true,
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
    const options = context.options[0] || {}
    // Everything inside `Wire<…>` is the declared serialization shape (#325 B).
    const wireTypes: ReadonlyArray<string> = options.wireTypes ?? DEFAULT_WIRE_TYPES
    // `@interop <reason>` on an enclosing declaration marks a host-contract boundary (#241).
    const allowInteropMarker = options.allowInteropMarker !== false
    const isExemptByMarker = (node: ASTNode): boolean =>
      allowInteropMarker && isInsideTaggedDeclaration(node, INTEROP_TAG, context.sourceCode)
    // `null` is idiomatic React state (`useState<User | null>(null)`, `useRef<El | null>(null)`); an
    // Option in a hook's type argument buys nothing and fights the hook's own API (#325).
    const allowUseState = options.allowUseState !== false

    /** Is `node` inside the type argument of a `useState` / `useRef` call (bare or `React.`-qualified)? */
    function isInHookTypeArgument(node: ASTNode): boolean {
      const parent = node.parent
      if (!parent) return false
      if (parent.type === "TSTypeParameterInstantiation" && parent.parent?.type === "CallExpression") {
        const callee = parent.parent.callee
        const name =
          callee.type === "Identifier"
            ? callee.name
            : callee.type === "MemberExpression" && callee.property.type === "Identifier"
              ? callee.property.name
              : null
        if (name !== null && REACT_STATE_HOOKS.has(name)) return true
      }
      return isInHookTypeArgument(parent)
    }

    // Get functype imports if available (but still apply rule even without explicit import)
    const functypeImports = getFunctypeImportsLegacy(context)

    return {
      TSUnionType(node: ASTNode) {
        if (isInsideWireType(node, wireTypes)) return
        if (isExemptByMarker(node)) return
        if (!node.types || node.types.length < 2) return
        if (allowUseState && isInHookTypeArgument(node)) return

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
