/**
 * Generator-based Do-notation for monadic comprehensions
 * Provides Scala-like for-comprehension syntax using JavaScript generators
 * @module Do
 */

import { List } from "@/list/List"

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
  // Create new error object to avoid mutation
  const customError = Object.create(Error.prototype)
  customError.message = error.message
  customError.stack = error.stack
  customError.name = "NoneError"
  return customError
}

/**
 * Error thrown when attempting to unwrap a Left value in Do-notation
 */
export interface LeftErrorType<L> extends Error {
  value: L
}

export const LeftError = <L>(value: L, message = "Cannot unwrap Left in Do-notation"): LeftErrorType<L> => {
  const error = new Error(message)
  // Create new error object to avoid mutation
  const customError = Object.create(Error.prototype) as LeftErrorType<L>
  customError.message = error.message
  customError.stack = error.stack
  customError.name = "LeftError"
  customError.value = value
  return customError
}

/**
 * Error thrown when attempting to unwrap an empty List in Do-notation
 */
export const EmptyListError = (message = "Cannot unwrap empty List in Do-notation"): Error => {
  const error = new Error(message)
  // Create new error object to avoid mutation
  const customError = Object.create(Error.prototype)
  customError.message = error.message
  customError.stack = error.stack
  customError.name = "EmptyListError"
  return customError
}

/**
 * Error thrown when attempting to unwrap a Failure in Do-notation
 */
export interface FailureErrorType extends Error {
  cause: Error
}

export const FailureError = (cause: Error, message = "Cannot unwrap Failure in Do-notation"): FailureErrorType => {
  const error = new Error(message)
  // Create new error object to avoid mutation
  const customError = Object.create(Error.prototype) as FailureErrorType
  customError.message = error.message
  customError.stack = error.stack
  customError.name = "FailureError"
  customError.cause = cause
  return customError
}

/**
 * Executes a generator-based monadic comprehension
 * Automatically unwraps yielded monads and threads values through the computation
 * For Lists, iterates over all elements producing cartesian products
 *
 * @example
 * ```typescript
 * // Due to TypeScript limitations, yielded values are typed as unknown
 * // You can use type assertions for better type safety:
 * const result = Do(function* () {
 *   const x = yield List([1, 2]) as any as number;  // Type assertion
 *   const y = yield List([3, 4]) as any as number;  // Type assertion
 *   return x + y;                                   // Returns List([4, 5, 5, 6])
 * });
 * ```
 *
 * Note: Due to TypeScript limitations with generators, yielded values are typed as unknown.
 * Consider using type assertions or yield* for better type inference.
 *
 * @param gen - Generator function that yields monads and returns a result
 * @returns The result of the generator computation (type determined by first yield)
 * @throws {NoneError} When a None is yielded
 * @throws {LeftError} When a Left is yielded
 * @throws {EmptyListError} When an empty List is yielded
 * @throws {FailureError} When a Failure is yielded
 */
export function Do<T>(gen: () => Generator<unknown, T, unknown>): T {
  // Peek at first yield to determine if it's a List comprehension
  // We need to create a test generator to peek without consuming
  const testGen = gen()
  const firstYieldResult = testGen.next()

  if (!firstYieldResult.done) {
    const firstYield = firstYieldResult.value

    // Check if any yield is a List (need to scan all yields for accuracy)
    // For now, use simple heuristic: if first yield is a List, treat as List comprehension
    const isListComprehension =
      firstYield &&
      typeof firstYield === "object" &&
      "toArray" in firstYield &&
      typeof (firstYield as { toArray?: unknown }).toArray === "function"

    if (isListComprehension) {
      // List comprehension path - handle cartesian products
      return doListComprehension(gen)
    }
  }

  // Regular monadic path - simple chaining
  return doSimpleMonadic(gen)
}

