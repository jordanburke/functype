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
 * Recursive structural equality. Handles primitives, arrays, plain objects, tagged ADTs, `Date`,
 * `Error`, `RegExp`, `Map` and `Set` (whose members compare by reference). Any other object with no
 * enumerable own keys, such as a URL, is equal only to itself. Two objects with different prototypes are never equal. Cycles are not detected — passing
 * cyclic structures is undefined behavior. Functions compare by reference.
 *
 * functype values keep only their data as own properties (functype 2.0), so the walk below sees
 * `_tag` and `value`. A `Date` or `Error` has no enumerable own keys, so it gets compared first;
 * otherwise `Some(new Date(0))` and `Some(new Date(1))` would look equal.
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
  if (Object.getPrototypeOf(a) !== Object.getPrototypeOf(b)) return false

  if (a instanceof Date) return a.getTime() === (b as Date).getTime()
  if (a instanceof RegExp) return a.source === (b as RegExp).source && a.flags === (b as RegExp).flags
  if (a instanceof Map) {
    const m = b as ReadonlyMap<unknown, unknown>
    return a.size === m.size && [...a].every(([k, v]) => m.has(k) && structuralEq(v, m.get(k)))
  }
  if (a instanceof Set) {
    const set = b as ReadonlySet<unknown>
    return a.size === set.size && [...a].every((item) => set.has(item))
  }
  if (a instanceof Error) {
    const e = b as Error
    if (a.name !== e.name || a.message !== e.message || !structuralEq(a.cause, e.cause)) return false
  }

  const ka = Object.keys(a as object)
  // Any other built-in, such as a URL, keeps its state where the key walk can't see it, and was
  // already found not to be the same reference. Call it unequal, the safe direction for a hook.
  const proto: unknown = Object.getPrototypeOf(a)
  if (ka.length === 0 && proto !== Object.prototype && proto !== null && !(a instanceof Error)) return false
  const kb = Object.keys(b as object)
  if (ka.length !== kb.length) return false
  return ka.every(
    (k) =>
      Object.prototype.hasOwnProperty.call(b, k) &&
      structuralEq((a as Record<string, unknown>)[k], (b as Record<string, unknown>)[k]),
  )
}
