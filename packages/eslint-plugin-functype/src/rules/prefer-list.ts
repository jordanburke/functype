import type { Rule } from "eslint"

import type { ASTNode } from "../types/ast"
import { getFunctypeImportsLegacy, isFunctypeCall } from "../utils/functype-detection"

const rule: Rule.RuleModule = {
  meta: {
    type: "suggestion",
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
      // Look for TSTypeParameterInstantiation child
      function findInNode(n: ASTNode): string | null {
        if (n.type === "TSTypeParameterInstantiation" && n.params && n.params[0]) {
          return sourceCode.getText(n.params[0])
        }

        // Recursively search child nodes
        for (const key in n) {
          if (key === "parent") continue
          const child = n[key]
          if (Array.isArray(child)) {
            for (const item of child) {
              if (item && typeof item === "object" && item.type) {
                const result = findInNode(item)
                if (result) return result
              }
            }
          } else if (child && typeof child === "object" && child.type) {
            const result = findInNode(child)
            if (result) return result
          }
        }

        return null
      }

      return findInNode(node)
    }

    return {
      TSArrayType(node: ASTNode) {
        if (allowArraysInTests && isInTestFile()) return

        const sourceCode = context.sourceCode
        const elementType = sourceCode.getText(node.elementType)
        const fullType = sourceCode.getText(node)

        context.report({
          node,
          messageId: "preferList",
          data: {
            type: elementType,
            arrayType: fullType,
          },
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

          context.report({
            node,
            messageId: "preferList",
            data: {
              type: typeParam || "T",
              arrayType: fullType,
            },
          })
        }

        // Handle ReadonlyArray<T> - suggest List even if allowing readonly arrays
        if (typeName === "ReadonlyArray") {
          const typeParam = findTypeParameter(node, sourceCode)
          const fullType = sourceCode.getText(node)

          context.report({
            node,
            messageId: "preferList",
            data: {
              type: typeParam || "T",
              arrayType: fullType,
            },
          })
        }
      },

      ArrayExpression(node: ASTNode) {
        if (allowArraysInTests && isInTestFile()) return

        // Only flag non-empty arrays to avoid noise
        if (node.elements.length === 0) return

        // Don't flag arrays that are already arguments to List.from() or other functype calls
        let parent = node.parent
        if (parent && isFunctypeCall(parent, functypeImports)) {
          return
        }

        // Additional specific check for List.from/List.of patterns
        if (
          parent &&
          parent.type === "CallExpression" &&
          parent.callee.type === "MemberExpression" &&
          parent.callee.object.type === "Identifier" &&
          parent.callee.object.name === "List" &&
          ["from", "of"].includes(parent.callee.property.name)
        ) {
          return
        }

        // Don't flag nested array literals - only flag the outermost one
        // Check if this array is inside another array literal
        parent = node.parent
        while (parent) {
          if (parent.type === "ArrayExpression") {
            return // Skip nested arrays, let the outer one handle it
          }
          parent = parent.parent
        }

        // Don't flag array literals that are already part of a type annotation context
        // (those should be handled by the type checking rules)
        let hasTypeAnnotation = false
        parent = node.parent
        while (parent) {
          if (parent.type === "VariableDeclarator" && parent.id?.typeAnnotation) {
            // Skip array literal if there's already a type annotation that would be flagged
            hasTypeAnnotation = true
            break
          }
          if (parent.type === "TSTypeAnnotation") {
            hasTypeAnnotation = true
            break
          }
          parent = parent.parent
        }

        if (hasTypeAnnotation) return

        context.report({
          node,
          messageId: "preferListLiteral",
        })
      },
    }
  },
}

export default rule
