/**
 * Merges two objects into a single object with the combined type.
 *
 * @param object1 - The base object to merge into
 * @param object2 - The object whose properties will be added
 * @returns The merged object with type O1 & O2
 *
 * @remarks
 * Uses Object.assign internally which mutates the first object. The eslint-disable
 * for functional/immutable-data is intentional here because:
 * 1. This is a low-level utility for creating Companion objects efficiently
 * 2. The mutation is contained - callers receive the merged result as a new combined type
 * 3. Copying would add unnecessary overhead for this foundational operation
 *
 * @example
 * const base = { a: 1 }
 * const extra = { b: 2 }
 * const merged = mergeObjects(base, extra)
 * // merged: { a: number } & { b: number }
 */
export function mergeObjects<O1 extends object, O2 extends object>(object1: O1, object2: O2): O1 & O2 {
  // eslint-disable-next-line functional/immutable-data -- see JSDoc remarks
  return Object.assign(object1, object2)
}
