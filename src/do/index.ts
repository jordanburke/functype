/**
 * Generator-based Do-notation for monadic comprehensions
 * Provides Scala-like for-comprehension syntax using JavaScript generators
 * @module Do
 */

import { Left, Right } from "@/either"
import { List } from "@/list/List"
import { Option } from "@/option"
import { Try } from "@/try"

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

/**
 * Detects the monad type from the _tag field
 */
function detectMonadType(value: unknown): string {
  if (!value || typeof value !== "object" || !("_tag" in value)) {
    return "unknown"
  }

  switch (value._tag) {
    case "Some":
    case "None":
      return "Option"

    case "Left":
    case "Right":
      return "Either"

    case "List":
      return "List"

    case "Success":
    case "Failure":
      return "Try"

    default:
      return "unknown"
  }
}

/**
 * Type for monad constructors
 */
type MonadConstructor = {
  of: (value: unknown) => unknown
  empty: (error?: unknown) => unknown
}

/**
 * Registry of monad constructors for wrapping results
 */
const MonadConstructors: Record<string, MonadConstructor> = {
  Option: {
    of: <T>(value: T) => Option(value),
    empty: <T>() => Option.none<T>(),
  },
  Either: {
    of: <L, R>(value: R) => Right<L, R>(value),
    empty: <L, R>(error?: L) => Left<L, R>(error as L),
  },
  List: {
    of: <T>(value: T) => List([value]),
    empty: <T>() => List<T>([]),
  },
  Try: {
    of: <T>(value: T) => Try(() => value),
    empty: (error?: unknown) =>
      Try(() => {
        throw error ?? new Error("Try failed")
      }),
  },
}

/**
 * Executes a generator-based monadic comprehension
 * Returns the same monad type as the first yielded monad (Scala semantics)
 *
 * - Option comprehensions return Option (None on short-circuit)
 * - Either comprehensions return Either (Left with error on short-circuit)
 * - List comprehensions return List (empty or cartesian product)
 * - Try comprehensions return Try (Failure with error on short-circuit)
 *
 * @example
 * ```typescript
 * // Option comprehension returns Option:
 * const result = Do(function* () {
 *   const x = yield* $(Option(5));
 *   const y = yield* $(Option(10));
 *   return x + y;
 * });
 * // result: Option(15)
 *
 * // Either comprehension returns Either:
 * const result = Do(function* () {
 *   const x = yield* $(Right(5));
 *   const y = yield* $(Left("error"));
 *   return x + y;
 * });
 * // result: Left("error") - error is preserved
 *
 * // List comprehension returns List with cartesian product:
 * const result = Do(function* () {
 *   const x = yield* $(List([1, 2]));
 *   const y = yield* $(List([3, 4]));
 *   return x + y;
 * });
 * // result: List([4, 5, 5, 6])
 * ```
 *
 * @param gen - Generator function that yields monads and returns a result
 * @returns The same monad type as the first yield
 */
export function Do<T>(gen: () => Generator<unknown, T, unknown>): unknown {
  const iter = gen()
  let firstMonadType: string | null = null

  function step(value?: unknown): unknown {
    const result = iter.next(value)

    if (result.done) {
      // Wrap result in detected monad type
      if (firstMonadType && firstMonadType in MonadConstructors) {
        return MonadConstructors[firstMonadType]?.of(result.value)
      }
      // Fallback to List for backwards compatibility
      return List([result.value])
    }

    const yielded = result.value

    // First yield determines type (using existing _tag!)
    if (!firstMonadType && yielded && typeof yielded === "object" && "_tag" in yielded) {
      firstMonadType = detectMonadType(yielded)

      // If first yield is a List, switch to List comprehension mode
      if (firstMonadType === "List") {
        // We need to restart with the List comprehension logic
        return doListComprehension(gen)
      }
    }

    // Check DO_PROTOCOL for unwrapping
    if (yielded && typeof yielded === "object" && DO_PROTOCOL in yielded) {
      const doResult = (yielded as DoProtocol<unknown>)[DO_PROTOCOL]()

      if (!doResult.ok) {
        // Short-circuit with appropriate empty/error state
        if (!firstMonadType || !(firstMonadType in MonadConstructors)) {
          return List([])
        }

        const constructor = MonadConstructors[firstMonadType]

        // Handle error preservation for Either/Try
        if ("empty" in doResult && !doResult.empty && "error" in doResult) {
          if (firstMonadType === "Either") {
            return constructor?.empty(doResult.error)
          } else if (firstMonadType === "Try") {
            return constructor?.empty(
              doResult.error instanceof Error ? doResult.error : new Error(String(doResult.error)),
            )
          }
        }

        // Regular empty state (None, empty List)
        return constructor?.empty()
      }

      return step(doResult.value)
    }

    // Pass through non-monads
    return step(yielded)
  }

  return step()
}

