import type { Rule, Scope } from "eslint"

import type { ASTNode } from "../types/ast"
import { functypeValueByType } from "../utils/type-aware"

/** Casts that hide a value's type from TypeScript: `x as T`, `<T>x`. */
const ERASING: ReadonlySet<string> = new Set(["TSAsExpression", "TSTypeAssertion"])

/** Wrappers that keep a value's type: `x!`, `x satisfies T`, `a?.b`. */
const TRANSPARENT: ReadonlySet<string> = new Set(["TSNonNullExpression", "TSSatisfiesExpression", "ChainExpression"])

/** Calls that change their first argument: `Object.assign(target, …)`, `Reflect.set(target, …)`. */
const TARGET_FIRST: Readonly<Record<string, ReadonlySet<string>>> = {
  Object: new Set(["assign", "defineProperty", "defineProperties", "setPrototypeOf"]),
  Reflect: new Set(["set", "defineProperty", "deleteProperty", "setPrototypeOf"]),
}

/**
 * Methods that change the array, Set or Map they're called on. Through a cast, they change the data a
 * container holds: `(list as any).value.push(9)`.
 */
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
  "add",
  "set",
  "delete",
  "clear",
])

/** Names the global object goes by: `globalThis.Object.assign(…)`. */
const GLOBALS: ReadonlySet<string> = new Set(["globalThis", "window", "self", "global"])

const keyName = (member: ASTNode): string | undefined => {
  const property = member.property as ASTNode
  if (!member.computed && property.type === "Identifier") return property.name
  return member.computed && property.type === "Literal" && typeof property.value === "string"
    ? property.value
    : undefined
}

/** `Object` or `Reflect`, also reached as `globalThis.Object`. */
const namespaceName = (node: ASTNode): string | undefined => {
  if (node.type === "Identifier") return node.name
  if (node.type !== "MemberExpression") return undefined
  const object = node.object as ASTNode
  return object.type === "Identifier" && GLOBALS.has(object.name) ? keyName(node) : undefined
}

const isTargetFirstCall = (call: ASTNode): boolean => {
  const callee = call.callee as ASTNode
  if (callee.type !== "MemberExpression") return false
  const namespace = namespaceName(callee.object as ASTNode)
  const method = keyName(callee)
  return namespace !== undefined && method !== undefined && (TARGET_FIRST[namespace]?.has(method) ?? false)
}

/** The member expressions a destructuring or loop target writes to: `(list as any).x` in `({ a: (list as any).x } = o)`. */
const memberTargets = (pattern: ASTNode | null | undefined): ReadonlyArray<ASTNode> => {
  if (pattern === null || pattern === undefined) return []
  switch (pattern.type) {
    case "MemberExpression":
      return [pattern]
    case "ObjectPattern":
      return (pattern.properties as ReadonlyArray<ASTNode>).flatMap((p) =>
        memberTargets(p.type === "RestElement" ? (p.argument as ASTNode) : (p.value as ASTNode)),
      )
    case "ArrayPattern":
      return (pattern.elements as ReadonlyArray<ASTNode | null>).flatMap((e) => memberTargets(e))
    case "RestElement":
      return memberTargets(pattern.argument as ASTNode)
    case "AssignmentPattern":
      return memberTargets(pattern.left as ASTNode)
    default:
      return ERASING.has(pattern.type) || TRANSPARENT.has(pattern.type)
        ? memberTargets(pattern.expression as ASTNode)
        : []
  }
}

