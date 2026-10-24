import type { Rule } from "eslint"

import type { ASTNode } from "../types/ast"
import { containsAwait, containsYield } from "../utils/async-detection"

const rule: Rule.RuleModule = {
  meta: {
    type: "suggestion",
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
      noForLoop:
        "Replace this for loop with the method for what it does: .map/.filter/.flatMap to build a new collection, .reduce (List: .foldLeft) to accumulate, .find/.some (List: .exists) to stop at a match. Need the index? array.map((x, i) => ...) or List(xs).zipWithIndex()",
      noForInLoop:
        "Replace this for..in with Object.entries/keys/values(obj) and the method for what it does: .map/.filter to build, .reduce to accumulate. for..in also visits inherited enumerable keys",
      noForOfLoop:
        "Replace this for..of with the method for what it does: .map/.filter/.flatMap to build a new collection, .reduce (List: .foldLeft) to accumulate, .find/.some (List: .exists) to stop at a match. Use .forEach only for side effects. On a Set, Map, string or generator, spread it to an array first or wrap it in List(...)",
      noAsyncLoop:
        "This loop awaits, which .forEach()/.map() cannot do. To await in order use List(items).mapAsync(f), or Either.traverseAsync(items, f) when f returns Either (stops at the first Left). Inside IO, use IO.forEach(items, f)",
      noWhileLoop: "Prefer functional iteration or recursion over while loops",
      noDoWhileLoop: "Prefer functional iteration or recursion over do..while loops",
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

    /**
     * Loops with no functional equivalent (#324): `for await` consumes a stream, and collecting it first
     * would defeat the streaming; a loop that yields is a generator's body, and a callback cannot yield.
     */
    function hasNoFunctionalEquivalent(node: ASTNode): boolean {
      return (node.type === "ForOfStatement" && node.await === true) || containsYield(node.body)
    }

    return {
      ForStatement(node: ASTNode) {
        if (hasNoFunctionalEquivalent(node)) return
        if (allowInTests && isInTestFile()) return

        // Allow traditional for loops if they need index access and option is set
        if (allowForIndexAccess && needsIndexAccess(node)) return

        if (containsAwait(node.body)) {
          context.report({ node, messageId: "noAsyncLoop" })
          return
        }

        context.report({
          node,
          messageId: "noForLoop",
        })
      },

      ForInStatement(node: ASTNode) {
        if (hasNoFunctionalEquivalent(node)) return
        if (allowInTests && isInTestFile()) return

        if (containsAwait(node.body)) {
          context.report({ node, messageId: "noAsyncLoop" })
          return
        }

        context.report({
          node,
          messageId: "noForInLoop",
        })
      },

      ForOfStatement(node: ASTNode) {
        if (hasNoFunctionalEquivalent(node)) return
        if (allowInTests && isInTestFile()) return

        if (containsAwait(node.body)) {
          context.report({ node, messageId: "noAsyncLoop" })
          return
        }

        context.report({
          node,
          messageId: "noForOfLoop",
        })
      },

      WhileStatement(node: ASTNode) {
        if (hasNoFunctionalEquivalent(node)) return
        if (allowWhileLoops) return
        if (allowInTests && isInTestFile()) return

        context.report({
          node,
          messageId: "noWhileLoop",
        })
      },

      DoWhileStatement(node: ASTNode) {
        if (hasNoFunctionalEquivalent(node)) return
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
