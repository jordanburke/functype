import stringify from "safe-stable-stringify"

import { Companion } from "@/companion/Companion"
import { Either, Left, Right } from "@/either"
import type { Extractable } from "@/extractable"
import type { FunctypeBase } from "@/functor/Functype"
import { None, Option, Some } from "@/option"
import type { Pipe } from "@/pipe"
import { Try } from "@/try"
import { Typeable } from "@/typeable/Typeable"
import type { Type } from "@/types"

/**
 * Lazy type module
 * @module Lazy
 * @category Core
 */

/**
 * The Lazy type represents a computation that is deferred until needed.
 * It provides memoization and safe evaluation with integration to Option, Either, and Try.
 * @typeParam T - The type of the value to be computed
 */
export interface Lazy<T extends Type> extends FunctypeBase<T, "Lazy">, Extractable<T>, Pipe<T>, Typeable<"Lazy"> {
  /** Tag identifying this as a Lazy type */
  readonly _tag: "Lazy"
  /** Whether the computation has been evaluated */
  readonly isEvaluated: boolean
  /**
   * Forces evaluation of the lazy value and returns the result.
   * The result is memoized after first evaluation.
   * @returns The computed value
   * @throws Any error thrown by the computation
   */
  get(): T
  /**
   * Returns the computed value or a default value if computation fails
   * @param defaultValue - The value to return if computation fails
   * @returns The computed value or defaultValue
   */
  getOrElse(defaultValue: T): T
  /**
   * Returns the computed value or null if computation fails
   * @returns The computed value or null
   */
  getOrNull(): T | null
  /**
   * Returns the computed value or throws a specified error if computation fails
   * @param error - The error to throw if computation fails
   * @returns The computed value
   * @throws The specified error if computation fails
   */
  getOrThrow(error: Error): T
  /**
   * Maps the value inside the Lazy using the provided function
   * @param f - The mapping function
   * @returns A new Lazy containing the mapped value
   */
  map<U extends Type>(f: (value: T) => U): Lazy<U>
  /**
   * Applies a wrapped function to a wrapped value (Applicative pattern)
   * @param ff - A Lazy containing a function from T to U
   * @returns A new Lazy containing the result
   */
  ap<U extends Type>(ff: Lazy<(value: T) => U>): Lazy<U>
  /**
   * Maps the value inside the Lazy using an async function
   * @param f - The async mapping function
   * @returns A Promise of a new Lazy containing the mapped value
   */
  mapAsync<U extends Type>(f: (value: T) => Promise<U>): Promise<Lazy<U>>
  /**
   * Maps the value using a function that returns a Lazy
   * @param f - The mapping function returning a Lazy
   * @returns A new Lazy containing the flattened result
   */
  flatMap<U extends Type>(f: (value: T) => Lazy<U>): Lazy<U>
  /**
   * Maps the value using an async function that returns a Lazy
   * @param f - The async mapping function returning a Lazy
   * @returns A Promise of a new Lazy containing the flattened result
   */
  flatMapAsync<U extends Type>(f: (value: T) => Promise<Lazy<U>>): Promise<Lazy<U>>
  /**
   * Returns a Lazy that filters the value based on a predicate
   * @param predicate - The predicate function
   * @returns A Lazy containing an Option of the value
   */
  filter(predicate: (value: T) => boolean): Lazy<Option<T>>
  /**
   * Recovers from a failed computation by providing an alternative value
   * @param f - Function that takes the error and returns a recovery value
   * @returns A new Lazy that will use the recovery function if computation fails
   */
  recover(f: (error: unknown) => T): Lazy<T>
  /**
   * Recovers from a failed computation by providing an alternative Lazy
   * @param f - Function that takes the error and returns a recovery Lazy
   * @returns A new Lazy that will use the recovery Lazy if computation fails
   */
  recoverWith(f: (error: unknown) => Lazy<T>): Lazy<T>
  /**
   * Evaluates the computation and returns it as an Option
   * @returns Some containing the value if successful, None if computation fails
   */
  toOption(): Option<T>
  /**
   * Evaluates the computation and returns it as an Either
   * @returns Right containing the value if successful, Left containing the error if computation fails
   */
  toEither(): Either<unknown, T>
  /**
   * Evaluates the computation and returns it as an Either with a mapped error
   * @param mapError - Function to map the error
   * @returns Right containing the value if successful, Left containing the mapped error if computation fails
   */
  toEitherWith<E>(mapError: (error: unknown) => E): Either<E, T>
  /**
   * Evaluates the computation and returns it as a Try
   * @returns Try containing the result of the computation
   */
  toTry(): Try<T>
  /**
   * Applies an effect function to the value if computation succeeds
   * @param f - The effect function
   * @returns This Lazy for chaining
   */
  tap(f: (value: T) => void): Lazy<T>
  /**
   * Applies an effect function to the error if computation fails
   * @param f - The effect function for errors
   * @returns This Lazy for chaining
   */
  tapError(f: (error: unknown) => void): Lazy<T>
  /**
   * Pattern matching on the Lazy value
   * @param f - Function to apply to the computed value
   * @returns The result of applying f to the computed value
   */
  fold<U>(f: (value: T) => U): U
  /**
   * Pattern matching with success and failure handlers
   * @param onFailure - Function to handle computation failure
   * @param onSuccess - Function to handle successful computation
   * @returns The result of the appropriate handler
   */
  foldWith<U>(onFailure: (error: unknown) => U, onSuccess: (value: T) => U): U
  /**
   * Left fold operation
   * @param z - Initial value
   * @returns Function that takes an operator and applies it
   */
  foldLeft: <B>(z: B) => (op: (b: B, a: T) => B) => B
  /**
   * Right fold operation
   * @param z - Initial value
   * @returns Function that takes an operator and applies it
   */
  foldRight: <B>(z: B) => (op: (a: T, b: B) => B) => B
  /**
   * Pattern matching for the Lazy type
   * @param patterns - Object with handler for Lazy pattern
   * @returns The result of the matched handler
   */
  match<R>(patterns: { Lazy: (value: T) => R }): R
  /**
   * Creates a string representation of the Lazy
   * @returns String representation showing evaluation status
   */
  toString(): string
  /**
   * Converts the Lazy to a value object
   * @returns Object representation of the Lazy with evaluation state
   */
  toValue(): { _tag: "Lazy"; evaluated: boolean; value?: T }
}

