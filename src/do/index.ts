/**
 * Generator-based Do-notation for monadic comprehensions
 * Provides Scala-like for-comprehension syntax using JavaScript generators
 * @module Do
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
export type DoResult<T> = { ok: true; value: T } | { ok: false; error: unknown; recoverable?: boolean }

/**
 * Interface for types that support Do-notation
 * Implementing this interface allows a type to be yielded in Do-comprehensions
 */
export interface DoProtocol<T> {
  [DO_PROTOCOL](): DoResult<T>
}

/**
 * Error thrown when attempting to unwrap a None value in Do-notation
 */
export const NoneError = (message = "Cannot unwrap None in Do-notation"): Error => {
  const error = new Error(message)
  error.name = "NoneError"
  return error
}

/**
 * Error thrown when attempting to unwrap a Left value in Do-notation
 */
export interface LeftErrorType<L> extends Error {
  readonly value: L
}

export const LeftError = <L>(value: L, message = "Cannot unwrap Left in Do-notation"): LeftErrorType<L> => {
  const error = new Error(message) as LeftErrorType<L>
  error.name = "LeftError"
  ;(error as { value: L }).value = value
  return error
}

/**
 * Error thrown when attempting to unwrap an empty List in Do-notation
 */
export const EmptyListError = (message = "Cannot unwrap empty List in Do-notation"): Error => {
  const error = new Error(message)
  error.name = "EmptyListError"
  return error
}

/**
 * Error thrown when attempting to unwrap a Failure in Do-notation
 */
export interface FailureErrorType extends Error {
  readonly cause: Error
}

export const FailureError = (cause: Error, message = "Cannot unwrap Failure in Do-notation"): FailureErrorType => {
  const error = new Error(message) as FailureErrorType
  error.name = "FailureError"
  Object.defineProperty(error, "cause", {
    value: cause,
    writable: false,
    enumerable: false,
    configurable: true,
  })
  return error
}

/**
 * Executes a generator-based monadic comprehension
 * Automatically unwraps yielded monads and threads values through the computation
 *
 * @example
 * ```typescript
 * const result = Do(function* () {
 *   const x = yield Option(5);        // Unwraps to 5
 *   const y = yield Option(10);       // Unwraps to 10
 *   const z = yield Either.right(x + y); // Unwraps to 15
 *   return Option(z * 2);             // Returns Option(30)
 * });
 * ```
 *
 * @param gen - Generator function that yields monads and returns a result
 * @returns The result of the generator computation
 * @throws {NoneError} When a None is yielded
 * @throws {LeftError} When a Left is yielded
 * @throws {EmptyListError} When an empty List is yielded
 * @throws {FailureError} When a Failure is yielded
 */
export function Do<T>(gen: () => Generator<unknown, T, unknown>): T {
  const iterator = gen()

  function step(value?: unknown): T {
    const result = iterator.next(value)

    if (result.done) {
      return result.value
    }

    const yielded = result.value

    // Check if the yielded value implements the Do protocol
    if (yielded && typeof yielded === "object" && DO_PROTOCOL in yielded) {
      const unwrapResult = (yielded as DoProtocol<unknown>)[DO_PROTOCOL]()

      if (unwrapResult.ok) {
        return step(unwrapResult.value)
      } else {
        // Try to let the generator handle the error
        try {
          const errorResult = iterator.throw(unwrapResult.error)
          if (errorResult.done) {
            return errorResult.value
          }
          return step()
        } catch {
          // Generator didn't handle the error, re-throw it
          throw unwrapResult.error
        }
      }
    }

    // If the value doesn't implement the protocol, pass it through
    // This allows yielding regular values in Do-comprehensions
    return step(yielded)
  }

  return step()
}

/**
 * Executes an async generator-based monadic comprehension
 * Supports both synchronous monads and Promises that resolve to monads
 *
 * @example
 * ```typescript
 * const result = await DoAsync(async function* () {
 *   const user = yield fetchUser(id);       // Promise<Option<User>> → User
 *   const profile = yield getProfile(user); // Promise<Either<Error, Profile>> → Profile
 *   const settings = yield Option(profile.settings); // Option<Settings> → Settings
 *   return Right({ user, profile, settings });
 * });
 * ```
 *
 * @param gen - Async generator function that yields monads/promises and returns a result
 * @returns Promise of the result of the generator computation
 * @throws {NoneError} When a None is yielded
 * @throws {LeftError} When a Left is yielded
 * @throws {EmptyListError} When an empty List is yielded
 * @throws {FailureError} When a Failure is yielded
 */
export async function DoAsync<T>(gen: () => AsyncGenerator<unknown, T, unknown>): Promise<T> {
  const iterator = gen()

  async function step(value?: unknown): Promise<T> {
    const result = await iterator.next(value)

    if (result.done) {
      return result.value
    }

    // Await the yielded value in case it's a Promise
    const yielded = await Promise.resolve(result.value)

    // Check if the resolved value implements the Do protocol
    if (yielded && typeof yielded === "object" && DO_PROTOCOL in yielded) {
      const unwrapResult = (yielded as DoProtocol<unknown>)[DO_PROTOCOL]()

      if (unwrapResult.ok) {
        return step(unwrapResult.value)
      } else {
        // Try to let the generator handle the error
        try {
          const errorResult = await iterator.throw(unwrapResult.error)
          if (errorResult.done) {
            return errorResult.value
          }
          return step()
        } catch {
          // Generator didn't handle the error, re-throw it
          throw unwrapResult.error
        }
      }
    }

    // If the value doesn't implement the protocol, pass it through
    return step(yielded)
  }

  return step()
}

/**
 * Helper function to check if a value implements the Do protocol
 * @param value - Value to check
 * @returns True if the value implements DoProtocol
 */
export function isDoCapable<T>(value: unknown): value is DoProtocol<T> {
  return value !== null && typeof value === "object" && DO_PROTOCOL in value
}

/**
 * Manually unwrap a monad using the Do protocol
 * Useful for testing or when you need to unwrap outside of a Do-comprehension
 *
 * @param monad - Monad to unwrap
 * @returns The unwrapped value
 * @throws Error if the monad cannot be unwrapped
 */
export function unwrap<T>(monad: DoProtocol<T>): T {
  const result = monad[DO_PROTOCOL]()
  if (result.ok) {
    return result.value
  } else {
    throw result.error
  }
}
