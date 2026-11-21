import { Companion } from "@/companion/Companion"
import type { Either } from "@/either"
import { Left, Right } from "@/either"
import type { Extractable } from "@/extractable"
import type { FunctypeBase } from "@/functype"
import { type A, define, type Mutable } from "@/internal/define"
import { safeStringify } from "@/internal/stringify"
import type { Option } from "@/option"
import { None, Some } from "@/option"
import type { Pipe } from "@/pipe"
import type { SerializedError } from "@/serialization"
import { createSerializer, createTaggedSerializer, deserializeError, serializeError } from "@/serialization"
import { Try } from "@/try"
import type { Widen } from "@/typeclass"
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
export interface Lazy<out T extends Type> extends FunctypeBase<T, "Lazy">, Extractable<T>, Pipe<T> {
  /** Tag identifying this as a Lazy type */
  readonly _tag: "Lazy"
  /** Whether the computation has been evaluated */
  readonly isEvaluated: boolean
  /**
   * Returns the computed value, or calls `defaultValue` if the computation fails.
   * The default is lazy: it runs only on failure. Result widens to `T | T2`
   * (Scala: `getOrElse[B >: A](default: => B): B`).
   */
  getOrElse<T2 extends Type>(defaultValue: () => T2): T | T2
  /**
   * Returns the computed value or null if computation fails
   * @returns The computed value or null
   */
  orNull(): T | null
  /**
   * Returns the computed value or throws an error if computation fails
   * @param error - Optional custom error to throw. If not provided, throws the computation error or a default error
   * @returns The computed value
   * @throws The specified error, computation error, or a default error
   */
  orThrow(error?: Error): T
  /**
   * Returns this Lazy if computation succeeds, otherwise calls `alternative` for another Lazy.
   * The alternative is lazy: it runs only on failure. It may carry a different type; result is `Lazy<T | T2>`.
   */
  orElse<T2 extends Type>(alternative: () => Lazy<T2>): Lazy<T | T2>
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
  foldLeft<B>(z: B): (op: (b: B, a: T) => B) => B
  /**
   * Right fold operation
   * @param z - Initial value
   * @returns Function that takes an operator and applies it
   */
  foldRight<B>(z: B): (op: (a: T, b: B) => B) => B
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
   * Converts the Lazy to a value object.
   *
   * **Forces the thunk** as a side effect — Lazy serialization (and projection
   * to a plain value object) cannot represent an unevaluated thunk in JSON;
   * forcing is the only way to produce a complete projection. If the thunk
   * threw, the failure is captured in the `error` field (real Error, with
   * full prototype intact for in-memory inspection — `toJSON` projects to
   * `SerializedError` for the wire).
   *
   * Changed in 1.2.0 — pre-1.2.0 Lazy emitted `{_tag, evaluated, value?}`
   * without forcing. See `docs/archive/proposals/serializable-audit-q1-q2.md`.
   */
  toValue(): { _tag: "Lazy"; value: T } | { _tag: "Lazy"; error: Error }
  /**
   * Custom JSON serialization. Forces the thunk (see `toValue` for the
   * side-effect contract). Emits `{"@functype":"Lazy","_tag":"Lazy","value":T}`
   * on success, or `{"@functype":"Lazy","_tag":"Lazy","error":SerializedError}`
   * if the thunk threw — see error-envelope.ts for round-trip semantics.
   */
  toJSON():
    { "@functype": "Lazy"; _tag: "Lazy"; value: T } | { "@functype": "Lazy"; _tag: "Lazy"; error: SerializedError }
}

/**
 * Where a Lazy's evaluation stands. Each step replaces the record, so once the thunk has run the
 * Lazy no longer holds it. @internal
 */
type LazyState<T> =
  | { readonly _tag: "Pending"; readonly thunk: () => T }
  | { readonly _tag: "Evaluated"; readonly value: T }
  | { readonly _tag: "Failed"; readonly error: unknown }

