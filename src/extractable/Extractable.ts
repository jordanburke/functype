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
 * Covariance: T is declared `<out T>`. The fallback methods `orElse` and `or`
 * widen the result via `<T2>`, matching Scala's `getOrElse[B1 >: B](default: => B1): B1`
 * shape — when the caller passes a T-typed default the result is just T, and when
 * they pass a wider T2 the result union widens accordingly.
 *
 * Implementers that previously overrode `or`/`orElse` with widened signatures
 * (Option, Either, Try) can inherit from this base directly; their 0.58-era
 * `Omit<Extractable<T>, "or" | "orElse">` workarounds are no longer needed.
 */
export interface Extractable<out T extends Type> extends Unsafe<T> {
  /**
   * Returns the contained value or a default value. The default may be of a
   * different type; the result widens to `T | T2`.
   * @param defaultValue - The value to return if extraction fails
   * @returns The contained value or defaultValue
   */
  orElse<T2 extends Type>(defaultValue: T2): T | T2

  /**
   * Returns this container if it has a value, otherwise returns the alternative container.
   * The alternative may carry a different type; the result widens to `Extractable<T | T2>`.
   * @param alternative - The alternative container
   * @returns This container or the alternative
   */
  or<T2 extends Type>(alternative: Extractable<T2>): Extractable<T | T2>

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
    "orElse" in value &&
    typeof value.orElse === "function" &&
    "or" in value &&
    typeof value.or === "function" &&
    "orNull" in value &&
    typeof value.orNull === "function" &&
    "orUndefined" in value &&
    typeof value.orUndefined === "function"
  )
}
