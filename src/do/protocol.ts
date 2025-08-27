/**
 * Protocol definitions for Do-notation
 * Separated from main Do module to avoid circular dependencies
 */

/**
 * Protocol symbol for Do-notation unwrapping
 * All monads that support Do-notation should implement this protocol
 */
export const DO_PROTOCOL = Symbol("functype.do.unwrap")

/**
 * Type for the DO_PROTOCOL symbol
 */
export type DO_PROTOCOL_TYPE = typeof DO_PROTOCOL

/**
 * Result type for Do-notation unwrapping
 * Indicates whether unwrapping succeeded and provides the value or error
 */
export type DoResult<T> =
  | { ok: true; value: T }
  | { ok: false; empty: true } // None/Nil - no error info
  | { ok: false; empty: false; error: unknown } // Left/Failure - has error

/**
 * Interface for types that support Do-notation
 * Implementing this interface allows a type to be yielded in Do-comprehensions
 *
 * Using a mapped type with 'as const' assertion to work around TypeScript's
 * limitation with unique symbols in declaration files (TS4023)
 */
export interface DoProtocol<T> {
  readonly [DO_PROTOCOL]: () => DoResult<T>
}
