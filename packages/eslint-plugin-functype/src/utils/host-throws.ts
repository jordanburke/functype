import type { Rule } from "eslint"

import type { ASTNode } from "../types/ast"

/**
 * Router helpers whose return value a loader or route guard throws to redirect or show Not found
 * (#445). The throw is the framework's API, not an error path: returning `Either.left(…)` instead
 * breaks it. Each name was checked against the package's exports on 2026-10-31. React Router 6 loaders
 * import from react-router-dom, and Remix on Workers from @remix-run/cloudflare.
 */
export const DEFAULT_HOST_THROWS: Readonly<Record<string, ReadonlyArray<string>>> = {
  "@tanstack/react-router": ["redirect", "notFound"],
  "@tanstack/router-core": ["redirect", "notFound"],
  "react-router": ["redirect", "redirectDocument", "replace", "data"],
  "react-router-dom": ["redirect", "redirectDocument", "replace", "data", "json"],
  "@remix-run/node": ["redirect", "redirectDocument", "replace", "data", "json"],
  "@remix-run/cloudflare": ["redirect", "redirectDocument", "replace", "data", "json"],
}

export const HOST_THROWS_SCHEMA = {
  type: "object",
  additionalProperties: { type: "array", items: { type: "string" } },
} as const

/**
 * The defaults with a project's own `hostThrows` added: naming a module adds helpers to its defaults,
 * so `{ "react-router": ["myRedirect"] }` keeps `redirect` and the rest, and `[]` turns that module's
 * defaults off. A module the defaults don't name is added.
 */
export const hostThrowsWith = (
  overrides: Readonly<Record<string, ReadonlyArray<string>>> | undefined,
): ReadonlyMap<string, ReadonlySet<string>> => {
  const modules = new Set([...Object.keys(DEFAULT_HOST_THROWS), ...Object.keys(overrides ?? {})])
  return new Map(
    [...modules].map((module) => {
      const added = overrides?.[module]
      const names =
        added !== undefined && added.length === 0 ? [] : [...(DEFAULT_HOST_THROWS[module] ?? []), ...(added ?? [])]
      return [module, new Set(names)]
    }),
  )
}

type ImportDef = {
  readonly type: string
  readonly node: ASTNode
  readonly parent?: ASTNode | null
}

/** The import an identifier is bound to, through scope, so a local helper of the same name isn't one. */
function importOf(identifier: ASTNode, context: Rule.RuleContext): ImportDef | undefined {
  const variable = context.sourceCode
    .getScope(identifier)
    .references.find((reference) => reference.identifier === identifier)?.resolved
  const def = variable?.defs[0] as unknown as ImportDef | undefined
  return def?.type === "ImportBinding" ? def : undefined
}

/** The name a specifier imports: `redirect` for `import { redirect as go }`. */
const importedName = (specifier: ASTNode): string | undefined =>
  specifier.type === "ImportSpecifier"
    ? (specifier.imported.name ?? specifier.imported.value)
    : specifier.type === "ImportDefaultSpecifier"
      ? "default"
      : undefined

/**
 * Is `argument`, the value a `throw` throws, a call to a host helper? `throw redirect(…)` and
 * `throw notFound()` with the name imported from a listed module, under any local name, or
 * `throw Router.redirect(…)` through a namespace import of one.
 */
export function isHostThrow(
  argument: ASTNode | null | undefined,
  hostThrows: ReadonlyMap<string, ReadonlySet<string>>,
  context: Rule.RuleContext,
): boolean {
  if (argument?.type !== "CallExpression") return false
  const callee = argument.callee as ASTNode
  if (callee.type === "Identifier") {
    const def = importOf(callee, context)
    const module = def?.parent?.source?.value as string | undefined
    const name = def ? importedName(def.node) : undefined
    return module !== undefined && name !== undefined && hostThrows.get(module)?.has(name) === true
  }
  if (callee.type !== "MemberExpression" || callee.computed || callee.object.type !== "Identifier") return false
  const def = importOf(callee.object as ASTNode, context)
  if (def?.node.type !== "ImportNamespaceSpecifier") return false
  const module = def.parent?.source?.value as string | undefined
  return module !== undefined && hostThrows.get(module)?.has(callee.property.name) === true
}
