import { Either, Left, Right } from "@/either/Either"
import type { Type } from "@/functor"
import { List } from "@/list/List"
import { None, Option, Some } from "@/option/Option"

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

/**
 * Utility functions for working with Foldable data structures
 */
export const FoldableUtils = {
  /**
   * Converts a Foldable to an Option
   *
   * @param foldable - The foldable structure to convert
   * @returns An Option containing the value, or None if empty
   */
  toOption: <A extends Type>(foldable: Foldable<A>): Option<A> => {
    return foldable.fold(
      () => None<A>(),
      (a) => Some<A>(a),
    )
  },

  /**
   * Converts a Foldable to a List
   *
   * @param foldable - The foldable structure to convert
   * @returns A List containing the value(s), or empty List if empty
   */
  toList: <A extends Type>(foldable: Foldable<A>): List<A> => {
    return foldable.fold(
      () => List<A>([]),
      (a) => List<A>([a]),
    )
  },

  /**
   * Converts a Foldable to an Either
   *
   * @param foldable - The foldable structure to convert
   * @param left - The value to use for Left if empty
   * @returns Either.Right with the value if non-empty, or Either.Left with left if empty
   */
  toEither: <A extends Type, E>(foldable: Foldable<A>, left: E): Either<E, A> => {
    return foldable.fold(
      () => Left<E, A>(left),
      (a) => Right<E, A>(a),
    )
  },

  /**
   * Checks if the Foldable is empty
   *
   * @param foldable - The foldable structure to check
   * @returns true if empty, false otherwise
   */
  isEmpty: <A extends Type>(foldable: Foldable<A>): boolean => {
    return foldable.fold(
      () => true,
      () => false,
    )
  },

  /**
   * Calculates the size of the Foldable
   *
   * @param foldable - The foldable structure to measure
   * @returns The size (number of elements)
   */
  size: <A extends Type>(foldable: Foldable<A>): number => {
    return foldable.fold(
      () => 0,
      () => 1,
    )
  },
}
