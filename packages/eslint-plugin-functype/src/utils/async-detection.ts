import type { ASTNode } from "../types/ast"

/**
 * Detects whether a statement or expression awaits in its own control flow.
 *
 * An `await` inside a nested function (arrow, expression, declaration) belongs to that function, not
 * to the enclosing loop or try block, so the walk stops at function boundaries. That distinction is
 * what makes the answer useful: `try { run(async () => { await x }) }` is a synchronous try block, and
 * `Try(() => ...)` is a correct replacement for it; `try { await x }` is not.
 */

const FUNCTION_BOUNDARIES: ReadonlySet<string> = new Set([
  "ArrowFunctionExpression",
  "FunctionExpression",
  "FunctionDeclaration",
])

const isNode = (value: unknown): value is ASTNode =>
  typeof value === "object" && value !== null && typeof (value as { type?: unknown }).type === "string"

const childNodes = (node: ASTNode): ReadonlyArray<ASTNode> =>
  Object.entries(node)
    .filter(([key]) => key !== "parent")
    .flatMap(([, value]) => (Array.isArray(value) ? value.filter(isNode) : isNode(value) ? [value] : []))

export const containsAwait = (node: ASTNode): boolean => {
  if (!isNode(node)) return false
  if (node.type === "AwaitExpression") return true
  if (node.type === "ForOfStatement" && node.await === true) return true
  if (FUNCTION_BOUNDARIES.has(node.type)) return false
  return childNodes(node).some(containsAwait)
}
