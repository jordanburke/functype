import type { Option } from "@/option"
import type { Type } from "@/types"

/**
 * Universal operations that work on any container (single-value or collection).
 * These operations make sense for Option, Either, Try, List, Set, etc.
 *
 * @typeParam A - The type of value(s) in the container
 * @typeParam Self - The container type itself for proper return types
 */
export interface ContainerOps<A extends Type> {
  /**
   * Counts elements that satisfy the predicate.
   * For single-value containers: returns 0 or 1
   * For collections: returns the count of matching elements
   */
  count(p: (x: A) => boolean): number

  /**
   * Finds the first element that satisfies the predicate.
   * For single-value containers: returns Some(value) if predicate matches, None otherwise
   * For collections: returns the first matching element wrapped in Option
   */
  find(p: (a: A) => boolean): Option<A>

  /**
   * Tests whether any element satisfies the predicate.
   * For single-value containers: tests the single value
   * For collections: returns true if any element matches
   */
  exists(p: (a: A) => boolean): boolean

  /**
   * Applies an effect function to each element.
   * For single-value containers: applies to the value if present
   * For collections: applies to each element
   */
  forEach(f: (a: A) => void): void
}

/**
 * Operations specific to collections (List, Set, etc).
 * These operations don't make sense for single-value containers.
 *
 * @typeParam A - The element type
 * @typeParam Self - The collection type itself for proper return types
 */
export interface CollectionOps<A extends Type, Self> {
  /**
   * Drops the first n elements from the collection.
   */
  drop(n: number): Self

  /**
   * Drops the last n elements from the collection.
   */
  dropRight(n: number): Self

  /**
   * Drops elements from the start while the predicate is true.
   */
  dropWhile(p: (a: A) => boolean): Self

  /**
   * Flattens a collection of collections into a single collection.
   */
  flatten<B>(): Self

  /**
   * Gets the first element of the collection.
   */
  get head(): A | undefined

  /**
   * Gets the first element wrapped in Option.
   */
  get headOption(): Option<A>

  /**
   * Converts the collection to an array.
   */
  toArray<B = A>(): readonly B[]
}
