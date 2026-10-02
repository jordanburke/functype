import type { Scope, SourceCode } from "eslint"

import type { ASTNode } from "../types/ast"

/**
 * What `Map` / `Set` means at a use site (#350). Deciding from the file's import list was wrong both ways:
 * `import { Map as FMap } from "functype"` silenced the whole file even though the bare `Map` there is still
 * the native one. Resolving the identifier through scope asks the question that matters.
 *
 * - `functype` — it is functype's import (under any local name), so there is nothing to report;
 * - `shadowed` — a local declaration or a non-functype import, so it isn't the native collection;
 * - `native`   — unresolved, or a global / lib binding with no declaration: the built-in.
 */
export type CollectionBinding = "native" | "functype" | "shadowed"

const isFunctypeSource = (value: unknown): boolean =>
  typeof value === "string" && (value === "functype" || value.startsWith("functype/"))

const resolve = (node: ASTNode, name: string, sourceCode: SourceCode): Scope.Variable | null => {
  const lookup = (scope: Scope.Scope | null): Scope.Variable | null =>
    scope === null ? null : (scope.set.get(name) ?? lookup(scope.upper))
  return lookup(sourceCode.getScope(node))
}

export const bindingOf = (node: ASTNode, name: string, sourceCode: SourceCode): CollectionBinding => {
  const variable = resolve(node, name, sourceCode)
  if (variable === null || variable.defs.length === 0) return "native"
  const def = variable.defs[0] as unknown as { readonly type: string; readonly parent?: ASTNode }
  if (def.type === "ImportBinding") return isFunctypeSource(def.parent?.source?.value) ? "functype" : "shadowed"
  return "shadowed"
}

/**
 * The name this file already uses for functype's `name`: `"FMap"` for `import { Map as FMap }`,
 * `"F.Map"` for `import * as F`, or null when it isn't imported (so the fix must add the import).
 */
export const functypeLocalName = (sourceCode: SourceCode, name: string): string | null => {
  const names = (sourceCode.ast.body as ReadonlyArray<ASTNode>)
    .filter((n) => n.type === "ImportDeclaration" && isFunctypeSource(n.source?.value))
    .flatMap((decl) => (decl.specifiers ?? []) as ReadonlyArray<ASTNode>)
    .flatMap((spec): ReadonlyArray<string> => {
      if (spec.type === "ImportSpecifier" && spec.imported?.type === "Identifier" && spec.imported.name === name) {
        return [spec.local.name]
      }
      if (spec.type === "ImportNamespaceSpecifier") return [`${spec.local.name}.${name}`]
      return []
    })
  return names[0] ?? null
}
