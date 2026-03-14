import type { Rule } from "eslint"

import type { ASTNode } from "../types/ast"

const rule: Rule.RuleModule = {
  meta: {
    type: "suggestion",
    docs: {
      description: "Prefer Either<E, T> over try/catch blocks and throw statements",
      recommended: true,
    },
    schema: [
      {
        type: "object",
        properties: {
          allowThrowInTests: {
            type: "boolean",
            default: true,
          },
        },
        additionalProperties: false,
      },
    ],
    messages: {
      preferEitherOverTryCatch: "Prefer Either<Error, T> over try/catch block",
      preferEitherOverThrow: "Prefer Either.left(error) over throw statement",
      preferEitherReturn: "Consider returning Either<Error, {{type}}> instead of throwing",
    },
  },

  create(context) {
    const options = context.options[0] || {}
    const allowThrowInTests = options.allowThrowInTests !== false

    function isInTestFile() {
      const filename = context.filename
      return (
        /\.(test|spec)\.(ts|js|tsx|jsx)$/.test(filename) ||
        filename.includes("__tests__") ||
        filename.includes("/test/") ||
        filename.includes("/tests/")
      )
    }

    function hasThrowStatementsOutsideCatch(node: ASTNode): boolean {
      if (!node) return false

      if (node.type === "ThrowStatement") {
        // Check if this throw is inside a catch block
        let parent = node.parent
        while (parent) {
          if (parent.type === "CatchClause") return false
          parent = parent.parent
        }
        return true
      }

      // Skip catch blocks when recursing
      if (node.type === "CatchClause") return false

      // Recursively check child nodes
      for (const key in node) {
        if (key === "parent") continue // Avoid circular references
        const child = node[key]
        if (Array.isArray(child)) {
          for (const item of child) {
            if (item && typeof item === "object" && hasThrowStatementsOutsideCatch(item)) {
              return true
            }
          }
        } else if (child && typeof child === "object" && hasThrowStatementsOutsideCatch(child)) {
          return true
        }
      }

      return false
    }

    return {
      TryStatement(node: ASTNode) {
        // Allow try/catch in test files
        if (allowThrowInTests && isInTestFile()) return

        // Allow try/catch that re-throws in the catch block (even with logging)
        if (node.handler && node.handler.body) {
          const catchBody = node.handler.body.body
          const hasRethrow = catchBody.some((stmt: ASTNode) => stmt.type === "ThrowStatement")
          if (hasRethrow) return
        }

        context.report({
          node,
          messageId: "preferEitherOverTryCatch",
        })
      },

      ThrowStatement(node: ASTNode) {
        // Allow throws in test files if configured
        if (allowThrowInTests && isInTestFile()) return

        // Allow re-throwing in catch blocks (common pattern)
        let parent = node.parent
        while (parent) {
          if (parent.type === "CatchClause") return
          parent = parent.parent
        }

        context.report({
          node,
          messageId: "preferEitherOverThrow",
        })
      },

      FunctionDeclaration(node: ASTNode) {
        // Allow functions in test files
        if (allowThrowInTests && isInTestFile()) return

        if (!node.body) return

        // Only report function-level errors if there are throws NOT in catch blocks
        // (throws in catch blocks are handled by ThrowStatement rule)
        const hasThrowsNotInCatch = hasThrowStatementsOutsideCatch(node.body)
        if (hasThrowsNotInCatch) {
          const returnType = node.returnType?.typeAnnotation
          if (returnType) {
            const sourceCode = context.sourceCode
            const returnTypeText = sourceCode.getText(returnType)

            // Don't report if already using Either
            if (!returnTypeText.includes("Either")) {
              context.report({
                node: node.id || node,
                messageId: "preferEitherReturn",
                data: { type: returnTypeText },
              })
            }
          }
        }
      },
    }
  },
}

export default rule
