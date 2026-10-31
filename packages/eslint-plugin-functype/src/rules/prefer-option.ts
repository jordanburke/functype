import type { Rule } from "eslint"

import type { ASTNode } from "../types/ast"
import { INTEROP_TAG, isInsideTaggedDeclaration } from "../utils/boundary-tags"
import { getFunctypeImportsLegacy, isAlreadyUsingFunctype, isFunctypeType } from "../utils/functype-detection"
import { createImportFixer, hasFunctypeSymbol } from "../utils/import-fixer"
import { DEFAULT_WIRE_TYPES, isInsideWireType, WIRE_TYPES_SCHEMA } from "../utils/wire-types"

const REACT_STATE_HOOKS: ReadonlySet<string> = new Set(["useState", "useRef"])

const isNullish = (type: ASTNode): boolean => type.type === "TSNullKeyword" || type.type === "TSUndefinedKeyword"

/** Is `node` a parameter: of a function, a method signature or a function type, with or without a default? */
function isParameter(node: ASTNode): boolean {
  const parent = node.parent as ASTNode | undefined
  if (!parent) return false
  if (parent.type === "AssignmentPattern" && parent.left === node) return isParameter(parent)
  if (parent.type === "TSParameterProperty") return true
  const params = (parent as { readonly params?: ReadonlyArray<ASTNode> }).params
  return Array.isArray(params) && params.includes(node)
}

/**
 * The member or parameter a type annotation belongs to, when it's the annotation of a type-literal or
 * interface member (`b: string | undefined`) or a parameter (`(x: string | undefined) => …`). Those are
 * the caller's shapes: a prop, an options-bag field, an argument (#446).
 */
function memberOrParameterOf(annotation: ASTNode | undefined): ASTNode | undefined {
  const owner = annotation?.type === "TSTypeAnnotation" ? (annotation.parent as ASTNode | undefined) : undefined
  if (!owner) return undefined
  if (owner.type === "TSPropertySignature") return owner
  return isParameter(owner) ? owner : undefined
}

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
          checkOptionalMembers: {
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
      preferOptionOverOptional: "Prefer '{{name}}: Option<{{type}}>' over the optional '{{name}}?'",
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
    // `a?: T` and `a: T | undefined` on a member or parameter both mean "may be absent", and the caller
    // writes `<X b="v" />` or `f()`. Skip both unless asked to report them (#446).
    const checkOptionalMembers = options.checkOptionalMembers === true

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

    /** With checkOptionalMembers, `a?: T` on a member or parameter is reported like `a: T | undefined`. */
    function checkOptional(node: ASTNode): void {
      if (!checkOptionalMembers || node.optional !== true) return
      if (node.type !== "TSPropertySignature" && !isParameter(node)) return
      if (isInsideWireType(node, wireTypes) || isExemptByMarker(node)) return
      const annotation = (node.typeAnnotation as ASTNode | undefined)?.typeAnnotation as ASTNode | undefined
      if (!annotation || isFunctypeType(annotation, functypeImports)) return
      // `a?: T | null` is reported once, by the union check, which keeps its suggestions.
      if (annotation.type === "TSUnionType" && annotation.types.some((t: ASTNode) => t.type === "TSNullKeyword")) return
      const kept =
        annotation.type === "TSUnionType" ? annotation.types.filter((t: ASTNode) => !isNullish(t)) : [annotation]
      if (kept.length !== 1 || isFunctypeType(kept[0], functypeImports)) return
      const key = (node.type === "TSPropertySignature" ? node.key : node) as ASTNode
      const name =
        key.type === "Identifier"
          ? key.name
          : key.type === "Literal"
            ? String(key.value)
            : context.sourceCode.getText(key)
      context.report({
        node: key,
        messageId: "preferOptionOverOptional",
        data: { name, type: context.sourceCode.getText(kept[0]) },
      })
    }

    return {
      TSPropertySignature: checkOptional,
      Identifier: checkOptional,

      TSUnionType(node: ASTNode) {
        if (isInsideWireType(node, wireTypes)) return
        if (isExemptByMarker(node)) return
        if (!node.types || node.types.length < 2) return
        if (allowUseState && isInHookTypeArgument(node)) return

        const hasNull = node.types.some((type: ASTNode) => isNullish(type))

        if (!hasNull) return

        // On a member or parameter, `T | undefined` is the same "may be absent" as `?:`: skipped unless
        // checkOptionalMembers is on, and never reported on an optional one (`c?: T | undefined` is the
        // spelling exactOptionalPropertyTypes needs; the optional-member check reports it, once).
        const owner = memberOrParameterOf(node.parent)
        const undefinedOnly = !node.types.some((type: ASTNode) => type.type === "TSNullKeyword")
        if (owner && undefinedOnly && (!checkOptionalMembers || owner.optional === true)) return

        const nonNullTypes = node.types.filter((type: ASTNode) => !isNullish(type))

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
