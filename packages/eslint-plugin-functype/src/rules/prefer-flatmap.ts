import type { Rule } from "eslint"

import type { ASTNode } from "../types/ast"

const rule: Rule.RuleModule = {
  meta: {
    type: "suggestion",
    docs: {
      description: "Prefer .flatMap() over .map().flat() and nested transformations",
      recommended: true,
    },
    fixable: "code",
    schema: [
      {
        type: "object",
        properties: {
          checkNestedMaps: {
            type: "boolean",
            default: true,
          },
        },
        additionalProperties: false,
      },
    ],
    messages: {
      preferFlatMapOverMapFlat: "Use .flatMap() instead of .map().flat()",
      preferFlatMapNested: "Consider .flatMap() for nested transformations that return arrays",
      preferFlatMapChain: "Use .flatMap() instead of chained .map() operations that flatten results",
    },
  },

  create(context) {
    const options = context.options[0] || {}
    const checkNestedMaps = options.checkNestedMaps !== false

    function isMapFollowedByFlat(node: ASTNode): boolean {
      if (node.type !== "CallExpression") return false

      const callee = node.callee
      if (callee.type !== "MemberExpression") return false

      // Check if this is .flat()
      if (callee.property.name === "flat") {
        const object = callee.object

        // Check if the object is a .map() call
        if (
          object.type === "CallExpression" &&
          object.callee.type === "MemberExpression" &&
          object.callee.property.name === "map"
        ) {
          return true
        }
      }

      return false
    }

    function returnsArray(functionNode: ASTNode): boolean {
      if (!functionNode || !functionNode.body) return false

      // Arrow function with expression body
      if (functionNode.body.type === "ArrayExpression") {
        return true
      }

      // Arrow function with call expression body
      if (functionNode.body.type === "CallExpression") {
        const call = functionNode.body
        if (call.callee.type === "MemberExpression") {
          const methodName = call.callee.property.name
          // Common methods that return arrays
          if (["map", "filter", "slice", "concat", "split"].includes(methodName)) {
            return true
          }
        }
      }

      // Function with block body
      if (functionNode.body.type === "BlockStatement") {
        const statements = functionNode.body.body

        // Look for return statements that return arrays
        for (const stmt of statements) {
          if (stmt.type === "ReturnStatement" && stmt.argument) {
            if (stmt.argument.type === "ArrayExpression") {
              return true
            }

            // Check for method calls that return arrays
            if (stmt.argument.type === "CallExpression") {
              const call = stmt.argument
              if (call.callee.type === "MemberExpression") {
                const methodName = call.callee.property.name
                // Common methods that return arrays
                if (["map", "filter", "slice", "concat", "split"].includes(methodName)) {
                  return true
                }
              }
            }
          }
        }
      }

      return false
    }

    function isNestedMapReturningArrays(node: ASTNode): boolean {
      if (node.type !== "CallExpression") return false

      const callee = node.callee
      if (callee.type !== "MemberExpression") return false

      // Check if this is .map()
      if (callee.property.name === "map") {
        const callback = node.arguments[0]
        if (callback && (callback.type === "ArrowFunctionExpression" || callback.type === "FunctionExpression")) {
          return returnsArray(callback)
        }
      }

      return false
    }

    return {
      CallExpression(node: ASTNode) {
        // Check for .map().flat() pattern first (highest priority)
        if (isMapFollowedByFlat(node)) {
          const sourceCode = context.sourceCode

          context.report({
            node,
            messageId: "preferFlatMapOverMapFlat",
            fix(fixer) {
              // Get the .map() call
              const mapCall = (node.callee as ASTNode).object
              const mapCallText = sourceCode.getText(mapCall)

              // Replace .map() with .flatMap() and remove .flat()
              const flatMapText = mapCallText.replace(/\.map\s*\(/, ".flatMap(")

              return fixer.replaceText(node, flatMapText)
            },
          })
          return // Don't check other patterns if we found .map().flat()
        }

        // Check for chained maps where intermediate results are arrays (highest priority after map().flat())
        if (node.callee.type === "MemberExpression" && node.callee.property.name === "map") {
          const object = node.callee.object
          if (
            object.type === "CallExpression" &&
            object.callee.type === "MemberExpression" &&
            object.callee.property.name === "map"
          ) {
            // Check if the first map returns arrays
            const firstMapCallback = object.arguments[0]
            if (firstMapCallback && returnsArray(firstMapCallback)) {
              context.report({
                node: object, // Report on the first map call
                messageId: "preferFlatMapChain",
              })
              return // Don't check other patterns for this chain
            }
          }
        }

        // Check for nested maps that return arrays (but not if they're part of map().flat() or chains)
        if (checkNestedMaps && isNestedMapReturningArrays(node)) {
          // Don't flag if this map is immediately followed by flat()
          if (
            node.parent &&
            node.parent.type === "MemberExpression" &&
            node.parent.parent &&
            node.parent.parent.type === "CallExpression" &&
            node.parent.property.name === "flat"
          ) {
            return // Skip - this will be handled by the map().flat() rule
          }

          // Don't flag if this map is part of a chain (either as first or second map)
          const object = node.callee?.object
          if (
            object?.type === "CallExpression" &&
            object.callee?.type === "MemberExpression" &&
            object.callee?.property?.name === "map"
          ) {
            return // Skip - this is part of a chain
          }

          // Check if this map feeds into another map
          if (
            node.parent?.type === "MemberExpression" &&
            node.parent.parent?.type === "CallExpression" &&
            node.parent.parent.callee?.property?.name === "map"
          ) {
            return // Skip - this feeds into a chain
          }

          context.report({
            node,
            messageId: "preferFlatMapNested",
          })
        }
      },
    }
  },
}

export default rule
