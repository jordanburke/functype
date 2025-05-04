/**
 * Traversable type class represents data structures that can be traversed
 * while preserving the structure and accumulating effects.
 *
 * It combines the capabilities of Functor and Foldable type classes.
 *
 * @typeParam A - The type of elements in the data structure
 */
export type Traversable<A> = {
  /**
   * Maps each element of the structure to an applicative action, and
   * sequences these actions into a single applicative action that maintains
   * the original structure.
   *
   * @typeParam B - The type of elements in the resulting structure
   * @typeParam F - The type of the applicative functor
   * @param f - Function mapping elements to an applicative structure
   * @returns A new structure with the results of applying f to each element
   */
  traverse<B, F, FB>(f: (a: A) => FB): FB

  /**
   * Sequences a structure of applicative actions into a single applicative
   * action that maintains the original structure.
   *
   * @typeParam F - The type of the applicative functor
   * @returns A new structure where each inner applicative structure is "flipped"
   */
  sequence<F, FA>(): FA
}
