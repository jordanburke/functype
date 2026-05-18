import type { Rule } from "eslint"

import type { ASTNode } from "../types/ast"

const rule: Rule.RuleModule = {
  meta: {
    type: "problem",
    docs: {
      description: "Avoid unsafe .get() calls on Option, Either, and other monadic types",
      recommended: true,
    },
    fixable: "code",
    schema: [
      {
        type: "object",
        properties: {
          allowInTests: {
            type: "boolean",
            default: true,
          },
          unsafeMethods: {
            type: "array",
            items: { type: "string" },
            default: ["get", "getOrThrow", "unwrap", "expect"],
          },
        },
        additionalProperties: false,
      },
    ],
    messages: {
      noUnsafeGet: "Avoid unsafe .{{method}}() call. Use .fold(), .map(), or .getOrElse() instead",
      noUnsafeGetSuggestion: "Consider using .getOrElse(defaultValue) or .fold() for safe access",
    },
  },

  create(context) {
    const options = context.options[0] || {}
    const allowInTests = options.allowInTests !== false
    const unsafeMethods = options.unsafeMethods || ["get", "getOrThrow", "unwrap", "expect"]

    function isInTestFile() {
      const filename = context.filename
      return (
        /\.(test|spec)\.(ts|js|tsx|jsx)$/.test(filename) ||
        filename.includes("__tests__") ||
        filename.includes("/test/") ||
        filename.includes("/tests/")
      )
    }

    function isMonadicType(node: ASTNode): boolean {
      // This is a simplified check - in a real implementation, you'd want
      // more sophisticated type checking using TypeScript's type checker
      if (!node) return false

      const sourceCode = context.sourceCode

      // Check for common patterns that indicate monadic types
      const text = sourceCode.getText(node)

      // Direct type checks - constructors or type names
      if (/\b(Option|Either|Maybe|Result|Some|None|Left|Right)\b/.test(text)) {
        return true
      }

      // Method chains that suggest monadic operations
      if (/\.(map|flatMap|filter|fold)\s*\(/.test(text)) {
        return true
      }

      // Variable names that suggest monadic types (case insensitive)
      if (/\b(option|either|maybe|result|some|none|left|right)\w*\b/i.test(text)) {
        return true
      }

      // Check the specific node type and name
      if (node.type === "Identifier") {
        const varName = node.name.toLowerCase()
        if (/(option|either|maybe|result|some|none|left|right|opt)/.test(varName)) {
          return true
        }
      }

      // Check for CallExpression pattern like Some("test").map()
      if (node.type === "CallExpression" && node.callee.type === "MemberExpression" && node.callee.object) {
        return isMonadicType(node.callee.object)
      }

      return false
    }

    return {
      CallExpression(node: ASTNode) {
        if (allowInTests && isInTestFile()) return

        if (node.callee.type !== "MemberExpression") return

        const property = node.callee.property
        if (!property || property.type !== "Identifier") return

        const methodName = property.name
        if (!unsafeMethods.includes(methodName)) return

        // Check if this looks like it's being called on a monadic type
        if (isMonadicType(node.callee.object)) {
          context.report({
            node,
            messageId: "noUnsafeGet",
            data: { method: methodName },
            fix(fixer) {
              const sourceCode = context.sourceCode
              const objectText = sourceCode.getText(node.callee.object)

              // Choose safer alternative based on method name
              let replacement: string
              if (methodName === "get") {
                // Replace .get() with .getOrElse(/* provide default */)
                replacement = `${objectText}.getOrElse(/* TODO: provide default value */)`
              } else if (methodName === "getOrThrow") {
                // Replace .getOrThrow() with .getOrElse()
                replacement = `${objectText}.getOrElse(/* TODO: provide default value */)`
              } else if (methodName === "unwrap") {
                // Replace .unwrap() with .getOrElse()
                replacement = `${objectText}.getOrElse(/* TODO: provide default value */)`
              } else if (methodName === "expect") {
                // Replace .expect(msg) with .getOrElse()
                replacement = `${objectText}.getOrElse(/* TODO: provide default value */)`
              } else {
                // Generic fallback
                replacement = `${objectText}.getOrElse(/* TODO: provide default value */)`
              }

              return fixer.replaceText(node, replacement)
            },
          })
        }
      },
    }
  },
}

export default rule
