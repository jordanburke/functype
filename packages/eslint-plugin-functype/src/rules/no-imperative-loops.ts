import type { Rule } from "eslint"

import type { ASTNode } from "../types/ast"

const rule: Rule.RuleModule = {
  meta: {
    type: "suggestion",
    hasSuggestions: true,
    docs: {
      description: "Prefer functional iteration methods over imperative for loops",
      recommended: true,
    },
    schema: [
      {
        type: "object",
        properties: {
          allowForIndexAccess: {
            type: "boolean",
            default: false,
          },
          allowWhileLoops: {
            type: "boolean",
            default: false,
          },
          allowInTests: {
            type: "boolean",
            default: true,
          },
        },
        additionalProperties: false,
      },
    ],
    messages: {
      noForLoop: "Prefer functional methods (.map, .filter, .forEach, .reduce) over for loops",
      noForInLoop: "Prefer Object.keys().forEach() or functional methods over for..in loops",
      noForOfLoop: "Prefer .forEach() or .map() over for..of loops",
      noWhileLoop: "Prefer functional iteration or recursion over while loops",
      noDoWhileLoop: "Prefer functional iteration or recursion over do..while loops",
      suggestForEach: "Replace with {{iterable}}.forEach(...)",
      suggestObjectKeys: "Replace with Object.keys({{object}}).forEach(...)",
    },
  },

  create(context) {
    const options = context.options[0] || {}
    const allowForIndexAccess = options.allowForIndexAccess || false
    const allowWhileLoops = options.allowWhileLoops || false
    const allowInTests = options.allowInTests !== false

    function isInTestFile() {
      const filename = context.filename
      return (
        /\.(test|spec)\.(ts|js|tsx|jsx)$/.test(filename) ||
        filename.includes("__tests__") ||
        filename.includes("/test/") ||
        filename.includes("/tests/")
      )
    }

    function needsIndexAccess(node: ASTNode): boolean {
      if (!node.body || node.body.type !== "BlockStatement") return false

      const sourceCode = context.sourceCode
      const bodyText = sourceCode.getText(node.body)

      // Look for array index access patterns like arr[i]
      return /\[\s*\w+\s*\]/.test(bodyText) && node.init && node.init.type === "VariableDeclaration"
    }

    function isSingleStatementBody(node: ASTNode): boolean {
      if (!node.body || node.body.type !== "BlockStatement") return false
      return node.body.body.length === 1
    }

    function hasDestructuringVariable(node: ASTNode): boolean {
      const left = node.left
      if (!left) return false
      if (left.type === "VariableDeclaration" && left.declarations[0]) {
        const id = left.declarations[0].id
        return id.type === "ObjectPattern" || id.type === "ArrayPattern"
      }
      return false
    }

    function bodyContainsBreakOrContinue(node: ASTNode): boolean {
      const sourceCode = context.sourceCode
      const bodyText = sourceCode.getText(node.body)
      return /\b(break|continue)\b/.test(bodyText)
    }

    return {
      ForStatement(node: ASTNode) {
        if (allowInTests && isInTestFile()) return

        // Allow traditional for loops if they need index access and option is set
        if (allowForIndexAccess && needsIndexAccess(node)) return

        context.report({
          node,
          messageId: "noForLoop",
        })
      },

      ForInStatement(node: ASTNode) {
        if (allowInTests && isInTestFile()) return

        const suggest: Rule.SuggestionReportDescriptor[] = []

        if (isSingleStatementBody(node) && !hasDestructuringVariable(node) && !bodyContainsBreakOrContinue(node)) {
          const sourceCode = context.sourceCode
          const bodyStmt = node.body.body[0]

          if (bodyStmt && bodyStmt.type === "ExpressionStatement") {
            const stmtText = sourceCode.getText(bodyStmt)
            const objText = sourceCode.getText(node.right)

            const left = node.left
            let keyVar: string
            if (left.type === "VariableDeclaration" && left.declarations[0]) {
              keyVar = sourceCode.getText(left.declarations[0].id)
            } else {
              keyVar = sourceCode.getText(left)
            }

            suggest.push({
              messageId: "suggestObjectKeys",
              data: { object: objText },
              fix(fixer) {
                return fixer.replaceText(node, `Object.keys(${objText}).forEach((${keyVar}) => {\n  ${stmtText}\n})`)
              },
            })
          }
        }

        context.report({
          node,
          messageId: "noForInLoop",
          suggest: suggest.length > 0 ? suggest : undefined,
        })
      },

      ForOfStatement(node: ASTNode) {
        if (allowInTests && isInTestFile()) return

        const suggest: Rule.SuggestionReportDescriptor[] = []

        if (isSingleStatementBody(node) && !hasDestructuringVariable(node) && !bodyContainsBreakOrContinue(node)) {
          const sourceCode = context.sourceCode
          const bodyStmt = node.body.body[0]

          if (bodyStmt && bodyStmt.type === "ExpressionStatement") {
            const stmtText = sourceCode.getText(bodyStmt)
            const iterableText = sourceCode.getText(node.right)

            const varDecl = node.left
            let varName: string
            if (varDecl.type === "VariableDeclaration" && varDecl.declarations[0]) {
              varName = sourceCode.getText(varDecl.declarations[0].id)
            } else {
              varName = sourceCode.getText(varDecl)
            }

            if (!stmtText.includes(".push(")) {
              suggest.push({
                messageId: "suggestForEach",
                data: { iterable: iterableText },
                fix(fixer) {
                  return fixer.replaceText(node, `${iterableText}.forEach((${varName}) => {\n  ${stmtText}\n})`)
                },
              })
            }
          }
        }

        context.report({
          node,
          messageId: "noForOfLoop",
          suggest: suggest.length > 0 ? suggest : undefined,
        })
      },

      WhileStatement(node: ASTNode) {
        if (allowWhileLoops) return
        if (allowInTests && isInTestFile()) return

        context.report({
          node,
          messageId: "noWhileLoop",
        })
      },

      DoWhileStatement(node: ASTNode) {
        if (allowWhileLoops) return
        if (allowInTests && isInTestFile()) return

        context.report({
          node,
          messageId: "noDoWhileLoop",
        })
      },
    }
  },
}

export default rule
