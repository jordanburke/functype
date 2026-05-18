/**
 * ESLint AST Node type alias
 *
 * ESLint's AST node types are complex and not fully typed in the public API.
 * Using `any` is the standard practice for ESLint rule development when working
 * with AST nodes that need dynamic property access.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type ASTNode = any
