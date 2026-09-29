import type { ASTNode } from "../types/ast"

/**
 * `Wire<T>` declares a value in its serialization-safe shape — a DB row, an HTTP body,
 * a JSONB payload (#325 B). Everything inside its type argument is the wire shape by declaration: a
 * `ReadonlyArray` there is not a missed `List`, and a `T | null` there is not a missed `Option`. Rules
 * that prefer the functype shape skip it, so the boundary is stated once instead of suppressed at every
 * field. Names are configurable (`wireTypes`) for consumers with their own boundary alias.
 */

export const DEFAULT_WIRE_TYPES: ReadonlyArray<string> = ["Wire"]

export const WIRE_TYPES_SCHEMA = {
  type: "array",
  items: { type: "string" },
  default: [...DEFAULT_WIRE_TYPES],
} as const

/** The last segment of an entity name: `Wire` from `Wire` or `functype.Wire`. */
const entityName = (name: ASTNode): string | null => {
  if (name?.type === "Identifier") return name.name
  if (name?.type === "TSQualifiedName" && name.right?.type === "Identifier") return name.right.name
  return null
}

/** `Wire` from `Wire<…>`, `functype.Wire<…>` or `import("functype").Wire<…>`; null otherwise. */
const referenceName = (typeRef: ASTNode): string | null => {
  if (typeRef.type === "TSTypeReference") return entityName(typeRef.typeName)
  if (typeRef.type === "TSImportType") return entityName(typeRef.qualifier)
  return null
}

/** Is `node` inside the type argument of a `Wire<…>` (or other configured wire type) reference? */
export const isInsideWireType = (node: ASTNode, wireTypes: ReadonlyArray<string>): boolean => {
  if (wireTypes.length === 0) return false
  const walk = (current: ASTNode | null | undefined): boolean => {
    const parent = current?.parent
    if (!parent) return false
    if (parent.type === "TSTypeParameterInstantiation" && parent.parent) {
      const name = referenceName(parent.parent)
      if (name !== null && wireTypes.includes(name)) return true
    }
    return walk(parent)
  }
  return walk(node)
}
