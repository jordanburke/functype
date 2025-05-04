export type { Traversable } from "./Traversable"

/**
 * Utility functions for working with Traversable data structures
 */
export const TraversableUtils = {
  /**
   * Helper function to traverse an array with a given applicative function
   *
   * @param arr - The array to traverse
   * @param f - Function mapping elements to an applicative structure
   * @param pure - Function to lift a value into the applicative
   * @param ap - Function to apply a function in an applicative to a value in an applicative
   * @returns The resulting traversable structure
   */
  traverseArray: <A, B, F>(arr: A[], f: (a: A) => F, pure: <T>(t: T) => F, ap: <T, U>(ff: F, fa: F) => F): F => {
    // Implementation depends on the specific applicative structure
    return arr.reduceRight(
      (acc: F, a: A) => {
        const fa = f(a)
        return ap(
          ap(
            pure((b: B) => (bs: B[]) => [b, ...bs]),
            fa,
          ),
          acc,
        )
      },
      pure([] as B[]),
    )
  },

  /**
   * Helper function to sequence an array of applicative structures
   *
   * @param arr - Array of applicative structures
   * @param pure - Function to lift a value into the applicative
   * @param ap - Function to apply a function in an applicative to a value in an applicative
   * @returns The resulting traversable structure
   */
  sequenceArray: <A, F>(arr: F[], pure: <T>(t: T) => F, ap: <T, U>(ff: F, fa: F) => F): F => {
    return TraversableUtils.traverseArray(arr, (x: F) => x, pure, ap)
  },
}