/**
 * A Lazy's own data: its tag and its state. The value isn't frozen, as Option, Either and Try
 * aren't (#276 §14 Rules), so it can memoize by replacing `state`. @internal
 */
interface LazyOf<out T extends Type> extends Lazy<T> {
  readonly state: LazyState<T>
}

/** How a Lazy's thunk ended. */
type Settled<T> = Exclude<LazyState<T>, { readonly _tag: "Pending" }>

/* eslint-disable functional/immutable-data -- settle() memoizes into the Lazy, and the constructor fills in the one it just created */

/**
 * Runs the thunk at most once, and says how it ended without throwing. A value or a thrown error is
 * kept and handed back on every later read. The state is written after the thunk returns, so a
 * thunk that reads its own Lazy runs again, as it always has. Reading `lazy.state` comes first and
 * outside the `try`, so a detached call throws a TypeError instead of reading as a failed thunk.
 */
const settle = <T extends Type>(lazy: Mutable<LazyOf<T>>): Settled<T> => {
  const { state } = lazy
  if (state._tag !== "Pending") return state
  try {
    const evaluated: Settled<T> = { _tag: "Evaluated", value: state.thunk() }
    lazy.state = evaluated
    return evaluated
  } catch (error) {
    const failed: Settled<T> = { _tag: "Failed", error }
    lazy.state = failed
    return failed
  }
}

/** The Lazy's value, or its thunk's error, thrown. */
const force = <T extends Type>(lazy: Mutable<LazyOf<T>>): T => {
  const settled = settle(lazy)
  if (settled._tag === "Failed") throw settled.error
  return settled.value
}

/**
 * Every Lazy shares these methods (#276 §14). Each used to be a fresh closure per value, and the
 * three getters (`isEvaluated`, `size`, `isEmpty`) gave every Lazy its own hidden class, which is
 * what made building one cost about 2 µs.
 */