/**
 * Internal constructor for creating Lazy instances
 */
const LazyConstructor = <T extends Type>(thunk: () => T): Lazy<T> => {
  let evaluated = false
  let value: T | undefined = undefined
  let error: unknown | undefined = undefined
  let hasError = false

  const evaluate = (): T => {
    if (!evaluated) {
      try {
        value = thunk()
        evaluated = true
      } catch (e) {
        error = e
        hasError = true
        evaluated = true
        throw e
      }
    }
    if (hasError) {
      throw error
    }
    return value as T
  }

  const lazy: Lazy<T> = {
    _tag: "Lazy",
    get isEvaluated() {
      return evaluated
    },
    get: evaluate,
    getOrElse: (defaultValue: T): T => {
      try {
        return evaluate()
      } catch {
        return defaultValue
      }
    },
    getOrNull: (): T | null => {
      try {
        return evaluate()
      } catch {
        return null
      }
    },
    orNull: (): T | null => {
      try {
        return evaluate()
      } catch {
        return null
      }
    },
    getOrThrow: (err?: Error): T => {
      try {
        return evaluate()
      } catch (e) {
        throw err || e
      }
    },
    orElse: (alternative: Lazy<T>): Lazy<T> =>
      Lazy(() => {
        try {
          return evaluate()
        } catch {
          return alternative.get()
        }
      }),
    orUndefined: (): T | undefined => {
      try {
        return evaluate()
      } catch {
        return undefined
      }
    },
    map: <U extends Type>(f: (value: T) => U): Lazy<U> => Lazy(() => f(evaluate())),
    ap: <U extends Type>(ff: Lazy<(value: T) => U>): Lazy<U> => Lazy(() => ff.get()(evaluate())),
    mapAsync: async <U extends Type>(f: (value: T) => Promise<U>): Promise<Lazy<U>> => {
      const val = evaluate()
      const result = await f(val)
      return Lazy(() => result) as Lazy<U>
    },
    flatMap: <U extends Type>(f: (value: T) => Lazy<U>): Lazy<U> => Lazy(() => f(evaluate()).get()),
    flatMapAsync: async <U extends Type>(f: (value: T) => Promise<Lazy<U>>): Promise<Lazy<U>> => {
      const val = evaluate()
      const lazyResult = await f(val)
      return Lazy(() => lazyResult.get()) as Lazy<U>
    },
    filter: (predicate: (value: T) => boolean): Lazy<Option<T>> =>
      Lazy(() => {
        const val = evaluate()
        return predicate(val) ? Some(val) : (None as unknown as Option<T>)
      }),
    recover: (f: (error: unknown) => T): Lazy<T> =>
      Lazy(() => {
        try {
          return evaluate()
        } catch (e) {
          return f(e)
        }
      }),
    recoverWith: (f: (error: unknown) => Lazy<T>): Lazy<T> =>
      Lazy(() => {
        try {
          return evaluate()
        } catch (e) {
          return f(e).get()
        }
      }),
    toOption: (): Option<T> => {
      try {
        return Some(evaluate())
      } catch {
        return None as unknown as Option<T>
      }
    },
    toEither: (): Either<unknown, T> => {
      try {
        return Right(evaluate())
      } catch (e) {
        return Left(e)
      }
    },
    toEitherWith: <E>(mapError: (error: unknown) => E): Either<E, T> => {
      try {
        return Right(evaluate())
      } catch (e) {
        return Left(mapError(e))
      }
    },
    toTry: (): Try<T> => Try(() => evaluate()),
    tap: (f: (value: T) => void): Lazy<T> =>
      Lazy(() => {
        const val = evaluate()
        f(val)
        return val
      }),
    tapError: (f: (error: unknown) => void): Lazy<T> =>
      Lazy(() => {
        try {
          return evaluate()
        } catch (e) {
          f(e)
          throw e
        }
      }),
    fold: <U>(f: (value: T) => U): U => f(evaluate()),
    foldWith: <U>(onFailure: (error: unknown) => U, onSuccess: (value: T) => U): U => {
      try {
        return onSuccess(evaluate())
      } catch (e) {
        return onFailure(e)
      }
    },
    foldLeft:
      <B>(z: B) =>
      (op: (b: B, a: T) => B) =>
        op(z, evaluate()),
    foldRight:
      <B>(z: B) =>
      (op: (a: T, b: B) => B) =>
        op(evaluate(), z),
    match: <R>(patterns: { Lazy: (value: T) => R }): R => patterns.Lazy(evaluate()),
    toString: (): string => {
      if (evaluated && !hasError) {
        return `Lazy(${stringify(value)})`
      } else if (evaluated && hasError) {
        const errorMessage = error instanceof Error ? error.message : String(error)
        return `Lazy(<error: ${errorMessage}>)`
      } else {
        return `Lazy(<not evaluated>)`
      }
    },
    toValue: (): { _tag: "Lazy"; evaluated: boolean; value?: T } => {
      if (evaluated && !hasError) {
        return { _tag: "Lazy" as const, evaluated: true, value: value as T }
      } else {
        return { _tag: "Lazy" as const, evaluated: false }
      }
    },
    // Traversable
    get size() {
      try {
        evaluate()
        return 1
      } catch {
        return 0
      }
    },
    get isEmpty() {
      try {
        evaluate()
        return false
      } catch {
        return true
      }
    },
    contains: (v: T): boolean => {
      try {
        return evaluate() === v
      } catch {
        return false
      }
    },
    reduce: (f: (b: T, a: T) => T): T => evaluate(),
    reduceRight: (f: (b: T, a: T) => T): T => evaluate(),
    // Pipe
    pipe: <U>(f: (value: T) => U): U => f(evaluate()),
    // Serializable
    serialize: () => ({
      toJSON: () =>
        JSON.stringify(
          evaluated && !hasError ? { _tag: "Lazy", evaluated: true, value } : { _tag: "Lazy", evaluated: false },
        ),
      toYAML: () =>
        evaluated && !hasError
          ? `_tag: Lazy\nevaluated: true\nvalue: ${stringify(value)}`
          : `_tag: Lazy\nevaluated: false`,
      toBinary: () =>
        Buffer.from(
          JSON.stringify(
            evaluated && !hasError ? { _tag: "Lazy", evaluated: true, value } : { _tag: "Lazy", evaluated: false },
          ),
        ).toString("base64"),
    }),
    // Typeable
    typeable: "Lazy" as const,
  } as Lazy<T>

  return lazy
}

