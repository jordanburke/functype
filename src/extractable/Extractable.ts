import type { Type } from "@/types"

/**
 * Extractable type class for data structures that can extract their values
 * with various fallback strategies.
 *
 * This interface is implemented by Option, Either, and other types that
 * wrap values and need safe extraction methods.
 */
export interface Extractable<T extends Type> {
  /**
   * Extracts the value unsafely
   * @throws Error if the container is empty
   * @returns The contained value
   */
  get(): T

  /**
   * Returns the contained value or a default value
   * @param defaultValue - The value to return if extraction fails
   * @returns The contained value or defaultValue
   */
  getOrElse(defaultValue: T): T

  /**
   * Returns the contained value or throws an error
   * @param error - Optional error to throw (implementations may have defaults)
   * @returns The contained value
   * @throws The specified error if extraction fails
   */
  getOrThrow(error?: Error): T

  /**
   * Returns this container if it has a value, otherwise returns the alternative
   * @param alternative - The alternative container
   * @returns This container or the alternative
   */
  orElse(alternative: Extractable<T>): Extractable<T>

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
 * Type guard to check if a value implements ExtractableOption
 */
export function isExtractable<T extends Type>(value: unknown): value is Extractable<T> {
  return (
    value != null &&
    typeof value === "object" &&
    "getOrElse" in value &&
    typeof value.getOrElse === "function" &&
    "getOrThrow" in value &&
    typeof value.getOrThrow === "function" &&
    "get" in value &&
    typeof value.get === "function" &&
    "orElse" in value &&
    typeof value.orElse === "function" &&
    "orNull" in value &&
    typeof value.orNull === "function" &&
    "orUndefined" in value &&
    typeof value.orUndefined === "function"
  )
}
