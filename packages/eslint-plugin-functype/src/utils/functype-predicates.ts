import type { SourceCode } from "eslint"

import type { ASTNode } from "../types/ast"

/** Methods on a monadic value that mean "this is the Some/Right/Success path." */
export const POSITIVE_PREDICATES: ReadonlySet<string> = new Set(["isSome", "isRight", "isSuccess"])
/** Methods that mean "this is the None/Left/Failure path." */
// `isEmpty` is deliberately absent: it is a property on every functype container, never a method, so
// `x.isEmpty()` is not functype code (and on a List, `.fold` is a reduce, not a branch).
export const NEGATIVE_PREDICATES: ReadonlySet<string> = new Set(["isNone", "isLeft", "isFailure"])

/** Source text with all whitespace removed — receivers match however they are line-broken. */
export const compact = (text: string): string => text.replace(/\s+/g, "")

/** A functype predicate call such as `o.isSome()`, split into its receiver and method. */
export type PredicateCall = {
  readonly receiver: ASTNode
  /** The receiver's source text, whitespace removed, for matching against other reads of it. */
  readonly receiverText: string
  readonly method: string
  readonly isNegated: boolean
}

/**
 * `o.isSome()`, `e.isLeft()`, `t.isFailure()` — a zero-argument call of a functype predicate method.
 * A property read (`state.isPending`, `items.isEmpty`) is not a call, so it never matches.
 */
export const predicateCall = (node: ASTNode, sourceCode: SourceCode): PredicateCall | null => {
  if (node?.type !== "CallExpression" || node.arguments.length !== 0) return null
  const callee = node.callee as ASTNode
  if (callee.type !== "MemberExpression" || callee.computed || callee.property.type !== "Identifier") return null
  const method = callee.property.name as string
  const isNegated = NEGATIVE_PREDICATES.has(method)
  if (!isNegated && !POSITIVE_PREDICATES.has(method)) return null
  return { receiver: callee.object, receiverText: compact(sourceCode.getText(callee.object)), method, isNegated }
}

/**
 * The first predicate call a test branches on, looking through `!` (which flips it) and `&&` / `||`:
 * `o.isSome()`, `!o.isSome()`, `loading || o.isNone()`. `isNegated` is the predicate's own meaning
 * with any `!` applied, so `!o.isSome()` reads like `o.isNone()`.
 */
export const testedPredicate = (test: ASTNode, sourceCode: SourceCode): PredicateCall | null => {
  if (test?.type === "UnaryExpression" && test.operator === "!") {
    const inner = testedPredicate(test.argument, sourceCode)
    return inner === null ? null : { ...inner, isNegated: !inner.isNegated }
  }
  if (test?.type === "LogicalExpression" && (test.operator === "&&" || test.operator === "||")) {
    return testedPredicate(test.left, sourceCode) ?? testedPredicate(test.right, sourceCode)
  }
  return predicateCall(test, sourceCode)
}

/** What a test proves about a receiver's value: there, missing, or nothing. */
export type Presence = "present" | "absent" | null

/** `o.isEmpty` read (not called): Option's narrowing property, true when the value is missing. */
const isEmptyRead = (node: ASTNode, receiverText: string, sourceCode: SourceCode): boolean =>
  node?.type === "MemberExpression" &&
  !node.computed &&
  node.property.type === "Identifier" &&
  node.property.name === "isEmpty" &&
  !(node.parent?.type === "CallExpression" && node.parent.callee === node) &&
  compact(sourceCode.getText(node.object)) === receiverText

/**
 * What `test` evaluating to `outcome` proves about `receiverText`. Looks through `!`, `&&` and `||`:
 * `a && b` being true proves whatever either side proves, `a || b` being false likewise, and the other
 * two cases prove something only when both sides agree. `o.isEmpty` counts as a test for absence.
 */
export const provesWhen = (test: ASTNode, outcome: boolean, receiverText: string, sourceCode: SourceCode): Presence => {
  const self = (node: ASTNode, value: boolean): Presence => provesWhen(node, value, receiverText, sourceCode)
  if (test?.type === "UnaryExpression" && test.operator === "!") return self(test.argument, !outcome)
  if (test?.type === "LogicalExpression" && (test.operator === "&&" || test.operator === "||")) {
    const left = self(test.left, outcome)
    const right = self(test.right, outcome)
    // `a && b` true, or `a || b` false: both sides hold that outcome, so either one's proof counts.
    if ((test.operator === "&&") === outcome) return left ?? right
    return left === right ? left : null
  }
  const predicate = predicateCall(test, sourceCode)
  const isAbsenceTest =
    predicate !== null && predicate.receiverText === receiverText
      ? predicate.isNegated
      : isEmptyRead(test, receiverText, sourceCode)
        ? true
        : null
  if (isAbsenceTest === null) return null
  return isAbsenceTest === outcome ? "absent" : "present"
}

/** The functype-react component that renders both cases of the container a predicate belongs to. */
export const MATCH_COMPONENT: Readonly<Record<string, string>> = {
  isSome: "MatchOption",
  isNone: "MatchOption",
  isLeft: "MatchEither",
  isRight: "MatchEither",
  isSuccess: "MatchTry",
  isFailure: "MatchTry",
}
