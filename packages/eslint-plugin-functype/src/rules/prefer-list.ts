import type { Rule } from "eslint"

import type { ASTNode } from "../types/ast"
import { getFunctypeImportsLegacy, isFunctypeCall } from "../utils/functype-detection"
import { createImportFixer, hasFunctypeSymbol } from "../utils/import-fixer"

/** AST keys that don't represent syntax children — back-edges and source metadata. */
const NON_CHILD_KEYS: ReadonlySet<string> = new Set(["parent", "loc", "range"])

/** AST children of `node`: drops back-edges, flattens array-valued keys, filters non-object leaves. */
function astChildren(node: ASTNode): readonly unknown[] {
  return Object.entries(node)
    .filter(([k]) => !NON_CHILD_KEYS.has(k))
    .flatMap(([, v]) => (Array.isArray(v) ? v : [v]))
    .filter((v) => v !== null && typeof v === "object")
}

/** True iff any ancestor of `node` satisfies `pred`. Pure tail recursion. */
function ancestorSatisfies(node: ASTNode | null | undefined, pred: (n: ASTNode) => boolean): boolean {
  const parent = node?.parent as ASTNode | undefined
  if (!parent) return false
  return pred(parent) || ancestorSatisfies(parent, pred)
}

/** `parent` is `List.from(arr)` or `List.of(...arr)`. */
function isListFactoryArg(parent: ASTNode | null | undefined): boolean {
  return (
    parent?.type === "CallExpression" &&
    parent.callee.type === "MemberExpression" &&
    parent.callee.object.type === "Identifier" &&
    parent.callee.object.name === "List" &&
    ["from", "of"].includes(parent.callee.property.name)
  )
}

/** `node` is a VariableDeclarator with its own type annotation, or a TSTypeAnnotation node directly. */
function hasOwnTypeAnnotation(node: ASTNode): boolean {
  return (node.type === "VariableDeclarator" && Boolean(node.id?.typeAnnotation)) || node.type === "TSTypeAnnotation"
}