// Helper for simple monadic chaining (Option, Either, Try)
function doSimpleMonadic<T>(gen: () => Generator<unknown, T, unknown>): T {
  const iter = gen()

  function step(value?: unknown): T {
    const result = iter.next(value)

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
          const errorResult = iter.throw(unwrapResult.error)
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

// Helper for List comprehensions with cartesian products
function doListComprehension<T>(gen: () => Generator<unknown, T, unknown>): T {
  // State for tracking results (will be used in future iterations)
  // const state = { allResults: [] as T[] }

  // Helper to extract values from a monad
  function extractValues(monad: unknown): unknown[] {
    if (!monad || typeof monad !== "object" || !(DO_PROTOCOL in monad)) {
      return [monad]
    }

    const doCapable = monad as DoProtocol<unknown>

    // Check if it's a List
    if ("toArray" in doCapable && typeof doCapable.toArray === "function") {
      const array = (doCapable as { toArray: () => unknown[] }).toArray()
      if (array.length === 0) {
        throw EmptyListError()
      }
      return array
    }

    // For Option/Either/Try, extract single value or throw
    const result = doCapable[DO_PROTOCOL]()
    if (result.ok) {
      return [result.value]
    } else {
      throw result.error
    }
  }

  // Recursive function to handle cartesian product
  function runWithValues(previousValues: unknown[]): T[] {
    const iter = gen()
    const localResults: T[] = []

    function step(value: unknown | undefined, yieldIndex: number): void {
      const result = iter.next(value)

      if (result.done) {
        localResults.push(result.value)
        return
      }

      // If we already have a value for this yield, use it
      if (yieldIndex < previousValues.length) {
        step(previousValues[yieldIndex], yieldIndex + 1)
        return
      }

      // Extract values and potentially branch
      try {
        const values = extractValues(result.value)

        if (values.length > 1) {
          // Multiple values - branch for each
          const branchResults = values.flatMap((val) => runWithValues([...previousValues, val]))
          localResults.push(...branchResults)
        } else {
          // Single value
          step(values[0], yieldIndex + 1)
        }
      } catch (error) {
        // Try to let the generator handle the error
        try {
          const errorResult = iter.throw(error as Error)
          if (errorResult.done) {
            localResults.push(errorResult.value)
            return
          }
          step(undefined, yieldIndex + 1)
        } catch {
          throw error
        }
      }
    }

    step(undefined, 0)
    return localResults
  }

  const results = runWithValues([])
  return List(results) as T
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

/**
 * Type helper for Do-notation generators.
 * Provides better type hints in IDEs.
 *
 * @example
 * ```typescript
 * const result = Do(function* (): DoGenerator<number> {
 *   const x = yield List([1, 2])  // x is still unknown but return type is clear
 *   const y = yield List([3, 4])
 *   return x + y
 * })
 * ```
 */
export type DoGenerator<T, TYield = unknown> = Generator<TYield, T, unknown>

/**
 * Extracts values from monads in Do-notation with type inference.
 * The '$' symbol is the universal extraction operator in functional programming.
 *
 * @example
 * ```typescript
 * const result = Do(function* () {
 *   const x = yield* $(Option(5))        // x: number
 *   const y = yield* $(List([1, 2, 3]))  // y: number (first element)
 *   const name = yield* $(Right("Alice")) // name: string
 *   return `${name}: ${x + y}`
 * })
 * ```
 *
 * TypeScript will attempt to infer the type from the monad structure.
 * If type inference fails, you can add an explicit type annotation:
 * ```typescript
 * const value = yield* $(complexMonad) as string
 * ```
 *
 * @param monad - Any monad that can be unwrapped (Option, Either, List, Try, etc.)
 * @returns A generator that yields the monad and returns its extracted value
 */
// Overloads for specific types to improve type inference
export function $<T>(monad: { _tag: "Some" | "None"; get(): T }): Generator<unknown, T, T>
export function $<L, R>(monad: { _tag: "Left" | "Right"; isRight(): boolean; value: R }): Generator<unknown, R, R>
export function $<T>(monad: List<T>): Generator<unknown, T, T>
export function $<T>(monad: { _tag: "Success" | "Failure"; get(): T }): Generator<unknown, T, T>
export function $<T>(monad: DoProtocol<T>): Generator<unknown, T, T>
export function $<M>(monad: M): Generator<M, InferYieldType<M>, InferYieldType<M>>
export function* $<M>(monad: M): Generator<M, unknown, unknown> {
  return (yield monad) as unknown
}

// Type inference for common monads
type InferYieldType<M> = M extends { isSome(): boolean; get(): infer T }
  ? T // Option
  : M extends { isRight(): boolean; value: infer R }
    ? R // Either (Right)
    : M extends { toArray(): (infer T)[] }
      ? T // List
      : M extends { isSuccess(): boolean; get(): infer T }
        ? T // Try
        : M extends DoProtocol<infer T>
          ? T // Generic DoProtocol
          : unknown
