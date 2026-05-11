/**
 * Generator-based Do-notation for monadic comprehensions
 * Provides Scala-like for-comprehension syntax using JavaScript generators
 *
 * ## Scala Equivalents
 *
 * Functype:  `const x = yield* $(Option(5))`
 * Scala:     `x <- Some(5)`
 *
 * Functype:  `return x + y`
 * Scala:     `yield x + y`
 *
 * ## Core Concepts
 *
 * - **Generators**: Use `yield* $(monad)` to extract values from monads
 * - **Short-circuiting**: None/Left/Failure automatically propagates
 * - **Type inference**: The $ helper provides proper TypeScript types
 * - **First monad wins**: Return type matches the first yielded monad
 * - **Cartesian products**: Multiple List yields create all combinations
 *
 * ## Usage Rules
 *
 * 1. All yielded values MUST be monadic (Option, Either, List, Try)
 * 2. Use the $ helper for type inference: `yield* $(Option(value))`
 * 3. Raw values should be assigned directly without yielding
 * 4. Mixed monad types are supported via Reshapeable interface
 *
 * @example
 * // Basic Option chaining (Scala: for { x <- Some(5); y <- Some(10) } yield x + y)
 * const result = Do(function* () {
 *   const x = yield* $(Option(5))        // Extract from Option
 *   const y = yield* $(Option(10))       // Extract from another Option
 *   return x + y                         // Return final value
 * })
 * // result: Option<number> with value 15
 *
 * @example
 * // List comprehension (Scala: for { x <- List(1,2); y <- List(10,20) } yield (x,y))
 * const pairs = Do(function* () {
 *   const x = yield* $(List([1, 2]))     // Iterates: 1, 2
 *   const y = yield* $(List([10, 20]))   // Iterates: 10, 20
 *   return { x, y }                      // All combinations
 * })
 * // pairs: List([{x:1,y:10}, {x:1,y:20}, {x:2,y:10}, {x:2,y:20}])
 *
 * @example
 * // Error propagation with Either
 * const validate = Do(function* () {
 *   const email = yield* $(validateEmail(input))  // Either<string, Email>
 *   const user = yield* $(fetchUser(email))       // Either<string, User>
 *   const saved = yield* $(saveUser(user))        // Either<string, Result>
 *   return saved
 * })
 * // If any step returns Left, entire chain short-circuits with that error
 *
 * @see {@link https://github.com/jordanburke/functype/blob/main/docs/do-notation.md} Full documentation
 * @module Do
 */

import { type Either, Left, Right } from "@/either"
import { List } from "@/list/List"
import { Option } from "@/option"
import { Try } from "@/try"

// Re-export protocol definitions
export { type Doable, type DoResult } from "./protocol"

import type { Reshapeable } from "@/reshapeable/Reshapeable"

import { type Doable } from "./protocol"

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

// Structural types for better overload matching
type OptionLike = { _tag: "Some" | "None"; isSome(): boolean; get(): unknown }
type EitherLike = { _tag: "Left" | "Right"; isLeft(): boolean; isRight(): boolean; value: unknown }
type ListLike = { _tag: "List"; toArray(): unknown[] }
type TryLike = { _tag: "Success" | "Failure"; isSuccess(): boolean; get(): unknown }

/**
 * Executes a generator-based monadic comprehension
 * Returns the same monad type as the first yielded monad (Scala semantics)
 *
 * - Option comprehensions return Option (None on short-circuit)
 * - Either comprehensions return Either (Left with error on short-circuit)
 * - List comprehensions return List (empty or cartesian product)
 * - Try comprehensions return Try (Failure with error on short-circuit)
 *
 * Type Inference Notes:
 * - TypeScript infers the correct return type for homogeneous comprehensions
 * - For mixed monad types, TypeScript returns a union type
 * - Use DoTyped<T> or type assertions for mixed scenarios
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
 *
 * // Mixed types - use type assertion or DoTyped:
 * const result = Do(function* () {
 *   const x = yield* $(Option(5));
 *   const y = yield* $(Right<string, number>(10));
 *   return x + y;
 * }) as Option<number>;
 * // result: Option(15)
 * ```
 *
 * @param gen - Generator function that yields monads and returns a result
 * @returns The same monad type as the first yield
 */