const rule: Rule.RuleModule = {
  meta: {
    type: "suggestion",
    hasSuggestions: true,
    docs: {
      description: "Prefer List<T> over native arrays for immutable collections",
      recommended: true,
    },
    schema: [
      {
        type: "object",
        properties: {
          allowArraysInTests: {
            type: "boolean",
            default: true,
          },
          allowReadonlyArrays: {
            type: "boolean",
            default: true,
          },
        },
        additionalProperties: false,
      },
    ],
    messages: {
      preferList: "Prefer List<{{type}}> over array type {{arrayType}}",
      preferListLiteral: "Prefer List.of(...) or List.from([...]) over array literal",
      suggestListType: "Replace with List<{{type}}>",
      suggestListOf: "Replace with List.of(...)",
      suggestAddImport: "Add {{symbol}} import from functype",
    },
  },

  create(context) {
    const options = context.options[0] || {}
    const allowArraysInTests = options.allowArraysInTests !== false
    const allowReadonlyArrays = options.allowReadonlyArrays !== false

    // Get functype imports if available (but still apply rule even without explicit import)
    const functypeImports = getFunctypeImportsLegacy(context)

    function isInTestFile() {
      const filename = context.filename
      return (
        /\.(test|spec)\.(ts|js|tsx|jsx)$/.test(filename) ||
        filename.includes("__tests__") ||
        filename.includes("/test/") ||
        filename.includes("/tests/")
      )
    }

    function findTypeParameter(node: ASTNode, sourceCode: typeof context.sourceCode): string | null {
      // Pure pre-order search: look at this node, then recursively at each
      // child until we find a TSTypeParameterInstantiation with a first param.
      function findInNode(n: ASTNode): string | null {
        if (n.type === "TSTypeParameterInstantiation" && n.params && n.params[0]) {
          return sourceCode.getText(n.params[0])
        }
        const results = astChildren(n)
          .filter((c): c is ASTNode => typeof (c as ASTNode)?.type === "string")
          .map((child) => findInNode(child))
        return results.find((r) => r !== null) ?? null
      }
      return findInNode(node)
    }

    return {
      TSArrayType(node: ASTNode) {
        if (allowArraysInTests && isInTestFile()) return

        const sourceCode = context.sourceCode
        const elementType = sourceCode.getText(node.elementType)
        const fullType = sourceCode.getText(node)

        const suggest: Rule.SuggestionReportDescriptor[] = [
          {
            messageId: "suggestListType",
            data: { type: elementType },
            fix(fixer: Rule.RuleFixer) {
              return fixer.replaceText(node, `List<${elementType}>`)
            },
          },
        ]

        if (!hasFunctypeSymbol(sourceCode, "List")) {
          suggest.push({
            messageId: "suggestAddImport",
            data: { symbol: "List" },
            fix: createImportFixer(sourceCode, "List"),
          })
        }

        context.report({
          node,
          messageId: "preferList",
          data: {
            type: elementType,
            arrayType: fullType,
          },
          suggest,
        })
      },

      TSTypeReference(node: ASTNode) {
        if (allowArraysInTests && isInTestFile()) return

        const sourceCode = context.sourceCode

        // Get type name - handle both simple identifiers and member expressions
        if (!node.typeName) return // No type name found

        const typeName = node.typeName.type === "Identifier" ? node.typeName.name : sourceCode.getText(node.typeName)

        // Handle Array<T> syntax
        if (typeName === "Array") {
          // Look for type parameters in child nodes
          const typeParam = findTypeParameter(node, sourceCode)
          const fullType = sourceCode.getText(node)

          // Skip if already readonly
          if (allowReadonlyArrays && fullType.startsWith("readonly")) return

          const resolvedType = typeParam || "T"

          const suggest: Rule.SuggestionReportDescriptor[] = [
            {
              messageId: "suggestListType",
              data: { type: resolvedType },
              fix(fixer: Rule.RuleFixer) {
                return fixer.replaceText(node, `List<${resolvedType}>`)
              },
            },
          ]

          if (!hasFunctypeSymbol(sourceCode, "List")) {
            suggest.push({
              messageId: "suggestAddImport",
              data: { symbol: "List" },
              fix: createImportFixer(sourceCode, "List"),
            })
          }

          context.report({
            node,
            messageId: "preferList",
            data: {
              type: resolvedType,
              arrayType: fullType,
            },
            suggest,
          })
        }

        // Handle ReadonlyArray<T> - suggest List even if allowing readonly arrays
        if (typeName === "ReadonlyArray") {
          const typeParam = findTypeParameter(node, sourceCode)
          const fullType = sourceCode.getText(node)
          const resolvedType = typeParam || "T"

          const suggest: Rule.SuggestionReportDescriptor[] = [
            {
              messageId: "suggestListType",
              data: { type: resolvedType },
              fix(fixer: Rule.RuleFixer) {
                return fixer.replaceText(node, `List<${resolvedType}>`)
              },
            },
          ]

          if (!hasFunctypeSymbol(sourceCode, "List")) {
            suggest.push({
              messageId: "suggestAddImport",
              data: { symbol: "List" },
              fix: createImportFixer(sourceCode, "List"),
            })
          }

          context.report({
            node,
            messageId: "preferList",
            data: {
              type: resolvedType,
              arrayType: fullType,
            },
            suggest,
          })
        }
      },

      ArrayExpression(node: ASTNode) {
        if (allowArraysInTests && isInTestFile()) return

        // Only flag non-empty arrays to avoid noise
        if (node.elements.length === 0) return

        const parent = node.parent

        // Don't flag arrays that are already arguments to functype calls.
        if (parent && isFunctypeCall(parent, functypeImports)) return

        // Don't flag arrays that are arguments to List.from / List.of.
        if (isListFactoryArg(parent)) return

        // Don't flag nested array literals — let the outermost one handle it.
        if (ancestorSatisfies(node, (n) => n.type === "ArrayExpression")) return

        // Don't flag array literals that already live in a type-annotated
        // context (those are handled by the type-checking rules).
        if (ancestorSatisfies(node, hasOwnTypeAnnotation)) return

        // Check if any element is a SpreadElement — ambiguous semantics, skip suggestions
        const hasSpread = node.elements.some((el) => el !== null && el.type === "SpreadElement")

        if (hasSpread) {
          context.report({
            node,
            messageId: "preferListLiteral",
          })
          return
        }

        const sourceCode = context.sourceCode
        const elementTexts = node.elements.filter((el) => el !== null).map((el) => sourceCode.getText(el))

        const suggest: Rule.SuggestionReportDescriptor[] = [
          {
            messageId: "suggestListOf",
            fix(fixer: Rule.RuleFixer) {
              return fixer.replaceText(node, `List.of(${elementTexts.join(", ")})`)
            },
          },
        ]

        if (!hasFunctypeSymbol(sourceCode, "List")) {
          suggest.push({
            messageId: "suggestAddImport",
            data: { symbol: "List" },
            fix: createImportFixer(sourceCode, "List"),
          })
        }

        context.report({
          node,
          messageId: "preferListLiteral",
          suggest,
        })
      },
    }
  },
}

export default rule
