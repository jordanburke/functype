import type { Rule } from "eslint"

import type { ASTNode } from "../types/ast"

const rule: Rule.RuleModule = {
  meta: {
    type: "suggestion",
    fixable: "code",
    hasSuggestions: true,
    docs: {
      description: "Prefer const over let — use immutable bindings",
      recommended: true,
    },
    schema: [
      {
        type: "object",
        properties: {
          allowInTests: {
            type: "boolean",
            default: true,
          },
        },
        additionalProperties: false,
      },
    ],
    messages: {
      noLet: "Prefer const over let — use immutable bindings",
      suggestConst: "Replace let with const",
    },
  },

  create(context) {
    const options = context.options[0] || {}
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

    return {
      VariableDeclaration(node: ASTNode) {
        if (node.kind !== "let") return
        if (allowInTests && isInTestFile()) return

        const declaredVars = context.sourceCode.getDeclaredVariables(node)
        const hasReassignment = declaredVars.some((variable: ASTNode) =>
          variable.references.some((ref: ASTNode) => ref.isWrite() && ref.identifier !== variable.defs[0]?.name),
        )

        if (!hasReassignment) {
          // Safe to autofix — no reassignment detected
          context.report({
            node,
            messageId: "noLet",
            fix(fixer: Rule.RuleFixer) {
              const sourceCode = context.sourceCode
              const firstToken = sourceCode.getFirstToken(node)
              if (firstToken && firstToken.value === "let") {
                return fixer.replaceText(firstToken, "const")
              }
              return null
            },
          })
        } else {
          // Reassignment found — warn only, with suggestion
          context.report({
            node,
            messageId: "noLet",
            suggest: [
              {
                messageId: "suggestConst",
                fix(fixer: Rule.RuleFixer) {
                  const sourceCode = context.sourceCode
                  const firstToken = sourceCode.getFirstToken(node)
                  if (firstToken && firstToken.value === "let") {
                    return fixer.replaceText(firstToken, "const")
                  }
                  return null
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
