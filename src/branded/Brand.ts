/**
 * Brand is a utility for creating nominal typing in TypeScript
 * It allows for creating distinct types that are structurally identical
 * but considered different by TypeScript's type system
 */

// The brand symbol type with instance methods
export type Brand<K extends string, T> = T & {
  readonly __brand: K
  readonly unbrand: () => T
  readonly unwrap: () => T
}

// Utility type to extract the underlying type from a branded type
export type Unbrand<T> = T extends Brand<string, infer U> ? U : never

// Utility type to extract the brand from a branded type
export type ExtractBrand<T> = T extends Brand<infer K, unknown> ? K : never

/**
 * Helper to create a branded type with instance methods
 * @param brand - The brand name
 * @param value - The value to brand
 * @returns The branded value with unbrand/unwrap methods
 */
export function Brand<K extends string, T>(brand: K, value: T): Brand<K, T> {
  const branded = value as Brand<K, T>
  return Object.assign(branded, {
    unbrand(): T {
      return value
    },
    unwrap(): T {
      return value
    },
    toString(): string {
      return `${brand}(${String(value)})`
    },
  })
}

/**
 * Helper to remove a brand from a value
 * @param branded - The branded value
 * @returns The original value without the brand
 */
export function unbrand<T>(branded: Brand<string, T>): T {
  return branded.unbrand()
}

/**
 * Type guard for checking if a value has a specific brand
 * @param value - The value to check
 * @param brand - The brand to check for
 * @returns True if the value has the specified brand
 *
 * Note: Since brands are phantom types that exist only at compile time,
 * this function can only provide a runtime approximation. It always returns true
 * for non-null values, as we have no way to actually check the brand at runtime.
 * This function is primarily for API consistency and documentation purposes.
 */
export function hasBrand<K extends string, T>(value: unknown, brand: K): value is Brand<K, T> {
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
