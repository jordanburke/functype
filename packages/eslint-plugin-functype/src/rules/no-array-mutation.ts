import type { Rule } from "eslint"

import type { ASTNode } from "../types/ast"
import { isMutableArrayExpression } from "../utils/array-mutation"
import { INTEROP_TAG, isInsideTaggedDeclaration } from "../utils/boundary-tags"

/** Array methods that change the array they're called on. */
const MUTATING_METHODS: ReadonlySet<string> = new Set([
  "push",
  "pop",
  "shift",
  "unshift",
  "splice",
  "sort",
  "reverse",
  "fill",
  "copyWithin",
])

/**
 * Is `node` a value nothing else can see yet — `[...xs]`, `xs.slice()`, `Array.from(it)`, `items.map(f)`?
 * Mutating it on the spot (`[...xs].sort(byRank)`) changes no array anyone else holds, so it isn't the
 * shared-state defect this rule is about. Only a named array (a binding or a property) is.
 */
const isFreshValue = (node: ASTNode): boolean =>
  node.type === "ArrayExpression" ||
  node.type === "CallExpression" ||
  node.type === "NewExpression" ||
  (node.type === "AwaitExpression" && isFreshValue(node.argument as ASTNode))

/** The variable or property name of a mutated array, for the message: `rows`, `this.events`, `acc.errors`. */
const nameOf = (node: ASTNode, sourceCode: Rule.RuleContext["sourceCode"]): string => {
  const text = sourceCode.getText(node)
  return text.length > 40 ? `${text.slice(0, 37)}…` : text
}

/**
 * Reports in-place mutation of a mutable array: `push` / `pop` / `shift` / `unshift` / `splice` / `sort` /
 * `reverse` / `fill` / `copyWithin`, assignment to an element (`xs[i] = v`, `xs[i] += 1`, `xs[i]++`),
 * `delete xs[i]`, and setting `length`.
 *
 * This is the mutation itself, wherever the array came from — an inferred `const rows = load()` included,
 * which `prefer-list` can't see because it has no annotation or literal to hook onto. Type-aware only:
 * without type information it reports nothing, so `push` on a custom class or a `Set` is never mistaken
 * for an array. Mutating a fresh copy on the spot (`[...xs].sort(byRank)`) isn't reported: no one else
 * holds that array.
 */
const rule: Rule.RuleModule = {
  meta: {
    type: "problem",
    docs: {
      description: "Disallow changing an array in place — build a new one",
      recommended: true,
    },
    schema: [
      {
        type: "object",
        properties: {
          allowInTests: { type: "boolean", default: true },
          allowInteropMarker: { type: "boolean", default: true },
        },
        additionalProperties: false,
      },
    ],
    messages: {
      mutatingMethod:
        "{{name}}.{{method}}() changes the array in place. Build a new one instead: [...{{name}}, x], map / filter / flatMap / toSorted, a List, or a fold",
      elementAssignment:
        "Assigning to an element of {{name}} changes the array in place. Build a new one instead: {{name}}.with(i, v), map, a List, or a fold",
      lengthAssignment:
        "Setting {{name}}.length changes the array in place. Build a new one instead: {{name}}.slice(0, n), or start from []",
    },
  },

  create(context) {
    const options = context.options[0] || {}
    const allowInTests = options.allowInTests !== false
    const allowInteropMarker = options.allowInteropMarker !== false
    const sourceCode = context.sourceCode

    const isInTestFile = (): boolean => {
      const filename = context.filename
      return (
        /\.(test|spec)\.(ts|js|tsx|jsx)$/.test(filename) ||
        filename.includes("__tests__") ||
        filename.includes("/test/") ||
        filename.includes("/tests/")
      )
    }
    if (allowInTests && isInTestFile()) return {}

    /** `@interop <reason>` on an enclosing declaration marks a host boundary that has to mutate. */
    const isExempt = (node: ASTNode): boolean =>
      allowInteropMarker && isInsideTaggedDeclaration(node, INTEROP_TAG, sourceCode)

    /** `xs[i]` (a computed member) on a named mutable array, or null. */
    const elementTarget = (node: ASTNode | null | undefined): ASTNode | null => {
      if (node?.type !== "MemberExpression") return null
      const array = node.object as ASTNode
      if (isFreshValue(array)) return null
      if (node.computed) return isMutableArrayExpression(array, context) ? array : null
      return null
    }

    /** `xs.length` on a named mutable array, or null. */
    const lengthTarget = (node: ASTNode | null | undefined): ASTNode | null => {
      if (node?.type !== "MemberExpression" || node.computed) return null
      const array = node.object as ASTNode
      if (node.property?.type !== "Identifier" || node.property.name !== "length" || isFreshValue(array)) return null
      return isMutableArrayExpression(array, context) ? array : null
    }

    const reportWrite = (node: ASTNode, target: ASTNode): void => {
      if (isExempt(node)) return
      const element = elementTarget(target)
      if (element) {
        context.report({ node, messageId: "elementAssignment", data: { name: nameOf(element, sourceCode) } })
        return
      }
      const length = lengthTarget(target)
      if (length) {
        context.report({ node, messageId: "lengthAssignment", data: { name: nameOf(length, sourceCode) } })
      }
    }

    return {
      CallExpression(node: ASTNode) {
        const callee = node.callee as ASTNode
        if (callee.type !== "MemberExpression" || callee.computed) return
        const method = callee.property?.type === "Identifier" ? callee.property.name : null
        if (method === null || !MUTATING_METHODS.has(method)) return
        const array = callee.object as ASTNode
        if (isFreshValue(array) || isExempt(node)) return
        if (!isMutableArrayExpression(array, context)) return
        context.report({
          node,
          messageId: "mutatingMethod",
          data: { name: nameOf(array, sourceCode), method },
        })
      },

      AssignmentExpression(node: ASTNode) {
        reportWrite(node, node.left as ASTNode)
      },

      UpdateExpression(node: ASTNode) {
        reportWrite(node, node.argument as ASTNode)
      },

      UnaryExpression(node: ASTNode) {
        if (node.operator === "delete") reportWrite(node, node.argument as ASTNode)
      },
    }
  },
}

export default rule
