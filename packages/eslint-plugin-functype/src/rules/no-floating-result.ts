import type { Rule } from "eslint"

import type { ASTNode } from "../types/ast"
import { canCarryFailureByType } from "../utils/type-aware"

/** `f()`, `a?.f()`, `await …`, and `ok && f()` / `ok ? f() : g()`: statements whose only job is a value. */
const CHECKED: ReadonlySet<string> = new Set([
  "CallExpression",
  "ChainExpression",
  "AwaitExpression",
  "LogicalExpression",
  "ConditionalExpression",
])

/** Methods that run a callback on the failure, so a chain through one has handled it. */
const FAILURE_HANDLERS: ReadonlySet<string> = new Set(["tapError", "tapLeft"])

/** Methods that can bring in a new failure, so a handler before one no longer covers the result. */
const FAILURE_SOURCES: ReadonlySet<string> = new Set(["flatMap", "chain", "andThen", "flatMapError", "orElse"])

/**
 * Does the call chain in `node` handle its own failure? Walks the receiver chain from the outermost
 * call in: a `.tapError(…)` or `.tapLeft(…)` counts, unless a later `.flatMap(…)` can bring in a new,
 * unlogged failure. Arguments are never walked into.
 */
const handlesItsFailure = (node: ASTNode | undefined): boolean => {
  if (!node) return false
  if (node.type === "AwaitExpression") return handlesItsFailure(node.argument as ASTNode)
  if (node.type === "ChainExpression") return handlesItsFailure(node.expression as ASTNode)
  if (node.type !== "CallExpression") return false
  const callee = node.callee as ASTNode
  if (callee.type !== "MemberExpression") return false
  const property = callee.property as ASTNode
  const name = property.type === "Identifier" ? (property.name as string) : ""
  if (FAILURE_HANDLERS.has(name)) return true
  if (FAILURE_SOURCES.has(name)) return false
  return handlesItsFailure(callee.object as ASTNode)
}

/**
 * Reports a statement that computes an Either, Try or other failure-carrying result and drops it:
 * `await userService.updateSubscription(id, plan)` on its own line, or `parse(input)`. A Left or a
 * Failure in it is silently ignored. `no-floating-promises` doesn't help, because awaiting the promise
 * satisfies it while the result inside is thrown away.
 *
 * Only results that can carry a failure count: an ignored Option or List loses no error. A chain that
 * handles its own failure with `.tapError(…)` or `.tapLeft(…)` isn't reported: that is a best-effort
 * write that logs a failure on purpose, as in agent-todo's audit and cleanup writes. `void result`
 * marks any other deliberate drop. An `IO` that is never run is no-floating-io's.
 *
 * Type-aware only: without type information it reports nothing.
 */
const rule: Rule.RuleModule = {
  meta: {
    type: "problem",
    docs: {
      description: "Disallow dropping an Either, Try or other result that can carry a failure",
      recommended: false,
    },
    schema: [],
    messages: {
      floatingResult:
        "This result is dropped, so a failure in it is silently ignored. Check isLeft() / isFailure(), fold it, or return it. Use void if dropping it is deliberate",
    },
  },

  create(context) {
    return {
      ExpressionStatement(node: ASTNode) {
        const expression = node.expression as ASTNode
        // `void result` is a UnaryExpression, so a deliberate drop never gets this far.
        if (!CHECKED.has(expression.type) || handlesItsFailure(expression)) return
        if (canCarryFailureByType(expression, context))
          context.report({ node: expression, messageId: "floatingResult" })
      },
    }
  },
}

export default rule
