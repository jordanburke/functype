import type { Type } from "@/types"

/**
 * Interface for operations that can fail with exceptions.
 * These methods should be used with care as they can throw at runtime.
 *
 * @interface Unsafe
 * @template T The type of value that can be extracted
 */
export interface Unsafe<out T extends Type> {
  /**
   * Extract the value or throw an error
   * @param error Optional custom error to throw. If not provided, uses type-appropriate default error
   * @throws {Error} The specified error, container's error, or a sensible default
   * @returns The contained value
   */
  orThrow(error?: Error): T
}

/**
 * Extractable type class for data structures that can extract their values
 * with various fallback strategies.
 *
 * Covariance: T is declared `<out T>`. The fallback methods `getOrElse` and `orElse`
 * widen the result via `<T2>`, matching Scala's `getOrElse[B1 >: B](default: => B1): B1`
 * shape — when the caller's default returns a T the result is just T, and when it
 * returns a wider T2 the result union widens accordingly.
 *
 * Both fallbacks are lazy: they take a function, which runs only when the container
 * has no value. This is Scala's by-name parameter written as a thunk, as Effect and
 * fp-ts do.
 */
export interface Extractable<out T extends Type> extends Unsafe<T> {
  /**
   * Returns the contained value, or calls `defaultValue` if there is none. The default is
   * lazy. It is typed against `T` first, so a default that fits `T` keeps `T` and a literal
   * union is not widened to `string`. A default of another type widens the result to `T | T2`.
   * @param defaultValue - A function that returns the value to use if extraction fails
   * @returns The contained value or the default
   */
  getOrElse<T2 extends Type = never>(defaultValue: () => T | T2): T | T2

  /**
   * Returns this container if it has a value, otherwise calls `alternative` for another container.
   * The alternative is lazy, and may carry a different type; the result widens to `Extractable<T | T2>`.
   * @param alternative - A function that returns the container to use if this one has no value
   * @returns This container or the alternative
   */
  orElse<T2 extends Type>(alternative: () => Extractable<T2>): Extractable<T | T2>

  /**
   * Returns the contained value or null
   * @returns The contained value or null
   */
  orNull(): T | null

  /**
   * Returns the contained value or undefined
   * @returns The contained value or undefined
   */
  orUndefined(): T | undefined
}

/**
 * Type guard to check if a value implements Unsafe
 */
export function isUnsafe<T extends Type>(value: unknown): value is Unsafe<T> {
  return value != null && typeof value === "object" && "orThrow" in value && typeof value.orThrow === "function"
}

/**
 * Type guard to check if a value implements Extractable
 */
export function isExtractable<T extends Type>(value: unknown): value is Extractable<T> {
  return (
    isUnsafe<T>(value) &&
    "getOrElse" in value &&
    typeof value.getOrElse === "function" &&
    "orElse" in value &&
    typeof value.orElse === "function" &&
    "orNull" in value &&
    typeof value.orNull === "function" &&
    "orUndefined" in value &&
    typeof value.orUndefined === "function"
  )
}