// Structural type overloads for better TypeScript inference
export function Do<T>(gen: () => Generator<OptionLike, T, unknown>): Option<T>
export function Do<L, R>(gen: () => Generator<EitherLike, R, unknown>): Either<L, R>
export function Do<T>(gen: () => Generator<ListLike, T, unknown>): List<T>
export function Do<T>(gen: () => Generator<TryLike, T, unknown>): Try<T>
// For mixed types - first monad wins but type inference is limited
export function Do<T>(gen: () => Generator<OptionLike | EitherLike | ListLike | TryLike, T, unknown>): Reshapeable<T>
export function Do<T>(gen: () => Generator<unknown, T, unknown>): unknown
// Implementation
export function Do<T>(gen: () => Generator<unknown, T, unknown>): unknown {
  const iter = gen()
  let firstMonadType: string | null = null
  let cachedConstructor: MonadConstructor | undefined = undefined

  function step(value?: unknown): unknown {
    const result = iter.next(value)

    if (result.done) {
      // Wrap result in detected monad type
      if (cachedConstructor) {
        return cachedConstructor.of(result.value)
      }
      // Fallback to List for backwards compatibility
      return List([result.value])
    }

    const yielded = result.value

    // Optimized: Quick bailout for null/undefined/primitives
    if (yielded === null || yielded === undefined || typeof yielded !== "object") {
      throw new Error(
        "Do-notation error: All yielded values must be monadic. " +
          "Use yield* $(Option(value)), yield* $(Right(value)), etc. " +
          "Raw values should be assigned directly without yielding.",
      )
    }

    // Combined type detection and first yield check
    if (!firstMonadType && "_tag" in yielded) {
      firstMonadType = detectMonadType(yielded)

      // Cache the constructor for later use
      if (firstMonadType !== "unknown" && firstMonadType in MonadConstructors) {
        cachedConstructor = MonadConstructors[firstMonadType]
      }

      // If first yield is a List, switch to List comprehension mode
      if (firstMonadType === "List") {
        // We need to restart with the List comprehension logic
        return doListComprehension(gen)
      }
    }

    // Optimized: Direct doUnwrap check without helper function overhead
    if ("doUnwrap" in yielded) {
      const doResult = (yielded as Doable<unknown>).doUnwrap()

      if (!doResult.ok) {
        // Short-circuit with appropriate empty/error state
        if (!cachedConstructor) {
          return List([])
        }

        // Handle error preservation for Either/Try with single property check
        if (!doResult.empty && "error" in doResult) {
          if (firstMonadType === "Either") {
            return cachedConstructor.empty(doResult.error)
          } else if (firstMonadType === "Try") {
            return cachedConstructor.empty(
              doResult.error instanceof Error ? doResult.error : new Error(String(doResult.error)),
            )
          }
        }

        // Regular empty state (None, empty List)
        return cachedConstructor.empty()
      }

      return step(doResult.value)
    }

    // Reject non-monadic yields - all values must be wrapped with $()
    throw new Error(
      "Do-notation error: All yielded values must be monadic. " +
        "Use yield* $(Option(value)), yield* $(Right(value)), etc. " +
        "Raw values should be assigned directly without yielding.",
    )
  }

  return step()
}

