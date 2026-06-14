import type { Rule } from "eslint"

import type { ASTNode } from "../types/ast"
import { createImportFixer, hasFunctypeSymbol } from "../utils/import-fixer"

/** AST keys that don't represent syntax children — back-edges and source metadata. */
const NON_CHILD_KEYS: ReadonlySet<string> = new Set(["parent", "loc", "range"])

/** AST children of `node` (drops back-edges, flattens array-valued keys, filters non-object leaves). */
function astChildren(node: ASTNode): readonly unknown[] {
  return Object.entries(node)
    .filter(([k]) => !NON_CHILD_KEYS.has(k))
    .flatMap(([, v]) => (Array.isArray(v) ? v : [v]))
    .filter((v) => v !== null && typeof v === "object")
}

/** True iff any ancestor of `node` is a `CatchClause`. Pure tail recursion. */
function insideCatchClause(node: ASTNode | null | undefined): boolean {
  const parent = node?.parent as ASTNode | undefined
  if (!parent) return false
  return parent.type === "CatchClause" || insideCatchClause(parent)
}

const rule: Rule.RuleModule = {
  meta: {
    type: "suggestion",
    hasSuggestions: true,
    docs: {
      description: "Use Either/Left/Right for typed domain errors instead of throwing",
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
      preferEitherOverThrow: "Prefer Either.left(error) over throw statement",
      preferEitherReturn: "Consider returning Either<Error, {{type}}> instead of throwing",
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

      // A throw that's *not* inside a catch is the thing we're looking for.
      if (node.type === "ThrowStatement") return !insideCatchClause(node)

      // Catch bodies don't count — re-throws inside them are allowed.
      if (node.type === "CatchClause") return false

      // Recurse: true iff any child satisfies the predicate.
      return astChildren(node).some((child) => hasThrowStatementsOutsideCatch(child as ASTNode))
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
      ThrowStatement(node: ASTNode) {
        // Allow throws in test files if configured
        if (allowThrowInTests && isInTestFile()) return

        // Allow re-throwing in catch blocks (common pattern)
        if (insideCatchClause(node)) return

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