/**
 * Companion object with static methods for Lazy
 */
const LazyCompanion = {
  /**
   * Creates a Lazy from a thunk (deferred computation)
   * @param thunk - Function that computes the value
   * @returns A new Lazy instance
   */
  of: <T extends Type>(thunk: () => T): Lazy<T> => LazyConstructor(thunk),
  /**
   * Creates a Lazy from an immediate value
   * @param value - The value to wrap
   * @returns A new Lazy instance that returns the value
   */
  fromValue: <T extends Type>(value: T): Lazy<T> => LazyConstructor(() => value),
  /**
   * Creates a Lazy from an Option
   * @param option - The Option to convert
   * @param defaultThunk - Thunk to compute default value if Option is None
   * @returns A new Lazy instance
   */
  fromOption: <T extends Type>(option: Option<T>, defaultThunk: () => T): Lazy<T> =>
    LazyConstructor(() => (option._tag === "Some" ? (option.value as T) : defaultThunk())),
  /**
   * Creates a Lazy from a Try
   * @param tryValue - The Try to convert
   * @returns A new Lazy instance
   */
  fromTry: <T extends Type>(tryValue: Try<T>): Lazy<T> => LazyConstructor(() => tryValue.get()),
  /**
   * Creates a Lazy from an Either
   * @param either - The Either to convert
   * @returns A new Lazy instance
   */
  fromEither: <E, T extends Type>(either: Either<E, T>): Lazy<T> =>
    LazyConstructor(() =>
      either.fold(
        (e) => {
          throw e
        },
        (value) => value,
      ),
    ),
  /**
   * Creates a Lazy that will throw an error since promises need to be awaited first
   * @param promise - The Promise to convert
   * @returns A new Lazy instance that throws an error
   */
  fromPromise: <T extends Type>(promise: Promise<T>): Lazy<T> => {
    const thunk = () => {
      throw new Error("Promise not yet resolved. Use await on the promise before creating Lazy.")
    }
    return LazyConstructor(thunk as () => T) as unknown as Lazy<T>
  },
  /**
   * Creates a failed Lazy that will throw when evaluated
   * @param error - The error to throw
   * @returns A new Lazy instance that throws the error
   */
  fail: <T extends Type>(error: unknown): Lazy<T> => {
    const thunk = () => {
      throw error
    }
    return LazyConstructor(thunk as () => T) as unknown as Lazy<T>
  },
}