// Helper for List comprehensions with cartesian products
function doListComprehension<T>(gen: () => Generator<unknown, T, unknown>): List<T> {
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
        // Return empty array to short-circuit without throwing
        return []
      }
      return array
    }

    // For Option/Either/Try, extract single value or short-circuit
    const result = doCapable[DO_PROTOCOL]()
    if (result.ok) {
      return [result.value]
    } else {
      // Short-circuit by returning empty array (no throw)
      return []
    }
  }

  // Recursive function to handle cartesian product
  function runWithValues(previousValues: unknown[]): T[] {
    const iter = gen()
    const localResults: T[] = []
    const accumulatedValues: unknown[] = []
    let yieldCount = 0

    function step(value: unknown | undefined): void {
      const result = iter.next(value)

      if (result.done) {
        localResults.push(result.value)
        return
      }

      // Check if we already have a value for this yield from previousValues
      if (yieldCount < previousValues.length) {
        const storedValue = previousValues[yieldCount]
        accumulatedValues.push(storedValue)
        yieldCount++
        step(storedValue)
        return
      }

      // Extract value(s) from the yielded monad
      const values = extractValues(result.value)

      // If empty (None/Left/empty List), short-circuit
      if (values.length === 0) {
        return // Short-circuit without adding to results
      }

      if (values.length > 1) {
        // Multiple values - branch for each (cartesian product)
        const branchResults = values.flatMap((val) => {
          const branchValues = [...accumulatedValues, val]
          return runWithValues(branchValues)
        })
        localResults.push(...branchResults)
      } else {
        // Single value - continue
        accumulatedValues.push(values[0])
        yieldCount++
        step(values[0])
      }
    }

    step(undefined)
    return localResults
  }

  const results = runWithValues([])
  return List(results)
}

/**
 * Executes an async generator-based monadic comprehension
 * Returns the same monad type as the first yielded monad
 *
 * @example
 * ```typescript
 * const result = await DoAsync(async function* () {
 *   const user = yield* $(await fetchUser(id));       // Promise<Option<User>> → User
 *   const profile = yield* $(await getProfile(user)); // Promise<Either<Error, Profile>> → Profile
 *   return { user, profile };
 * });
 * // result type matches first yield
 * ```
 *
 * @param gen - Async generator function that yields monads/promises and returns a result
 * @returns Promise of the same monad type as first yield
 */
export async function DoAsync<T>(gen: () => AsyncGenerator<unknown, T, unknown>): Promise<unknown> {
  const iterator = gen()
  let firstMonadType: string | null = null

  async function step(value?: unknown): Promise<unknown> {
    const result = await iterator.next(value)

    if (result.done) {
      // Wrap result in detected monad type
      if (firstMonadType && firstMonadType in MonadConstructors) {
        return MonadConstructors[firstMonadType]?.of(result.value)
      }
      // Fallback to List for backwards compatibility
      return List([result.value])
    }

    // Await the yielded value in case it's a Promise
    const yielded = await Promise.resolve(result.value)

    // First yield determines type
    if (!firstMonadType && yielded && typeof yielded === "object" && "_tag" in yielded) {
      firstMonadType = detectMonadType(yielded)
    }

    // Check if the resolved value implements the Do protocol
    if (yielded && typeof yielded === "object" && DO_PROTOCOL in yielded) {
      const doResult = (yielded as DoProtocol<unknown>)[DO_PROTOCOL]()

      if (!doResult.ok) {
        // Short-circuit with appropriate empty/error state
        if (!firstMonadType || !(firstMonadType in MonadConstructors)) {
          return List([])
        }

        const constructor = MonadConstructors[firstMonadType]

        // Handle error preservation
        if ("empty" in doResult && !doResult.empty && "error" in doResult) {
          if (firstMonadType === "Either") {
            return constructor?.empty(doResult.error)
          } else if (firstMonadType === "Try") {
            return constructor?.empty(
              doResult.error instanceof Error ? doResult.error : new Error(String(doResult.error)),
            )
          }
        }

        return constructor?.empty()
      }

      return step(doResult.value)
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
  } else if ("error" in result) {
    throw result.error
  } else {
    throw new Error("Cannot unwrap empty monad")
  }
}

/**
 * Type helper for Do-notation generators.
 * Provides better type hints in IDEs.
 *
 * @example
 * ```typescript
 * const result = Do(function* (): DoGenerator<number> {
 *   const x = yield* $(List([1, 2]))  // x is still unknown but return type is clear
 *   const y = yield* $(List([3, 4]))
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
 *   const y = yield* $(List([1, 2, 3]))  // y: number (for cartesian product)
 *   const name = yield* $(Right("Alice")) // name: string
 *   return `${name}: ${x + y}`
 * })
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

// Legacy error types (kept for backwards compatibility but not used)
export const NoneError = (message = "Cannot unwrap None in Do-notation"): Error => {
  const error = new Error(message)
  const customError = Object.create(Error.prototype)
  customError.message = error.message
  customError.stack = error.stack
  customError.name = "NoneError"
  return customError
}

export interface LeftErrorType<L> extends Error {
  value: L
}

export const LeftError = <L>(value: L, message = "Cannot unwrap Left in Do-notation"): LeftErrorType<L> => {
  const error = new Error(message)
  const customError = Object.create(Error.prototype) as LeftErrorType<L>
  customError.message = error.message
  customError.stack = error.stack
  customError.name = "LeftError"
  customError.value = value
  return customError
}

export const EmptyListError = (message = "Cannot unwrap empty List in Do-notation"): Error => {
  const error = new Error(message)
  const customError = Object.create(Error.prototype)
  customError.message = error.message
  customError.stack = error.stack
  customError.name = "EmptyListError"
  return customError
}

export interface FailureErrorType extends Error {
  cause: Error
}

export const FailureError = (cause: Error, message = "Cannot unwrap Failure in Do-notation"): FailureErrorType => {
  const error = new Error(message)
  const customError = Object.create(Error.prototype) as FailureErrorType
  customError.message = error.message
  customError.stack = error.stack
  customError.name = "FailureError"
  customError.cause = cause
  return customError
}
