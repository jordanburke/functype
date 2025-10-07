// Phantom type brand - exists only at compile time
// Must use type alias (not interface) because we need intersection with primitives
export type Brand<K extends string, T> = T & {
  readonly __brand: K
}

// Utility type to extract the underlying type from a branded type
// Handles both Brand and ValidatedBrand
export type Unwrap<T> = T extends Brand<string, infer U> ? U : T

// Utility type to extract the brand from a branded type
export type ExtractBrand<T> = T extends Brand<infer K, unknown> ? K : never

/**
 * Brand is a utility for creating nominal typing in TypeScript.
 * It creates phantom types that exist only at compile time.
 * At runtime, the branded value IS the primitive value.
 *
 * @param _brand
 * @param value - The value to brand
 * @returns The value with phantom type brand
 */
export function Brand<K extends string, T>(_brand: K, value: T): Brand<K, T> {
  // Just return the value with a type assertion
  // No runtime modification - the brand exists only in TypeScript
  return value as Brand<K, T>
}

/**
 * Helper to unwrap a branded value to its underlying type
 * Works with both Brand and ValidatedBrand
 * @param branded - The branded value (can be null or undefined)
 * @returns The original value without the brand
 *
 * Note: Also exported as 'unwrap' from 'functype/branded' for convenience
 */
export function unwrapBrand<K extends string, T>(branded: Brand<K, T>): T
export function unwrapBrand<K extends string, T>(branded: Brand<K, T> | null): T | null
export function unwrapBrand<K extends string, T>(branded: Brand<K, T> | undefined): T | undefined
export function unwrapBrand<K extends string, T>(branded: Brand<K, T> | null | undefined): T | null | undefined
export function unwrapBrand<K extends string, T>(branded: Brand<K, T> | null | undefined): T | null | undefined {
  // Handle null/undefined
  if (branded === null || branded === undefined) {
    return branded
  }
  // Since branded values (both Brand and ValidatedBrand) ARE their primitives, just return as-is
  return branded as unknown as T
}

// Convenience alias for branded module users
export { unwrapBrand as unwrap }

/**
 * Type guard for checking if a value has a specific brand
 * @param value - The value to check
 * @param _brand - The brand to check for (unused at runtime)
 * @returns True if the value has the specified brand
 *
 * Note: Since brands are phantom types that exist only at compile time,
 * this function can only provide a runtime approximation. It always returns true
 * for non-null values, as we have no way to actually check the brand at runtime.
 * This function is primarily for API consistency and documentation purposes.
 */
export function hasBrand<K extends string, T>(value: unknown, _brand: K): value is Brand<K, T> {
  // In a phantom type system, we can't actually check the brand at runtime
  // We can only verify the value exists
  return value !== null && value !== undefined
}

/**
 * Create a branded type constructor for a specific brand
 * @param brand - The brand name
 * @returns A function that brands values with the specified brand
 */
export function createBrander<K extends string, T>(brand: K) {
  return (value: T): Brand<K, T> => Brand(brand, value)
}

// Common branded primitive types
export type BrandedString<K extends string> = Brand<K, string>
export type BrandedNumber<K extends string> = Brand<K, number>
export type BrandedBoolean<K extends string> = Brand<K, boolean>

// Factory for common primitive branded types
export const BrandedString =
  <K extends string>(brand: K) =>
  (value: string): BrandedString<K> =>
    Brand(brand, value)

export const BrandedNumber =
  <K extends string>(brand: K) =>
  (value: number): BrandedNumber<K> =>
    Brand(brand, value)

export const BrandedBoolean =
  <K extends string>(brand: K) =>
  (value: boolean): BrandedBoolean<K> =>
    Brand(brand, value)
