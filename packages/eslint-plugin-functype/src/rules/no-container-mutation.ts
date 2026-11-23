import type { Rule } from "eslint"

import type { ASTNode } from "../types/ast"
import { functypeValueByType } from "../utils/type-aware"

/** Wrappers a write reaches through unchanged: `x as T`, `x satisfies T`, `<T>x`, `x!`. */
const CASTS: ReadonlySet<string> = new Set([
  "TSAsExpression",
  "TSSatisfiesExpression",
  "TSTypeAssertion",
  "TSNonNullExpression",
])

const uncast = (node: ASTNode): ASTNode => (CASTS.has(node.type) ? uncast(node.expression as ASTNode) : node)

/** Calls that change their first argument: `Object.assign(target, …)`, `Reflect.set(target, …)`. */
const TARGET_FIRST: Readonly<Record<string, ReadonlySet<string>>> = {
  Object: new Set(["assign", "defineProperty", "defineProperties", "setPrototypeOf"]),
  Reflect: new Set(["set", "defineProperty", "deleteProperty", "setPrototypeOf"]),
}

const isTargetFirstCall = (call: ASTNode): boolean => {
  const callee = call.callee as ASTNode
  if (callee.type !== "MemberExpression" || callee.computed) return false
  const object = callee.object as ASTNode
  const property = callee.property as ASTNode
  return (
    object.type === "Identifier" &&
    property.type === "Identifier" &&
    (TARGET_FIRST[object.name]?.has(property.name) ?? false)
  )
}

/**
 * Reports a write to a functype value: an assignment, `++`/`--` or `delete` on one of its fields (or on
 * anything reached through them, such as a List's backing array), and `Object.assign`,
 * `Object.defineProperty`, `Reflect.set` and similar calls aimed at one. functype values don't change
 * after they're built: other values share their data, and their methods assume it stays put. The
 * types mark every field read-only, so a write needs a cast, and the rule looks through the cast
 * (`(list as unknown as { value: number[] }).value = …`) at the value underneath.
 *
 * Only values whose `fold` functype declares count, so a user type with the same shape is never reported.
 * Type-aware only: without type information it reports nothing.
 */
const rule: Rule.RuleModule = {
  meta: {
    type: "problem",
    docs: {
      description: "Disallow changing a functype value in place",
      recommended: false,
    },
    schema: [],
    messages: {
      mutation:
        "This changes a {{name}} in place. functype values don't change after they're built, and other values share their data. Build a new one instead: map, filter, add, set or concat",
    },
  },

  create(context) {
    /** The functype value a written path starts from: `list` in `(list as any).value[0]`. */
    const rootValue = (target: ASTNode, depth = 0): { readonly name: string } | undefined => {
      const node = uncast(target)
      const name = functypeValueByType(node, context)
      if (name !== undefined) return { name }
      return node.type === "MemberExpression" && depth < 8 ? rootValue(node.object as ASTNode, depth + 1) : undefined
    }

    const check = (write: ASTNode, target: ASTNode, member: boolean): void => {
      const start = member ? (target.type === "MemberExpression" ? (target.object as ASTNode) : undefined) : target
      if (start === undefined) return
      const found = rootValue(start)
      if (found !== undefined) context.report({ node: write, messageId: "mutation", data: found })
    }

    return {
      AssignmentExpression(node: ASTNode) {
        check(node, uncast(node.left as ASTNode), true)
      },
      UpdateExpression(node: ASTNode) {
        check(node, uncast(node.argument as ASTNode), true)
      },
      UnaryExpression(node: ASTNode) {
        if (node.operator === "delete") check(node, uncast(node.argument as ASTNode), true)
      },
      CallExpression(node: ASTNode) {
        const [first] = node.arguments as ReadonlyArray<ASTNode>
        if (first !== undefined && first.type !== "SpreadElement" && isTargetFirstCall(node)) check(node, first, false)
      },
    }
  },
}

export default rule
