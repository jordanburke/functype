import type { Either } from "@/either/Either"
import { Left, Right } from "@/either/Either"
import type { Foldable } from "@/foldable/Foldable"
import { List } from "@/list/List"
import type { Option } from "@/option/Option"
import { None, Some } from "@/option/Option"
import type { Type } from "@/types"

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