// Helper for List comprehensions with cartesian products
function doListComprehension<T>(gen: () => Generator<unknown, T, unknown>): List<T> {
  // Optimized: Inline helper to extract values from a monad
  function extractValues(monad: unknown): unknown[] {
    // Quick check for non-objects
    if (monad === null || monad === undefined || typeof monad !== "object") {
      return [monad]
    }

    // Optimized: Direct property check without isDoable
    if (!("doUnwrap" in monad)) {
      return [monad]
    }

    const doCapable = monad as Doable<unknown>

    // Check if it's a List (optimized: single property check)
    if ("toArray" in doCapable) {
      const array = (doCapable as { toArray: () => unknown[] }).toArray()
      // Optimized: direct length check
      return array.length === 0 ? [] : array
    }

    // For Option/Either/Try, extract single value or short-circuit
    const result = doCapable.doUnwrap()
    return result.ok ? [result.value] : []
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
// Structural type overloads for better TypeScript inference
export function DoAsync<T>(gen: () => AsyncGenerator<OptionLike, T, unknown>): Promise<Option<T>>
export function DoAsync<L, R>(gen: () => AsyncGenerator<EitherLike, R, unknown>): Promise<Either<L, R>>
export function DoAsync<T>(gen: () => AsyncGenerator<ListLike, T, unknown>): Promise<List<T>>
export function DoAsync<T>(gen: () => AsyncGenerator<TryLike, T, unknown>): Promise<Try<T>>
// For mixed types - first monad wins but type inference is limited
export function DoAsync<T>(
  gen: () => AsyncGenerator<OptionLike | EitherLike | ListLike | TryLike, T, unknown>,
): Promise<Reshapeable<T>>
export function DoAsync<T>(gen: () => AsyncGenerator<unknown, T, unknown>): Promise<unknown>
// Implementation
export async function DoAsync<T>(gen: () => AsyncGenerator<unknown, T, unknown>): Promise<unknown> {
  const iterator = gen()
  let firstMonadType: string | null = null
  let cachedConstructor: MonadConstructor | undefined = undefined

  async function step(value?: unknown): Promise<unknown> {
    const result = await iterator.next(value)

    if (result.done) {
      // Wrap result in detected monad type
      if (cachedConstructor) {
        return cachedConstructor.of(result.value)
      }
      // Fallback to List for backwards compatibility
      return List([result.value])
    }

    // Await the yielded value in case it's a Promise
    const yielded = await Promise.resolve(result.value)

    // Optimized: Early bailout for non-objects
    if (yielded === null || yielded === undefined || typeof yielded !== "object") {
      // Pass through non-monadic values
      return step(yielded)
    }

    // Combined type detection and first yield check
    if (!firstMonadType && "_tag" in yielded) {
      firstMonadType = detectMonadType(yielded)

      // Cache the constructor for later use
      if (firstMonadType !== "unknown" && firstMonadType in MonadConstructors) {
        cachedConstructor = MonadConstructors[firstMonadType]
      }
    }

    // Optimized: Direct doUnwrap check without helper
    if ("doUnwrap" in yielded) {
      const doResult = (yielded as Doable<unknown>).doUnwrap()

      if (!doResult.ok) {
        // Short-circuit with appropriate empty/error state
        if (!cachedConstructor) {
          return List([])
        }

        // Handle error preservation with single property check
        if (!doResult.empty && "error" in doResult) {
          if (firstMonadType === "Either") {
            return cachedConstructor.empty(doResult.error)
          } else if (firstMonadType === "Try") {
            return cachedConstructor.empty(
              doResult.error instanceof Error ? doResult.error : new Error(String(doResult.error)),
            )
          }
        }

        return cachedConstructor.empty()
      }

      return step(doResult.value)
    }

    // If the value doesn't implement the protocol, pass it through
    return step(yielded)
  }

  return step()
}

/**
 * Helper function to check if a value implements the Doable interface
 * @param value - Value to check
 * @returns True if the value implements Doable
 */
export function isDoCapable<T>(value: unknown): value is Doable<T> {
  return (
    value !== null &&
    typeof value === "object" &&
    "doUnwrap" in value &&
    typeof (value as Doable<T>).doUnwrap === "function"
  )
}

/**
 * Manually unwrap a monad using the Doable interface
 * Useful for testing or when you need to unwrap outside of a Do-comprehension
 *
 * @param monad - Monad to unwrap
 * @returns The unwrapped value
 * @throws Error if the monad cannot be unwrapped
 */
export function unwrap<T>(monad: Doable<T>): T {
  const result = monad.doUnwrap()
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
export function $<T>(monad: Option<T>): Generator<Option<T>, T, T>
export function $<L, R>(monad: Either<L, R>): Generator<Either<L, R>, R, R>
export function $<T>(monad: List<T>): Generator<List<T>, T, T>
export function $<T>(monad: Try<T>): Generator<Try<T>, T, T>
export function $<T>(monad: Doable<T>): Generator<Doable<T>, T, T>
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
        : M extends Doable<infer T>
          ? T // Generic Doable
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
