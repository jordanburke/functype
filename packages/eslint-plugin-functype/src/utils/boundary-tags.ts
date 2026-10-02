import type { SourceCode } from "eslint"

import type { ASTNode } from "../types/ast"

/**
 * Structural exemptions recorded in JSDoc, instead of `eslint-disable` (#241).
 *
 * `@interop <reason>` — the enclosing declaration bridges functype to a host whose contract is the
 * non-FP shape: React's `use()` needs a throw, React Query needs a rejected promise, a hook that converts
 * nullables into `Option` must accept nullables.
 *
 * Bug checks are not tagged: they are `invariant(cond, msg)` calls from functype, which narrow types and
 * cover one statement. (An `@invariant` tag shipped in 1.10.0 and was removed in #342 — it exempted a
 * whole function, including any expected-failure throw added to it later.)
 *
 * Why a tag rather than a disable comment: it covers one declaration (and what is nested inside it), not
 * a whole file; it must carry a reason on the same line, so a bare tag exempts nothing; and it is
 * greppable — `rg '@interop'` is the inventory of every place the code touches a throw-based host.
 */

export const INTEROP_TAG = "interop"

/** Declarations whose leading JSDoc can carry a tag. */
const DOCUMENTABLE: ReadonlySet<string> = new Set([
  "FunctionDeclaration",
  "VariableDeclaration",
  "MethodDefinition",
  "PropertyDefinition",
  "Property",
  "TSTypeAliasDeclaration",
  "TSInterfaceDeclaration",
  "TSPropertySignature",
  "TSMethodSignature",
])

const EXPORT_WRAPPERS: ReadonlySet<string> = new Set(["ExportNamedDeclaration", "ExportDefaultDeclaration"])

/** The JSDoc block (`/** … *\/`) directly before `node`, or before its `export` wrapper. */
const leadingJSDoc = (node: ASTNode, sourceCode: SourceCode): string | null => {
  const anchor = node.parent && EXPORT_WRAPPERS.has(node.parent.type) ? node.parent : node
  const comments = sourceCode.getCommentsBefore(anchor)
  const last = comments[comments.length - 1]
  return last?.type === "Block" && last.value.startsWith("*") ? last.value : null
}

/** `@tag` followed by a reason on the same line. A bare tag carries no reason and exempts nothing. */
const hasTagWithReason = (jsdoc: string, tag: string): boolean =>
  new RegExp(`(^|[\\s*])@${tag}[ \\t]+\\S`, "m").test(jsdoc)

/**
 * Is `node` inside a declaration whose JSDoc carries `@<tag> <reason>`? Every enclosing documentable
 * declaration is checked, so a tag on a function covers the callbacks nested inside it.
 */
export const isInsideTaggedDeclaration = (node: ASTNode, tag: string, sourceCode: SourceCode): boolean => {
  const check = (current: ASTNode | null | undefined): boolean => {
    if (!current) return false
    if (DOCUMENTABLE.has(current.type)) {
      const jsdoc = leadingJSDoc(current, sourceCode)
      if (jsdoc !== null && hasTagWithReason(jsdoc, tag)) return true
    }
    return check(current.parent)
  }
  return check(node)
}
