import type { Type } from "@/types"

/**
 * Promisable trait - supports conversion to Promise
 *
 * Represents containers or values that can be converted to Promise form.
 * This enables integration with async/await patterns and Promise-based APIs
 * while maintaining functional programming principles.
 *
 * @template A - The type of value contained within the Promise
 *
 * @example
 * ```typescript
 * const either: Either<string, number> = Right(42)
 * const promise: Promise<number> = either.toPromise()
 * // Promise resolves with 42
 *
 * const leftEither: Either<string, number> = Left("error")
 * const failedPromise: Promise<number> = leftEither.toPromise()
 * // Promise rejects with "error"
 * ```
 */
export interface Promisable<A extends Type> {
  /**
   * Converts this container to a Promise
   *
   * The behavior depends on the implementing container:
   * - Success/Right/Some containers resolve with their value
   * - Failure/Left/None containers reject with their error/default error
   *
   * @returns A Promise that resolves or rejects based on the container's state
   */
  toPromise(): Promise<A>
}
