/**
 * Helper types for working with the Companion pattern
 * @module CompanionTypes
 */

/**
 * Extracts the companion methods type from a Companion object
 * @typeParam T - The Companion type
 * @example
 * ```typescript
 * type OptionCompanionMethods = CompanionMethods<typeof Option>
 * // { from: ..., none: ..., fromJSON: ..., etc. }
 * ```
 */
export type CompanionMethods<T> = T extends ((...args: never[]) => unknown) & infer C ? C : never

/**
 * Extracts the instance type from a constructor function
 * @typeParam T - The constructor function type
 * @example
 * ```typescript
 * type OptionInstance = InstanceType<typeof Option>
 * // Option<T>
 * ```
 */
export type InstanceType<T> = T extends (...args: infer Args) => infer R
  ? R extends (...args: unknown[]) => unknown
    ? ReturnType<R>
    : R
  : never

/**
 * Type guard to check if a value is a Companion object (has both constructor and companion methods)
 * @param value - The value to check
 * @returns True if value is a Companion object
 */
export const isCompanion = (value: unknown): value is ((...args: never[]) => unknown) & Record<string, unknown> =>
  typeof value === "function" && Object.keys(value).length > 0
