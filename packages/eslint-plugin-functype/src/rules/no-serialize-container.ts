import type { Rule } from "eslint"

import type { ASTNode } from "../types/ast"
import { containerInsideByType } from "../utils/type-aware"

/**
 * `JSON.stringify(x)` or `*.json(x)`: Hono's `c.json`, `Response.json`, Express's `res.json`. A read
 * such as `await res.json()` has no argument, so it never matches.
 */
function serializedArgument(call: ASTNode): ASTNode | undefined {
  const callee = call.callee as ASTNode
  const [first] = call.arguments as ReadonlyArray<ASTNode>
  if (first === undefined || first.type === "SpreadElement") return undefined
  if (callee.type !== "MemberExpression" || callee.computed || callee.property.type !== "Identifier") return undefined
  if (callee.property.name === "json") return first
  const object = callee.object as ASTNode
  return callee.property.name === "stringify" && object.type === "Identifier" && object.name === "JSON"
    ? first
    : undefined
}

/**
 * Reports a functype container handed to a JSON sink, anywhere inside the value. An Either, Option or
 * List serializes as its `{"@functype", _tag, value}` envelope, so a client reading `subscription.plan`
 * gets `undefined`, and a body built around a Left answers 200. The compiler can't catch it, because
 * `c.json()` and `JSON.stringify()` accept any value (#364).
 *
 * Calling `.toJSON()` or `.serialize()` first says the envelope is what you mean, and isn't reported.
 *
 * Type-aware only: without type information it reports nothing.
 */
const rule: Rule.RuleModule = {
  meta: {
    type: "problem",
    docs: {
      description: "Disallow passing an Either, Option, List or other functype container to a JSON sink",
      recommended: false,
    },
    schema: [],
    messages: {
      serializedContainer:
        "This sends the {{name}}'s {_tag, value} envelope{{where}}, not its value. Unwrap it first: check isLeft() / isNone() and return the error, fold() it, or call .toArray() on a List. Use .toJSON() if the envelope is what you mean",
    },
  },

  create(context) {
    return {
      CallExpression(node: ASTNode) {
        const argument = serializedArgument(node)
        if (argument === undefined) return
        const found = containerInsideByType(argument, context)
        if (found === undefined) return
        context.report({
          node: argument,
          messageId: "serializedContainer",
          data: { name: found.name, where: found.path === "" ? "" : ` at ${found.path}` },
        })
      },
    }
  },
}

export default rule
