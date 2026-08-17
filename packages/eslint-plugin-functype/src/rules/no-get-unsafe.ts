import type { Rule } from "eslint"

import type { ASTNode } from "../types/ast"

const DEFAULT_UNSAFE_METHODS: readonly string[] = ["orThrow", "expect", "get", "getOrThrow", "unwrap"]

const rule: Rule.RuleModule = {
  meta: {
    type: "problem",
    docs: {
      description: "Avoid unsafe extractor calls on Option, Either, and other Extractable types",
      recommended: true,
    },
    hasSuggestions: true,
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
            default: [...DEFAULT_UNSAFE_METHODS],
          },
        },
        additionalProperties: false,
      },
    ],
    messages: {
      noUnsafeGet: "Avoid unsafe .{{method}}() call. Use .fold(), .map(), or .orElse() instead",
      suggestOrElse: "Replace with .orElse(default) for a value fallback",
      suggestFold: "Replace with .fold(onNone, onSome) for branch handling",
    },
  },

  create(context) {
    const options = context.options[0] || {}
    const allowInTests = options.allowInTests !== false
    const unsafeMethods: readonly string[] = options.unsafeMethods || DEFAULT_UNSAFE_METHODS

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
          const sourceCode = context.sourceCode
          const objectText = sourceCode.getText(node.callee.object)

          // Preserve the original call's argument text in the TODO comment so a suggestion
          // applied to `.expect("Should have a user here")` or `.orThrow(new NotFound())`
          // doesn't silently drop information the developer intended to keep. Omit the
          // "was" suffix when the original call had no args (`.get()`, `.unwrap()`, etc.).
          const argsText = node.arguments.map((a: ASTNode) => sourceCode.getText(a)).join(", ")
          const wasSuffix = argsText ? `; was ${methodName}(${argsText})` : ""

          context.report({
            node,
            messageId: "noUnsafeGet",
            data: { method: methodName },
            suggest: [
              {
                messageId: "suggestOrElse",
                fix(fixer) {
                  return fixer.replaceText(node, `${objectText}.orElse(undefined /* TODO: default${wasSuffix} */)`)
                },
              },
              {
                messageId: "suggestFold",
                fix(fixer) {
                  return fixer.replaceText(
                    node,
                    `${objectText}.fold(() => undefined /* TODO: onNone${wasSuffix} */, (v) => v /* TODO: onSome */)`,
                  )
                },
              },
            ],
          })
        }
      },
    }
  },
}

export default rule
