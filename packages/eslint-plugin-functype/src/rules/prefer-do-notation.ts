import type { Rule } from "eslint"

import type { ASTNode } from "../types/ast"
import { getFunctypeImports, isChainedMethodCall } from "../utils/functype-detection"

const rule: Rule.RuleModule = {
  meta: {
    type: "suggestion",
    docs: {
      description: "Prefer Do notation for complex monadic compositions and nested operations",
      recommended: true,
    },
    fixable: "code",
    messages: {
      preferDoForNestedChecks: "Prefer Do notation for nested null/undefined checks instead of logical AND chains",
      preferDoForChainedMethods: "Prefer Do notation for complex flatMap chains ({{count}} levels deep)",
      preferDoForMixedMonads: "Consider Do notation when mixing Option, Either, and Try operations",
      preferDoAsyncForChainedTasks: "Prefer DoAsync notation for chained async operations",
    },
    schema: [
      {
        type: "object",
        properties: {
          minChainDepth: {
            type: "integer",
            minimum: 2,
            default: 3,
          },
          detectMixedMonads: {
            type: "boolean",
            default: true,
          },
        },
        additionalProperties: false,
      },
    ],
  },
  create(context) {
    const options = context.options[0] || {}
    const minChainDepth = options.minChainDepth || 3
    const detectMixedMonads = options.detectMixedMonads !== false

    const functypeImports = getFunctypeImports(context)

    // Track if Do notation is already imported
    const hasDoImport = functypeImports.functions.has("Do") || functypeImports.functions.has("DoAsync")

    /**
     * Detect nested null/undefined checks like: a && a.b && a.b.c
     */
    function checkNestedNullChecks(node: ASTNode): void {
      if (node.operator !== "&&") return

      let depth = 0
      let current: ASTNode = node

      // Count the depth of && chains with property access
      while (current.type === "LogicalExpression" && current.operator === "&&") {
        if (
          current.right.type === "MemberExpression" ||
          (current.right.type === "LogicalExpression" && current.right.operator === "&&")
        ) {
          depth++
        }
        current = current.left
      }

      // Check if this looks like nested property access guarding
      if (depth >= 2 && hasNestedPropertyAccess(node)) {
        context.report({
          node,
          messageId: "preferDoForNestedChecks",
          fix: hasDoImport ? (fixer) => fixNestedChecks(fixer, node) : undefined,
        })
      }
    }

    /**
     * Check if logical expression contains nested property access patterns
     */
    function hasNestedPropertyAccess(node: ASTNode): boolean {
      const text = context.sourceCode.getText(node)

      // Look for patterns like: obj && obj.prop && obj.prop.nested
      const nestedPattern = /\w+(\.\w+){2,}/g
      const matches = text.match(nestedPattern)

      return matches !== null && matches.length > 0
    }

    /**
     * Detect long flatMap chains
     */
    function checkChainedMethods(node: ASTNode): void {
      if (!isChainedMethodCall(node, "flatMap")) return

      const chainDepth = getChainDepth(node)

      if (chainDepth >= minChainDepth) {
        context.report({
          node,
          messageId: "preferDoForChainedMethods",
          data: { count: chainDepth.toString() },
          fix: hasDoImport ? (fixer) => fixChainedMethods(fixer, node) : undefined,
        })
      }
    }

    /**
     * Calculate chain depth for method calls
     */
    function getChainDepth(node: ASTNode): number {
      let depth = 1
      let current = node

      while (current.callee.type === "MemberExpression" && current.callee.object.type === "CallExpression") {
        const method = current.callee.property
        if (method.type === "Identifier" && ["flatMap", "map", "filter", "fold"].includes(method.name)) {
          depth++
        }
        current = current.callee.object
      }

      return depth
    }

    /**
     * Auto-fix for nested null checks
     */
    function fixNestedChecks(fixer: Rule.RuleFixer, node: ASTNode): Rule.Fix {
      const text = context.sourceCode.getText(node)

      // Simple transformation for common patterns
      // a && a.b && a.b.c -> Do(function* () { const x = yield* $(Option(a)); const y = yield* $(Option(x.b)); return Option(y.c) })
      const match = text.match(/(\w+)(\.\w+)+/)
      if (match) {
        const baseVar = match[1]
        const chain = match[0]

        const doNotation = `Do(function* () {
  const obj = yield* $(Option(${baseVar}))
  return yield* $(Option(obj${chain.substring(baseVar.length)}))
})`

        return fixer.replaceText(node, doNotation)
      }

      return fixer.replaceText(node, `/* TODO: Convert to Do notation */ ${text}`)
    }

    /**
     * Auto-fix for chained methods (basic)
     */
    function fixChainedMethods(fixer: Rule.RuleFixer, node: ASTNode): Rule.Fix {
      const text = context.sourceCode.getText(node)

      // For now, just add a comment suggesting Do notation
      return fixer.replaceText(node, `/* TODO: Consider Do notation for complex chains */ ${text}`)
    }

    /**
     * Detect mixed monad usage
     */
    function checkMixedMonads(node: ASTNode): void {
      if (!detectMixedMonads) return

      const text = context.sourceCode.getText(node)
      const monadTypes = ["Option", "Either", "Try", "Task"]
      const foundMonads = monadTypes.filter((type) => text.includes(type))

      if (foundMonads.length >= 2) {
        context.report({
          node,
          messageId: "preferDoForMixedMonads",
        })
      }
    }

    return {
      LogicalExpression(node) {
        checkNestedNullChecks(node)
      },

      CallExpression(node) {
        checkChainedMethods(node)
        checkMixedMonads(node)
      },
    }
  },
}

export default rule
