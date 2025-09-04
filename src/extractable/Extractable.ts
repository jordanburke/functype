import type { Type } from "@/types"

/**
 * Interface for operations that can fail with exceptions.
 * These methods should be used with care as they can throw at runtime.
 *
 * @interface Unsafe
 * @template T The type of value that can be extracted
 */
export interface Unsafe<T extends Type> {
  /**
   * Extract the value or throw an error
   * @param error Optional custom error to throw. If not provided, uses type-appropriate default error
   * @throws {Error} The specified error, container's error, or a sensible default
   * @returns The contained value
   */
  getOrThrow(error?: Error): T
}

/**
 * Extractable type class for data structures that can extract their values
 * with various fallback strategies.
 *
 * This interface is implemented by Option, Either, and other types that
 * wrap values and need both safe and fallible extraction methods.
 *
 * Extends Unsafe to provide exception-throwing operations alongside safe alternatives.
 */
export interface Extractable<T extends Type> extends Unsafe<T> {
  /**
   * Returns the contained value or a default value
   * @param defaultValue - The value to return if extraction fails
   * @returns The contained value or defaultValue
   */
  getOrElse(defaultValue: T): T

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
 * Type guard to check if a value implements Unsafe
 */
export function isUnsafe<T extends Type>(value: unknown): value is Unsafe<T> {
  return value != null && typeof value === "object" && "getOrThrow" in value && typeof value.getOrThrow === "function"
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
