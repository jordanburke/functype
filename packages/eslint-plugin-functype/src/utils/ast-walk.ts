import type { ASTNode } from "../types/ast"

/**
 * Generic ESTree child traversal for rules that need to look inside a subtree without a visitor.
 * `parent` is skipped (it points up, not down); `loc`/`range`/tokens are plain data, not nodes.
 */

export const isNode = (value: unknown): value is ASTNode =>
  typeof value === "object" && value !== null && typeof (value as { type?: unknown }).type === "string"

export const childNodes = (node: ASTNode): ReadonlyArray<ASTNode> =>
  Object.entries(node)
    .filter(([key]) => key !== "parent")
    .flatMap(([, value]) => (Array.isArray(value) ? value.filter(isNode) : isNode(value) ? [value] : []))

/** Every node in the subtree rooted at `node`, root included. */
export const descendants = (node: ASTNode): ReadonlyArray<ASTNode> => [node, ...childNodes(node).flatMap(descendants)]
