/**
 * Foldable type class represents data structures that can be folded to a summary value.
 *
 * This interface provides the universal fold operations (foldLeft, foldRight) that work
 * consistently across all data structures. The `fold` method is intentionally excluded
 * because it has different semantics for sum types vs collections:
 * - Sum types (Option, Either, Try): `fold(onEmpty, onValue)` — pattern match
 * - Collections (List, Set, Map): `fold(initial, fn)` — left-reduce accumulator
 *
 * Each type category defines its own `fold` with the appropriate signature.
 *
 * @typeParam A - The type of elements in the data structure
 */
export interface Foldable<out A> {
  /**
   * Left-associative fold using the provided zero value and operation
   * @param z - Zero/identity value
   * @returns A function that takes an operation to apply
   */
  foldLeft<B>(z: B): (op: (b: B, a: A) => B) => B

  /**
   * Right-associative fold using the provided zero value and operation
   * @param z - Zero/identity value
   * @returns A function that takes an operation to apply
   */
  foldRight<B>(z: B): (op: (a: A, b: B) => B) => B
}
