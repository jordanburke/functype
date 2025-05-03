/**
 * Foldable type class represents data structures that can be folded to a summary value.
 *
 * @typeParam A - The type of elements in the data structure
 */
export type Foldable<A> = {
  /**
   * Pattern matches over the structure, applying specific handlers for each variant
   * @param onEmpty - Function to apply if the structure is empty or has no value
   * @param onValue - Function to apply if the structure has a value
   * @returns The result of applying the appropriate function
   */
  fold<B>(onEmpty: () => B, onValue: (value: A) => B): B

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
