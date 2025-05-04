/**
 * Pattern matching interface for functional data types.
 *
 * @typeParam A - The type of elements in the data structure
 * @typeParam Tags - The type of tags used for pattern matching
 */
export type Matchable<A, Tags extends string = string> = {
  /**
   * Pattern matches against this data structure, applying handlers for each variant based on tag.
   * Similar to fold but with stronger type safety for tag-based variants.
   *
   * The return type is inferred from the pattern handlers when not explicitly specified.
   *
   * @param patterns - An object containing handler functions for each variant
   * @returns The result of applying the matching handler function
   */
  match<R>(patterns: Record<Tags, (value: A) => R>): R
}

/**
 * Utility functions for working with Matchable data structures
 */
export const MatchableUtils = {
  /**
   * Helper function to create a default case for pattern matching
   *
   * @param handler - The default handler function to apply
   * @returns A function that always applies the default handler
   */
  default: <A, R>(handler: (value: A) => R) => {
    return (value: A) => handler(value)
  },

  /**
   * Helper function to create a match pattern that guards based on a predicate
   *
   * @param predicate - The predicate function for guarding
   * @param handler - The handler function to apply if the predicate passes
   * @returns A function that applies the handler only if the predicate passes
   */
  when: <A, R>(predicate: (value: A) => boolean, handler: (value: A) => R) => {
    return (value: A) => (predicate(value) ? handler(value) : undefined)
  },
}
