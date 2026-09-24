import type { ASTNode } from "../types/ast"
import { childNodes, isNode } from "./ast-walk"

/**
 * Detects suspension points — `await` and `yield` — in a statement's own control flow.
 *
 * A suspension inside a nested function (arrow, expression, declaration, method) belongs to that
 * function, not to the enclosing loop or try block, so the walk stops at function boundaries. That
 * distinction is what makes the answer useful: `try { run(async () => { await x }) }` is a synchronous
 * try block, and `Try(() => ...)` is a correct replacement for it; `try { await x }` is not. Likewise a
 * loop body that yields cannot become a `.forEach` callback, but one that only defines a generator can.
 */

const FUNCTION_BOUNDARIES: ReadonlySet<string> = new Set([
  "ArrowFunctionExpression",
  "FunctionExpression",
  "FunctionDeclaration",
])

const containsInOwnFlow =
  (matches: (node: ASTNode) => boolean) =>
  (node: ASTNode): boolean => {
    const walk = (n: ASTNode): boolean => {
      if (!isNode(n)) return false
      if (matches(n)) return true
      if (FUNCTION_BOUNDARIES.has(n.type)) return false
      return childNodes(n).some(walk)
    }
    return walk(node)
  }

export const containsAwait = containsInOwnFlow(
  (node) => node.type === "AwaitExpression" || (node.type === "ForOfStatement" && node.await === true),
)

export const containsYield = containsInOwnFlow((node) => node.type === "YieldExpression")
