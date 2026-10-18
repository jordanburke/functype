import type { Rule } from "eslint"

import type { ASTNode } from "../types/ast"
import { isIOByType } from "../utils/type-aware"

/**
 * Reports an `IO` that is built and then dropped, so it never runs:
 *
 * - an expression statement whose value is an `IO` — `log.info("saved")`, `save(user).tap(audit)`;
 * - `await` on an `IO`. `IO` is not a Promise, so `await io` hands back the `IO` itself, unrun.
 *
 * `no-floating-promises` and `await-thenable` don't see either case, because `IO` is not thenable.
 * Returning, yielding, assigning or passing an `IO` along is fine: someone else runs it. `void io`
 * marks a deliberate drop and isn't reported.
 *
 * Type-aware only: without type information it reports nothing.
 */
const rule: Rule.RuleModule = {
  meta: {
    type: "problem",
    docs: {
      description: "Disallow building an IO and never running it",
      recommended: false,
    },
    schema: [],
    messages: {
      floatingIO:
        "This IO is built and never run, so it does nothing. Run it (.run(), .runOrThrow(), .runExit()), return it, or yield* it inside IO.gen",
      awaitedIO:
        "await on an IO does nothing: IO is not a Promise, so this returns the IO unrun. Await .run() or .runOrThrow() instead",
    },
  },

  create(context) {
    return {
      ExpressionStatement(node: ASTNode) {
        const expression = node.expression as ASTNode
        // `void io` is a deliberate drop; `await io` is reported by the AwaitExpression visitor.
        if (expression.type === "AwaitExpression") return
        if (expression.type === "UnaryExpression" && expression.operator === "void") return
        if (isIOByType(expression, context)) context.report({ node: expression, messageId: "floatingIO" })
      },
      AwaitExpression(node: ASTNode) {
        if (isIOByType(node.argument as ASTNode, context)) context.report({ node, messageId: "awaitedIO" })
      },
    }
  },
}

export default rule
