/**
 * Protocol definitions for Do-notation
 * Separated from main Do module to avoid circular dependencies
 */

/**
 * Protocol symbol for Do-notation unwrapping
 * All monads that support Do-notation should implement this protocol
 */
export const DO_PROTOCOL = Symbol.for("functype.do.unwrap")

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
 */
export interface DoProtocol<T> {
  [DO_PROTOCOL](): DoResult<T>
}
