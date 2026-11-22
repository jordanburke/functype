import type { Rule } from "eslint"

import type { ASTNode } from "../types/ast"
import { functypeMethodByType } from "../utils/type-aware"

/** `fn.bind(x)`, `fn.call(x, …)`, `fn.apply(x, …)`: the function is used on purpose, with a receiver. */
const RECEIVER_METHODS: ReadonlySet<string> = new Set(["bind", "call", "apply"])

/** Wrappers that pass a value through unchanged: `a?.b`, `x!`, `x as F`, `x satisfies F`, `<F>x`. */
const PASS_THROUGH: ReadonlySet<string> = new Set([
  "ChainExpression",
  "TSNonNullExpression",
  "TSAsExpression",
  "TSSatisfiesExpression",
  "TSTypeAssertion",
])

/** The expression a member read evaluates into, looking through the pass-through wrappers. */
const outermost = (node: ASTNode): ASTNode => {
  const parent = node.parent as ASTNode | undefined
  return parent !== undefined && PASS_THROUGH.has(parent.type) ? outermost(parent) : node
}

/**
 * Is the read used as a function on purpose: called (`list.head()`, `list.head?.()`), given a receiver
 * (`.bind` / `.call` / `.apply`), checked with `typeof`, assigned to, or deleted?
 */
const isDeliberateUse = (read: ASTNode): boolean => {
  const node = outermost(read)
  const parent = node.parent as ASTNode | undefined
  if (parent === undefined) return false
  switch (parent.type) {
    case "CallExpression":
    case "NewExpression":
      return parent.callee === node
    case "TaggedTemplateExpression":
      return parent.tag === node
    case "MemberExpression":
      return (
        parent.object === node &&
        !parent.computed &&
        parent.property.type === "Identifier" &&
        RECEIVER_METHODS.has(parent.property.name)
      )
    case "UnaryExpression":
      return parent.operator === "typeof" || parent.operator === "delete"
    case "AssignmentExpression":
      return parent.left === node
    default:
      return false
  }
}

/** The name a member is read under: `head` in `list.head` or `list["head"]`. */
const memberName = (node: ASTNode): string | undefined => {
  const property = node.property as ASTNode
  if (!node.computed && property.type === "Identifier") return property.name
  return node.computed && property.type === "Literal" && typeof property.value === "string" ? property.value : undefined
}

/**
 * Reports a functype method read as a value: `list.head` without `()`, `if (opt.isSome)`,
 * `Option(list.head)`, `expect(list.head)`, `const { head } = list`. On functype 2, `head`, `last`,
 * `tail`, `init`, `headOption` and `lastOption` are methods, and such a read compiles wherever any value
 * is accepted: a truthiness check, `??`, a template string, an `unknown` or generic parameter. It
 * yields the method itself, which is always truthy and never the element; and a detached functype
 * method throws when it is called later (#603).
 *
 * Only members that functype declares as methods count, so function-valued data (`Some(fn).value`,
 * a `Ref` holding a callback) is never reported.
 *
 * Type-aware only: without type information it reports nothing.
 */
const rule: Rule.RuleModule = {
  meta: {
    type: "problem",
    docs: {
      description: "Disallow reading a functype method as a value instead of calling it",
      recommended: false,
    },
    schema: [],
    messages: {
      uncalledMethod:
        "`{{name}}` is a method of {{owner}}, so this reads the function itself, not a value. Call it: `{{name}}()`. A detached functype method throws when it's called later; use `.bind()` if you really mean the function",
    },
  },

  create(context) {
    const report = (node: ASTNode, object: ASTNode, name: string): void => {
      const owner = functypeMethodByType(object, name, context)
      if (owner === undefined) return
      context.report({ node, messageId: "uncalledMethod", data: { name, owner } })
    }

    /** `const { head } = list`, `({ head } = list)`, `const { "head": h } = list`. */
    const destructured = (pattern: ASTNode, source: ASTNode): void => {
      if (pattern.type !== "ObjectPattern") return
      for (const property of pattern.properties as ReadonlyArray<ASTNode>) {
        if (property.type !== "Property" || property.computed) continue
        const key = property.key as ASTNode
        const name = key.type === "Identifier" ? key.name : typeof key.value === "string" ? key.value : undefined
        if (name !== undefined) report(property, source, name)
      }
    }

    return {
      MemberExpression(node: ASTNode) {
        const name = memberName(node)
        if (name === undefined || isDeliberateUse(node)) return
        report(node, node.object as ASTNode, name)
      },
      VariableDeclarator(node: ASTNode) {
        if (node.init != null) destructured(node.id as ASTNode, node.init as ASTNode)
      },
      AssignmentExpression(node: ASTNode) {
        if (node.operator === "=") destructured(node.left as ASTNode, node.right as ASTNode)
      },
    }
  },
}

export default rule
