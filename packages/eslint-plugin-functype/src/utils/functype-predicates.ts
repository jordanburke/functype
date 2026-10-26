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

/** The functype-react component that renders both cases of the container a predicate belongs to. */
export const MATCH_COMPONENT: Readonly<Record<string, string>> = {
  isSome: "MatchOption",
  isNone: "MatchOption",
  isLeft: "MatchEither",
  isRight: "MatchEither",
  isSuccess: "MatchTry",
  isFailure: "MatchTry",
}