/**
 * Creates a Lazy computation that defers evaluation until needed.
 * Results are memoized after first evaluation.
 *
 * @example
 * // Basic lazy evaluation
 * const expensive = Lazy(() => {
 *   console.log("Computing...")
 *   return 42
 * })
 * // Nothing printed yet
 * const result = expensive.get() // Prints "Computing..." and returns 42
 * const cached = expensive.get() // Returns 42 without printing
 *
 * @example
 * // Error handling
 * const risky = Lazy(() => {
 *   if (Math.random() > 0.5) throw new Error("Failed")
 *   return "Success"
 * })
 * const safe = risky.getOrElse("Default") // Returns "Success" or "Default"
 * const option = risky.toOption() // Some("Success") or None
 * const either = risky.toEither() // Right("Success") or Left(Error)
 *
 * @example
 * // Chaining computations
 * const result = Lazy(() => 10)
 *   .map(x => x * 2)
 *   .flatMap(x => Lazy(() => x + 5))
 *   .recover(err => 0)
 *   .get() // 25
 *
 * @example
 * // Integration with functype
 * const userOption = Option({ id: 1, name: "Alice" })
 * const userName = Lazy.fromOption(userOption, () => ({ id: 0, name: "Anonymous" }))
 *   .map(user => user.name)
 *   .get() // "Alice"
 */
export const Lazy = Companion(LazyConstructor, LazyCompanion)
