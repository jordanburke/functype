/**
 * Protocol definitions for Do-notation
 * Separated from main Do module to avoid circular dependencies
 */

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
 * The doUnwrap method should return a DoResult indicating success/failure
 * and the contained value or error information
 */
export interface Doable<T> {
  doUnwrap(): DoResult<T>
}

/**
 * @deprecated Use Doable interface instead
 */
export type DoProtocol<T> = Doable<T>