const LazyProto = define<LazyOf<A>, "_tag" | "state">()("Lazy", {
  [Symbol.toStringTag]: "Lazy",

  get isEvaluated() {
    return this.state._tag !== "Pending"
  },

  getOrElse(defaultValue) {
    const settled = settle(this)
    return settled._tag === "Evaluated" ? settled.value : defaultValue()
  },

  orNull() {
    const settled = settle(this)
    return settled._tag === "Evaluated" ? settled.value : null
  },

  orUndefined() {
    const settled = settle(this)
    return settled._tag === "Evaluated" ? settled.value : undefined
  },

  orThrow(error) {
    const settled = settle(this)
    if (settled._tag === "Failed") throw error ?? settled.error
    return settled.value
  },

  orElse(alternative) {
    return LazyConstructor(() => {
      try {
        return force(this)
      } catch {
        return alternative().orThrow()
      }
    })
  },

  map(f) {
    return LazyConstructor(() => f(force(this)))
  },

  ap(ff) {
    return LazyConstructor(() => ff.orThrow()(force(this)))
  },

  async mapAsync(f) {
    const result = await f(force(this))
    return LazyConstructor(() => result)
  },

  flatMap(f) {
    return LazyConstructor(() => f(force(this)).orThrow())
  },

  async flatMapAsync(f) {
    const lazyResult = await f(force(this))
    return LazyConstructor(() => lazyResult.orThrow())
  },

  filter(predicate) {
    return LazyConstructor(() => {
      const value = force(this)
      return predicate(value) ? Some(value) : None()
    })
  },

  recover(f) {
    return LazyConstructor(() => {
      try {
        return force(this)
      } catch (e) {
        return f(e)
      }
    })
  },

  recoverWith(f) {
    return LazyConstructor(() => {
      try {
        return force(this)
      } catch (e) {
        return f(e).orThrow()
      }
    })
  },

  toOption() {
    const settled = settle(this)
    return settled._tag === "Evaluated" ? Some(settled.value) : None()
  },

  toEither() {
    const settled = settle(this)
    return settled._tag === "Evaluated" ? Right(settled.value) : Left(settled.error)
  },

  toEitherWith(mapError) {
    const settled = settle(this)
    return settled._tag === "Evaluated" ? Right(settled.value) : Left(mapError(settled.error))
  },

  toTry() {
    return Try(() => force(this))
  },

  tap(f) {
    return LazyConstructor(() => {
      const value = force(this)
      f(value)
      return value
    })
  },

  tapError(f) {
    return LazyConstructor(() => {
      try {
        return force(this)
      } catch (e) {
        f(e)
        throw e
      }
    })
  },

  fold(f) {
    return f(force(this))
  },

  foldWith(onFailure, onSuccess) {
    const settled = settle(this)
    if (settled._tag === "Failed") return onFailure(settled.error)
    // onFailure also gets what onSuccess throws, as it always has.
    try {
      return onSuccess(settled.value)
    } catch (e) {
      return onFailure(e)
    }
  },

  foldLeft(z) {
    return (op) => op(z, force(this))
  },

  foldRight(z) {
    return (op) => op(force(this), z)
  },

  match(patterns) {
    return patterns.Lazy(force(this))
  },

  toString() {
    const { state } = this
    if (state._tag === "Evaluated") return `Lazy(${safeStringify(state.value)})`
    if (state._tag === "Failed") {
      const message = state.error instanceof Error ? state.error.message : String(state.error)
      return `Lazy(<error: ${message}>)`
    }
    return "Lazy(<not evaluated>)"
  },

  toValue() {
    // Forces the thunk. A failure is kept as a real Error, with its prototype.
    const settled = settle(this)
    if (settled._tag === "Evaluated") return { _tag: "Lazy" as const, value: settled.value }
    const { error } = settled
    return { _tag: "Lazy" as const, error: error instanceof Error ? error : new Error(String(error)) }
  },

  // Traversable. Both getters force the thunk, as they always have.
  get size() {
    return settle(this)._tag === "Evaluated" ? 1 : 0
  },

  get isEmpty() {
    return settle(this)._tag === "Failed"
  },

  contains(value) {
    const settled = settle(this)
    return settled._tag === "Evaluated" && settled.value === value
  },

  reduce<B>() {
    return force(this) as unknown as Widen<A, B>
  },

  reduceRight<B>() {
    return force(this) as unknown as Widen<A, B>
  },

  // count, find, exists and forEach also swallow what their callback throws, as they always have.
  count(p) {
    const settled = settle(this)
    if (settled._tag === "Failed") return 0
    try {
      return p(settled.value) ? 1 : 0
    } catch {
      return 0
    }
  },

  find(p) {
    const settled = settle(this)
    if (settled._tag === "Failed") return None()
    try {
      return p(settled.value) ? Some(settled.value) : None()
    } catch {
      return None()
    }
  },

  exists(p) {
    const settled = settle(this)
    if (settled._tag === "Failed") return false
    try {
      return p(settled.value)
    } catch {
      return false
    }
  },

  forEach(f) {
    const settled = settle(this)
    if (settled._tag === "Failed") return
    try {
      f(settled.value)
    } catch {
      // Ignored, as it always was.
    }
  },

  pipe(f) {
    return f(force(this))
  },

  // Serializable. Forces the thunk, because the envelope must carry the value or the failure: a
  // closure can't be serialized.
  toJSON() {
    const settled = settle(this)
    return settled._tag === "Evaluated"
      ? { "@functype": "Lazy" as const, _tag: "Lazy" as const, value: settled.value }
      : { "@functype": "Lazy" as const, _tag: "Lazy" as const, error: serializeError(settled.error) }
  },

  serialize() {
    const settled = settle(this)
    if (settled._tag === "Failed")
      return createTaggedSerializer("Lazy", "Lazy", { error: serializeError(settled.error) })
    try {
      return createSerializer("Lazy", settled.value)
    } catch (e) {
      return createTaggedSerializer("Lazy", "Lazy", { error: serializeError(e) })
    }
  },
})

