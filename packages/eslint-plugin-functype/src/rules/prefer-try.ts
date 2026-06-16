import type { Rule } from "eslint"

import type { ASTNode } from "../types/ast"
import { createImportFixer, hasFunctypeSymbol } from "../utils/import-fixer"

const rule: Rule.RuleModule = {
  meta: {
    type: "suggestion",
    hasSuggestions: true,
    docs: {
      description: "Prefer Try for computations that may throw",
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
      preferTryOverTryCatch: "Prefer Try(() => ...) over try/catch block",
      suggestTry: "Replace with Try(() => ...)",
      suggestTryFromPromise: "Replace with Try.fromPromise(...)",
      suggestAddImport: "Add {{symbol}} import from functype",
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

    function isSimpleTryBody(node: ASTNode): boolean {
      return node.block?.body?.length === 1
    }

    function isSimpleCatch(node: ASTNode): boolean {
      if (!node.handler?.body) return false
      const catchBody = node.handler.body.body
      return (
        catchBody.length === 0 ||
        (catchBody.length === 1 &&
          (catchBody[0].type === "ReturnStatement" || catchBody[0].type === "ExpressionStatement"))
      )
    }

    function tryBodyHasAwait(node: ASTNode): boolean {
      const stmt = node.block.body[0]
      if (stmt.type === "ReturnStatement" && stmt.argument?.type === "AwaitExpression") return true
      if (stmt.type === "ExpressionStatement" && stmt.expression?.type === "AwaitExpression") return true
      return false
    }

    return {
      TryStatement(node: ASTNode) {
        // Try cannot model `finally` — bail on any try statement with a finalizer.
        // Covers two bugs: (1) catch-less try/finally fires a misleading warning
        // with no useful autofix; (2) try/catch/finally autofix would lift the
        // catch into Try(() => …) and silently drop the finally clause. The FP
        // primitive for guaranteed cleanup is IO.bracket, on the lazy IO type.
        // See #206.
        if (node.finalizer) return

        // Allow try/catch in test files
        if (allowThrowInTests && isInTestFile()) return

        // Allow try/catch that re-throws in the catch block (even with logging)
        if (node.handler && node.handler.body) {
          const catchBody = node.handler.body.body
          const hasRethrow = catchBody.some((stmt: ASTNode) => stmt.type === "ThrowStatement")
          if (hasRethrow) return
        }

        const sourceCode = context.sourceCode
        const suggest: Rule.SuggestionReportDescriptor[] = []

        if (isSimpleTryBody(node) && isSimpleCatch(node)) {
          const tryStmt = node.block.body[0]
          const isReturn = tryStmt.type === "ReturnStatement"

          // Only suggest when the try body is a return statement — non-return expression
          // replacements would produce syntactically ambiguous code without knowing the context
          if (isReturn) {
            const expr = tryStmt.argument
            const exprText = sourceCode.getText(expr)

            if (tryBodyHasAwait(node)) {
              const awaitExpr = expr.type === "AwaitExpression" ? expr.argument : expr
              const innerText = sourceCode.getText(awaitExpr)
              suggest.push({
                messageId: "suggestTryFromPromise",
                fix(fixer) {
                  return fixer.replaceText(node, `return Try.fromPromise(${innerText})`)
                },
              })
            } else {
              suggest.push({
                messageId: "suggestTry",
                fix(fixer) {
                  return fixer.replaceText(node, `return Try(() => ${exprText})`)
                },
              })
            }

            if (!hasFunctypeSymbol(sourceCode, "Try")) {
              suggest.push({
                messageId: "suggestAddImport",
                data: { symbol: "Try" },
                fix: createImportFixer(sourceCode, "Try"),
              })
            }
          }
        }

        context.report({
          node,
          messageId: "preferTryOverTryCatch",
          suggest,
        })
      },
    }
  },
}

export default rule
