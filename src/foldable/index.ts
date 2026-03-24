import type { Either } from "@/either/Either"
import { Left, Right } from "@/either/Either"
import { List } from "@/list/List"
import type { Option } from "@/option/Option"
import { None, Some } from "@/option/Option"
import type { Type } from "@/types"

/**
 * Structural type for sum types that support pattern-match fold (Option, Either, Try, etc.).
 * Uses duck typing so any type with the right fold signature works, without requiring a shared interface.
 */
type PatternFoldable<A> = {
  fold<B>(onEmpty: () => B, onValue: (value: A) => B): B
}

/**
 * Utility functions for working with sum-type Foldable data structures.
 * These utilities use pattern-match fold semantics and are designed for
 * sum types (Option, Either, Try) — not collections.
 */
export const FoldableUtils = {
  /**
   * Converts a sum type to an Option
   *
   * @param foldable - The sum type to convert
   * @returns An Option containing the value, or None if empty
   */
  toOption: <A extends Type>(foldable: PatternFoldable<A>): Option<A> => {
    return foldable.fold(
      () => None<A>(),
      (a) => Some<A>(a),
    )
  },

  /**
   * Converts a sum type to a List
   *
   * @param foldable - The sum type to convert
   * @returns A List containing the value(s), or empty List if empty
   */
  toList: <A extends Type>(foldable: PatternFoldable<A>): List<A> => {
    return foldable.fold(
      () => List<A>([]),
      (a) => List<A>([a]),
    )
  },

  /**
   * Converts a sum type to an Either
   *
   * @param foldable - The sum type to convert
   * @param left - The value to use for Left if empty
   * @returns Either.Right with the value if non-empty, or Either.Left with left if empty
   */
  toEither: <A extends Type, E>(foldable: PatternFoldable<A>, left: E): Either<E, A> => {
    return foldable.fold(
      () => Left<E, A>(left),
      (a) => Right<E, A>(a),
    )
  },

  /**
   * Checks if the sum type is empty
   *
   * @param foldable - The sum type to check
   * @returns true if empty, false otherwise
   */
  isEmpty: <A extends Type>(foldable: PatternFoldable<A>): boolean => {
    return foldable.fold(
      () => true,
      () => false,
    )
  },

  /**
   * Calculates the size of the sum type (0 or 1)
   *
   * @param foldable - The sum type to measure
   * @returns The size (0 if empty, 1 if non-empty)
   */
  size: <A extends Type>(foldable: PatternFoldable<A>): number => {
    return foldable.fold(
      () => 0,
      () => 1,
    )
  },
}