/** Builds a Lazy around `thunk`, which doesn't run until a value is read. */
const LazyConstructor = <T extends Type>(thunk: () => T): Lazy<T> => {
  // The one cast: a prototype checked at the opaque A works for every T.
  const lazy = Object.create(LazyProto) as Mutable<LazyOf<T>>
  lazy._tag = "Lazy"
  lazy.state = { _tag: "Pending", thunk }
  return lazy
}

/* eslint-enable functional/immutable-data */

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
  fromTry: <T extends Type>(tryValue: Try<T>): Lazy<T> => LazyConstructor(() => tryValue.orThrow()),
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
  fromPromise: <T extends Type>(_promise: Promise<T>): Lazy<T> =>
    LazyConstructor<T>(() => {
      throw new Error("Promise not yet resolved. Use await on the promise before creating Lazy.")
    }),
  /**
   * Creates a failed Lazy that will throw when evaluated
   * @param error - The error to throw
   * @returns A new Lazy instance that throws the error
   */
  fail: <T extends Type>(error: unknown): Lazy<T> =>
    LazyConstructor<T>(() => {
      throw error
    }),
  /**
   * Creates an already-evaluated Lazy. Used by `fromJSON` to reconstruct a
   * Lazy whose thunk was forced at serialize time — there is no original
   * thunk to defer because a closure cannot be JSON-serialized.
   *
   * Functionally equivalent to `Lazy.fromValue` but reads with intent at
   * the call site.
   */
  evaluated: <T extends Type>(value: T): Lazy<T> => LazyConstructor(() => value),
  /**
   * Reconstruct a Lazy from a JSON envelope emitted by `serialize().toJSON()`
   * or instance `toJSON()`. Verifies `@functype === "Lazy"`. Success envelopes
   * become already-evaluated Lazies via `Lazy.evaluated`; failure envelopes
   * become Lazies whose forcing rethrows the deserialized Error (see
   * error-envelope.ts — `instanceof SomeError` does NOT survive but `name`
   * does).
   */
  fromJSON: <T extends Type>(json: string): Lazy<T> => {
    const parsed = JSON.parse(json) as {
      "@functype"?: string
      _tag?: string
      value?: T
      error?: SerializedError | string
    }
    if (parsed["@functype"] !== undefined && parsed["@functype"] !== "Lazy") {
      throw new Error(`Lazy.fromJSON: expected @functype="Lazy", got ${JSON.stringify(parsed["@functype"])}`)
    }
    if (parsed.error !== undefined) {
      const err = typeof parsed.error === "object" ? deserializeError(parsed.error) : new Error(parsed.error)
      return LazyCompanion.fail<T>(err)
    }
    return LazyCompanion.evaluated<T>(parsed.value as T)
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
 * const result = expensive.orThrow() // Prints "Computing..." and returns 42
 * const cached = expensive.orThrow() // Returns 42 without printing
 *
 * @example
 * // Error handling
 * const risky = Lazy(() => {
 *   if (Math.random() > 0.5) throw new Error("Failed")
 *   return "Success"
 * })
 * const safe = risky.getOrElse(() => "Default") // Returns "Success" or "Default"
 * const option = risky.toOption() // Some("Success") or None
 * const either = risky.toEither() // Right("Success") or Left(Error)
 *
 * @example
 * // Chaining computations
 * const result = Lazy(() => 10)
 *   .map(x => x * 2)
 *   .flatMap(x => Lazy(() => x + 5))
 *   .recover(err => 0)
 *   .orThrow() // 25
 *
 * @example
 * // Integration with functype
 * const userOption = Option({ id: 1, name: "Alice" })
 * const userName = Lazy.fromOption(userOption, () => ({ id: 0, name: "Anonymous" }))
 *   .map(user => user.name)
 *   .orThrow() // "Alice"
 */
export const Lazy = Companion(LazyConstructor, LazyCompanion)