/**
 * Reports a write to a functype value that TypeScript can't see. The types mark every field read-only,
 * so such a write needs the value's type hidden: an `as` cast, or a variable that holds one
 * (`const o = list as any; o.x = 1`). The rule reports:
 *
 * - an assignment, compound assignment, `++`/`--`, `delete`, destructuring or `for…of`/`for…in` target
 *   whose path starts from a functype value held under a hiding cast; and
 * - a mutating method (`push`, `splice`, `sort`, `add`, `set`, `delete`, `clear` and the like) called on
 *   data reached through such a value: `(list as any).value.push(9)`; and
 * - `Object.assign`, `Object.defineProperty(ies)`, `Object.setPrototypeOf` and the matching `Reflect`
 *   calls aimed at a functype value, cast or not, since those compile without one.
 *
 * A write that compiles without a cast is left alone: it is to a field of your own type, or to the data a
 * container holds (an Option's payload, a List element's own field), which the container doesn't own.
 * Only values whose `fold` functype declares count. Type-aware only: without type information it reports
 * nothing. It can't see a value passed to an `any` parameter and written there, or plain JavaScript.
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
    const findVariable = (scope: Scope.Scope | null, name: string): Scope.Variable | undefined =>
      scope === null ? undefined : (scope.set.get(name) ?? findVariable(scope.upper, name))

    /** The one value a variable ever holds: the initialiser of a variable written only where it's declared. */
    const soleValue = (identifier: ASTNode): { readonly init: ASTNode; readonly erased: boolean } | undefined => {
      const variable = findVariable(context.sourceCode.getScope(identifier as never), identifier.name)
      const definition = variable?.defs[0]
      if (variable === undefined || variable.defs.length !== 1 || definition?.type !== "Variable") return undefined
      const declarator = definition.node as unknown as ASTNode
      if (declarator.id?.type !== "Identifier" || declarator.init == null) return undefined
      if (variable.references.filter((r) => r.isWrite()).length > 1) return undefined
      // `const o: any = list` hides the type as a cast does.
      const annotation = (declarator.id.typeAnnotation as ASTNode | undefined)?.typeAnnotation as ASTNode | undefined
      const erased = annotation?.type === "TSAnyKeyword" || annotation?.type === "TSUnknownKeyword"
      return { init: declarator.init as ASTNode, erased }
    }

    /**
     * The functype value a written path starts from, if it was hidden from TypeScript on the way: `list`
     * in `(list as any).value[0]`, or in `o.x` after `const o = list as any`.
     */
    const hiddenRoot = (node: ASTNode, erased: boolean, depth = 0): string | undefined => {
      if (depth > 10) return undefined
      if (ERASING.has(node.type)) return hiddenRoot(node.expression as ASTNode, true, depth + 1)
      if (TRANSPARENT.has(node.type)) return hiddenRoot(node.expression as ASTNode, erased, depth + 1)
      const name = functypeValueByType(node, context)
      if (name !== undefined) return erased ? name : undefined
      if (node.type === "MemberExpression") return hiddenRoot(node.object as ASTNode, erased, depth + 1)
      if (node.type !== "Identifier") return undefined
      const held = soleValue(node)
      return held === undefined ? undefined : hiddenRoot(held.init, erased || held.erased, depth + 1)
    }

    /**
     * The functype value a call's target is, cast or not: `list` in `Object.assign(list, …)` or
     * `Object.assign(o, …)` after `const o = list`. A member of one counts only when a cast hides it, so
     * `Object.assign(opt.value, …)` on an Option's payload is left alone, as `opt.value.n = 1` is.
     */
    const targetRoot = (node: ASTNode, depth = 0): string | undefined => {
      if (depth > 10) return undefined
      if (ERASING.has(node.type) || TRANSPARENT.has(node.type)) return targetRoot(node.expression as ASTNode, depth + 1)
      const name = functypeValueByType(node, context)
      if (name !== undefined) return name
      if (node.type === "MemberExpression") return hiddenRoot(node, false, depth + 1)
      if (node.type !== "Identifier") return undefined
      const held = soleValue(node)
      return held === undefined ? undefined : targetRoot(held.init, depth + 1)
    }

    const report = (node: ASTNode, name: string | undefined): void => {
      if (name !== undefined) context.report({ node, messageId: "mutation", data: { name } })
    }

    /** A written member: `(list as any).x` writes into whatever `(list as any)` is. */
    const checkMember = (write: ASTNode, target: ASTNode): void => {
      const member = TRANSPARENT.has(target.type) || ERASING.has(target.type) ? (target.expression as ASTNode) : target
      if (member.type === "MemberExpression") report(write, hiddenRoot(member.object as ASTNode, false))
    }

    const checkPattern = (write: ASTNode, pattern: ASTNode): void => {
      memberTargets(pattern).forEach((target) => checkMember(write, target))
    }

    return {
      AssignmentExpression(node: ASTNode) {
        checkPattern(node, node.left as ASTNode)
      },
      UpdateExpression(node: ASTNode) {
        checkMember(node, node.argument as ASTNode)
      },
      UnaryExpression(node: ASTNode) {
        if (node.operator === "delete") checkMember(node, node.argument as ASTNode)
      },
      "ForOfStatement, ForInStatement"(node: ASTNode) {
        const left = node.left as ASTNode
        if (left.type !== "VariableDeclaration") checkPattern(node, left)
      },
      CallExpression(node: ASTNode) {
        const callee = node.callee as ASTNode
        // Object.* and Reflect.* first: `Reflect.set` is a target-first call, not a Map's `set`.
        if (callee.type === "MemberExpression" && !isTargetFirstCall(node)) {
          const method = keyName(callee)
          if (method !== undefined && MUTATING_METHODS.has(method)) {
            report(node, hiddenRoot(callee.object as ASTNode, false))
            return
          }
        }
        const [first] = node.arguments as ReadonlyArray<ASTNode>
        if (first !== undefined && first.type !== "SpreadElement" && isTargetFirstCall(node)) {
          report(node, targetRoot(first))
        }
      },
    }
  },
}

export default rule
