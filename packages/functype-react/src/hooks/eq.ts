/**
 * Equality comparators for use with `useStable*` hooks.
 *
 * functype core doesn't ship an Eq typeclass; instead, comparators are passed
 * explicitly. The default everywhere is `referenceEq` (Object.is), matching
 * React's built-in dependency comparison.
 */

export type Eq<A> = (a: A, b: A) => boolean

/**
 * Reference equality, identical to React's default `Object.is` for hook deps.
 */
export const referenceEq: Eq<unknown> = Object.is

/**
 * Compares two functype ADTs by their `_tag` literal only.
 *
 * Useful when you only care about variant changes (e.g., re-render when an
 * `Option` flips between Some and None, but not on payload changes). Returns
 * false for non-tagged values.
 */
export const tagEq: Eq<unknown> = (a, b) => {
  if (Object.is(a, b)) return true
  if (typeof a !== "object" || a === null) return false
  if (typeof b !== "object" || b === null) return false
  const ta = (a as { _tag?: unknown })._tag
  const tb = (b as { _tag?: unknown })._tag
  return ta !== undefined && ta === tb
}

/**
 * Recursive structural equality. Handles primitives, arrays, plain objects, and
 * tagged ADTs. Cycles are not detected — passing cyclic structures is undefined
 * behavior. Functions compare by reference.
 */
export const structuralEq: Eq<unknown> = (a, b) => {
  if (Object.is(a, b)) return true
  if (typeof a !== typeof b) return false
  if (a === null || b === null) return false
  if (typeof a !== "object") return false

  if (Array.isArray(a)) {
    if (!Array.isArray(b) || a.length !== b.length) return false
    return a.every((item, i) => structuralEq(item, b[i]))
  }
  if (Array.isArray(b)) return false

  const ka = Object.keys(a as object)
  const kb = Object.keys(b as object)
  if (ka.length !== kb.length) return false
  return ka.every(
    (k) =>
      Object.prototype.hasOwnProperty.call(b, k) &&
      structuralEq((a as Record<string, unknown>)[k], (b as Record<string, unknown>)[k]),
  )
}
