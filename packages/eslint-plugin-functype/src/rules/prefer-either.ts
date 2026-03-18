import type { Rule } from "eslint"

import type { ASTNode } from "../types/ast"
import { createImportFixer, hasFunctypeSymbol } from "../utils/import-fixer"

const rule: Rule.RuleModule = {
  meta: {
    type: "suggestion",
    hasSuggestions: true,
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
      suggestTry: "Replace with Try(() => ...)",
      suggestTryFromPromise: "Replace with Try.fromPromise(...)",
      suggestEitherLeft: "Replace with Either.left(...)",
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

    function checkFunctionForThrows(node: ASTNode): void {
      // Allow functions in test files
      if (allowThrowInTests && isInTestFile()) return

      if (!node.body) return

      // Only report function-level errors if there are throws NOT in catch blocks
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

    function isFunctionLike(node: ASTNode): boolean {
      if (!node) return false
      return ["FunctionDeclaration", "FunctionExpression", "ArrowFunctionExpression"].includes(node.type)
    }

    function isDirectInFunctionBody(node: ASTNode): boolean {
      const parent = node.parent
      if (!parent) return false
      if (parent.type === "BlockStatement" && isFunctionLike(parent.parent)) return true
      if (parent.type === "BlockStatement" && parent.parent?.type === "IfStatement") {
        const ifParent = parent.parent.parent
        return ifParent?.type === "BlockStatement" && isFunctionLike(ifParent.parent)
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
          messageId: "preferEitherOverTryCatch",
          suggest,
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

        const sourceCode = context.sourceCode
        const suggest: Rule.SuggestionReportDescriptor[] = []

        if (isDirectInFunctionBody(node)) {
          const throwArg = node.argument
          const argText = sourceCode.getText(throwArg)
          const isErrorExpr =
            throwArg?.type === "NewExpression" &&
            throwArg.callee?.type === "Identifier" &&
            throwArg.callee.name === "Error"
          const eitherArg = isErrorExpr ? argText : `new Error(String(${argText}))`

          suggest.push({
            messageId: "suggestEitherLeft",
            fix(fixer) {
              return fixer.replaceText(node, `return Either.left(${eitherArg})`)
            },
          })

          if (!hasFunctypeSymbol(sourceCode, "Either")) {
            suggest.push({
              messageId: "suggestAddImport",
              data: { symbol: "Either" },
              fix: createImportFixer(sourceCode, "Either"),
            })
          }
        }

        context.report({
          node,
          messageId: "preferEitherOverThrow",
          suggest,
        })
      },

      FunctionDeclaration(node: ASTNode) {
        checkFunctionForThrows(node)
      },

      ArrowFunctionExpression(node: ASTNode) {
        checkFunctionForThrows(node)
      },
    }
  },
}

export default rule
