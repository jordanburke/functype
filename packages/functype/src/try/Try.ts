import { Companion } from "@/companion/Companion"
import { type Doable, type DoResult } from "@/do/protocol"
import type { Either } from "@/either/Either"
import { Left, Right } from "@/either/Either"
import type { Extractable } from "@/extractable"
import type { FunctypeSum } from "@/functype"
import { base64ToUtf8 } from "@/internal/base64"
import { type A, define, type Mutable } from "@/internal/define"
import { showValue } from "@/internal/stringify"
import { hasYAMLValue } from "@/internal/yaml"
import { List } from "@/list"
import { Option, Some } from "@/option"
import type { Pipe } from "@/pipe"
import type { Reshapeable } from "@/reshapeable"
import type { SerializedError } from "@/serialization"
import {
  createSerializer,
  createTaggedSerializer,
  deserializeError,
  expectMarker,
  fromYAML as readYAML,
  type ParsedEnvelope,
  serializeError,
} from "@/serialization"
import type { Promisable } from "@/typeclass"
import type { Type } from "@/types"

/**
 * Possible types of Try instances
 */
export type TypeNames = "Success" | "Failure"

export interface Try<out T>
  extends FunctypeSum<T, TypeNames>, Extractable<T>, Pipe<T>, Promisable<T>, Doable<T>, Reshapeable<T> {
  readonly _tag: TypeNames
  readonly error: Error | undefined
  isSuccess(): this is Try<T> & { readonly _tag: "Success"; error: undefined }
  isFailure(): this is Try<T> & { readonly _tag: "Failure"; error: Error }
  orElse<T2 extends Type>(defaultValue: T2): T | T2
  /**
   * Returns the value, or throws on a Failure. Pass an `Error` to throw it, or a builder to make one from
   * the failure's error. With no argument, rethrows the original error.
   */
  orThrow(error?: Error | ((error: Error) => Error)): T
  /**
   * Returns the success value, or calls the never-returning handler with the Failure's error.
   * Use this when you have a helper like `(msg) => fail(msg, 2)` that terminates the program —
   * the result type is unconditionally `T`, so you avoid the TypeScript narrowing trap where
   * `if (t.isFailure()) fail(...)` fails to narrow `t.value` when `fail` is an arrow function
   * typed as `(...): never`.
   */
  expect(handler: (error: Error) => never): T
  or<T2 extends Type>(alternative: Try<T2>): Try<T | T2>
  orNull(): T | null
  orUndefined(): T | undefined
  toOption(): Option<T>
  /**
   * Converts to a plain readonly array: `[value]` for Success, `[]` for Failure.
   * Symmetric with `Try.toList()` but skips the List wrapper for code that
   * just wants to feed Array.prototype methods or spread into another array.
   */
  toArray(): readonly T[]
  /**
   * Converts to Either<E, T>. Failure becomes Left(builder(error)) when given a function,
   * or Left(leftValue) when given a value. Success becomes Right(value).
   *
   * Prefer the function form to thread the underlying Error's context into the Left:
   *
   *   Try.fromYAML(text).toEither((e) => `parse failed: ${e.message}`)
   */
  toEither<E extends Type>(leftOrBuilder: E | ((err: Error) => E)): Either<E, T>
  toTry(): Try<T>
  map<U>(f: (value: T) => U): Try<U>
  ap<U>(ff: Try<(value: T) => U>): Try<U>
  flatMap<U>(f: (value: T) => Try<U>): Try<U>
  flatMapAsync<U>(f: (value: T) => Promise<Try<U>>): Promise<Try<U>>
  /**
   * Pattern matches over the Try, applying onFailure if Failure and onSuccess if Success
   * @param onFailure - Function to apply if the Try is Failure
   * @param onSuccess - Function to apply if the Try is Success
   * @returns The result of applying the appropriate function
   */
  fold<U extends Type>(onFailure: (error: Error) => U, onSuccess: (value: T) => U): U
  /**
   * Async variant of fold. Accepts sync or async handlers on either branch and
   * always returns a Promise.
   */
  foldAsync<U extends Type>(
    onFailure: (error: Error) => U | Promise<U>,
    onSuccess: (value: T) => U | Promise<U>,
  ): Promise<U>
  toString(): string
  /**
   * Pattern matches over the Try, applying a handler function based on the variant
   * @param patterns - Object with handler functions for Success and Failure variants
   * @returns The result of applying the matching handler function
   */
  match<R>(patterns: { Success: (value: T) => R; Failure: (error: Error) => R }): R
  /**
   * Recovers from a Failure by applying a function to the error, returning a new Try.
   * The recovery value may be a wider type; the result is `Try<T | U>`, matching
   * Scala's `recover[U >: T]` shape so Try stays covariant in T.
   */
  recover<U extends Type>(f: (error: Error) => U): Try<T | U>
  /**
   * Recovers from a Failure by applying a function that returns a new Try.
   * As with `recover`, the recovery Try may carry a wider type; the result widens accordingly.
   */
  recoverWith<U extends Type>(f: (error: Error) => Try<U>): Try<T | U>
  /**
   * Applies a predicate to the success value. If the predicate fails, short-circuits
   * to a Failure with the error produced by `onUnsatisfied`. Failure passes through
   * unchanged (predicate not evaluated). Lets you turn a value-level guard into the
   * error channel without writing a manual `throw` inside a `Try(() => ...)` body.
   * @param predicate - The predicate to test the success value
   * @param onUnsatisfied - Builds the Error for the new Failure when the predicate fails
   * @returns A Success if the predicate holds, a Failure carrying `onUnsatisfied(value)` otherwise
   */
  filterOrElse(predicate: (value: T) => boolean, onUnsatisfied: (value: T) => Error): Try<T>
  toValue(): { _tag: TypeNames; value: T | Error }
  /**
   * Custom JSON serialization. Success emits `{"@functype":"Try","_tag":"Success","value":T}`.
   * Failure emits `{"@functype":"Try","_tag":"Failure","error":SerializedError}` where
   * SerializedError captures `name`, `message`, `stack`, and the full `cause` chain —
   * `e.name` survives round-trip but `instanceof SomeError` does not.
   */
  toJSON():
    { "@functype": "Try"; _tag: "Success"; value: T } | { "@functype": "Try"; _tag: "Failure"; error: SerializedError }
}

/** A Success as its prototype sees it. It now keeps its value as data (#276 §9a, §14). */
type SuccessShape<T> = Try<T> & { readonly _tag: "Success"; readonly value: T; readonly error: undefined }
/** A Failure as its prototype sees it. */
type FailureShape<T> = Try<T> & { readonly _tag: "Failure"; readonly value: undefined; readonly error: Error }

const toError = (e: unknown): Error => (e instanceof Error ? e : new Error(String(e)))

/** Every Success shares these methods (#276 §14). `this.value` is the Success's own data. */
const SuccessProto = define<SuccessShape<A>>()("Success", {
  [Symbol.toStringTag]: "Try",
  isSuccess(): this is Try<A> & { readonly _tag: "Success"; error: undefined } {
    return true
  },
  isFailure(): this is Try<A> & { readonly _tag: "Failure"; error: Error } {
    return false
  },
  orElse() {
    return this.value
  },
  orThrow() {
    return this.value
  },
  expect() {
    return this.value
  },
  or() {
    return this
  },
  orNull() {
    return this.value
  },
  orUndefined() {
    return this.value
  },
  toEither() {
    return Right(this.value)
  },
  map(f) {
    return Try(() => f(this.value))
  },
  ap(ff) {
    return ff.map((f) => f(this.value))
  },
  flatMap(f) {
    return f(this.value)
  },
  async flatMapAsync(f) {
    return f(this.value)
  },
  fold(_onFailure, onSuccess) {
    return onSuccess(this.value)
  },
  async foldAsync(_onFailure, onSuccess) {
    return onSuccess(this.value)
  },
  match(patterns) {
    return patterns.Success(this.value)
  },
  recover() {
    return this
  },
  recoverWith() {
    return this
  },
  filterOrElse(predicate, onUnsatisfied) {
    try {
      return predicate(this.value) ? this : Failure(onUnsatisfied(this.value))
    } catch (e) {
      return Failure(toError(e))
    }
  },
  foldLeft(z) {
    return (op) => op(z, this.value)
  },
  foldRight(z) {
    return (op) => op(this.value, z)
  },
  toString() {
    return `Success(${showValue(this.value)})`
  },
  toPromise() {
    return Promise.resolve(this.value)
  },
  toValue() {
    return { _tag: "Success", value: this.value }
  },
  toJSON() {
    return { "@functype": "Try", _tag: "Success", value: this.value }
  },
  toOption() {
    return Some(this.value)
  },
  toList() {
    return List([this.value])
  },
  toArray() {
    return [this.value]
  },
  toTry() {
    return this
  },
  pipe(f) {
    return f(this.value)
  },
  serialize() {
    return createSerializer("Try", "Success", this.value)
  },
  contains(v) {
    return this.value === v
  },
  exists(p) {
    return p(this.value)
  },
  every(p) {
    return p(this.value)
  },
  forEach(f) {
    f(this.value)
  },
  doUnwrap(): DoResult<A> {
    return { ok: true, value: this.value }
  },
})

/** Every Failure shares these methods. `this.error` is the Failure's own data. */
const FailureProto = define<FailureShape<A>>()("Failure", {
  [Symbol.toStringTag]: "Try",
  isSuccess(): this is Try<A> & { readonly _tag: "Success"; error: undefined } {
    return false
  },
  isFailure(): this is Try<A> & { readonly _tag: "Failure"; error: Error } {
    return true
  },
  orElse(defaultValue) {
    return defaultValue
  },
  orThrow(e) {
    throw e === undefined ? this.error : typeof e === "function" ? e(this.error) : e
  },
  expect(handler) {
    return handler(this.error)
  },
  or(alternative) {
    return alternative
  },
  orNull() {
    return null
  },
  orUndefined() {
    return undefined
  },
  toEither<E extends Type>(leftOrBuilder: E | ((err: Error) => E)) {
    return Left<E, A>(
      typeof leftOrBuilder === "function" ? (leftOrBuilder as (e: Error) => E)(this.error) : leftOrBuilder,
    )
  },
  map() {
    return Failure(this.error)
  },
  ap() {
    return Failure(this.error)
  },
  flatMap() {
    return Failure(this.error)
  },
  flatMapAsync() {
    return Promise.resolve(Failure(this.error))
  },
  fold(onFailure) {
    return onFailure(this.error)
  },
  async foldAsync(onFailure) {
    return onFailure(this.error)
  },
  match(patterns) {
    return patterns.Failure(this.error)
  },
  recover(f) {
    return Try(() => f(this.error))
  },
  recoverWith(f) {
    try {
      return f(this.error)
    } catch (e) {
      return Failure(toError(e))
    }
  },
  filterOrElse() {
    return this
  },
  foldLeft(z) {
    return () => z
  },
  foldRight(z) {
    return () => z
  },
  toString() {
    return `Failure(${showValue(this.error)})`
  },
  toPromise() {
    return Promise.reject(this.error)
  },
  toValue() {
    return { _tag: "Failure", value: this.error }
  },
  toJSON() {
    return { "@functype": "Try", _tag: "Failure", error: serializeError(this.error) }
  },
  toOption() {
    return Option<A>(null)
  },
  toList() {
    return List<A>([])
  },
  toArray() {
    return []
  },
  toTry() {
    return this
  },
  pipe() {
    throw this.error
  },
  serialize() {
    return createTaggedSerializer("Try", "Failure", { error: serializeError(this.error) })
  },
  contains() {
    return false
  },
  exists() {
    return false
  },
  every() {
    return true
  },
  forEach() {},
  doUnwrap(): DoResult<never> {
    return { ok: false, empty: false, error: this.error }
  },
})

/* eslint-disable functional/immutable-data -- each constructor fills in the object it just created */
// The one cast in each: a prototype checked at the opaque A works for every T.
const Success = <T>(value: T): Try<T> => {
  const success = Object.create(SuccessProto) as Mutable<SuccessShape<T>>
  success._tag = "Success"
  success.value = value
  success.error = undefined
  return success
}

const Failure = <T>(error: Error): Try<T> => {
  const failure = Object.create(FailureProto) as Mutable<FailureShape<T>>
  failure._tag = "Failure"
  failure.value = undefined
  failure.error = error
  return failure
}
/* eslint-enable functional/immutable-data */

const TryConstructor = <T>(f: () => T): Try<T> => {
  try {
    return Success(f())
  } catch (error) {
    return Failure(error instanceof Error ? error : new Error(String(error)))
  }
}

/** Rebuilds a Try from a parsed envelope. Shared by `fromJSON` and `fromYAML`. */
const tryFromEnvelope = <T>(parsed: ParsedEnvelope, method: string): Try<T> => {
  expectMarker(parsed, "Try", method)
  if (parsed._tag === "Success") {
    return Success<T>(parsed.value as T)
  }
  // Failure: prefer the SerializedError shape (an object); fall back to the
  // 1.1.0 flat shape ({error: string, stack: string}) for back-compat.
  if (parsed.error !== undefined && parsed.error !== null && typeof parsed.error === "object") {
    return Failure<T>(deserializeError(parsed.error as SerializedError))
  }
  const legacyError = new Error(typeof parsed.error === "string" ? parsed.error : "")
  if (typeof parsed.stack === "string" && parsed.stack) {
    legacyError.stack = parsed.stack
  }
  return Failure<T>(legacyError)
}

const TryCompanion = {
  /**
   * Creates a Success directly without needing a callback
   * @param value - The success value
   * @returns Try containing the value as Success
   */
  success: <T>(value: T): Try<T> => Success(value),
  /**
   * Creates a Failure directly without needing to throw
   * @param error - The error (string or Error instance)
   * @returns Try containing the error as Failure
   */
  failure: <T>(error: Error | string): Try<T> => Failure<T>(typeof error === "string" ? new Error(error) : error),
  /**
   * Creates a Try from a Promise, resolving to Success or Failure
   * @param promise - The promise to convert
   * @returns Promise resolving to a Try
   */
  fromPromise: <T>(promise: Promise<T>): Promise<Try<T>> =>
    promise
      .then((value) => Success<T>(value))
      .catch((error) => Failure<T>(error instanceof Error ? error : new Error(String(error)))),
  /**
   * Creates a Try from a thunk that returns a Promise. The thunk is invoked
   * when async() is called, so the Promise starts executing under the Try
   * wrapper — synchronous throws from the thunk are caught the same way
   * `Try(() => sync)` catches them, and rejections are caught the same way
   * `Try.fromPromise(promise)` catches them.
   *
   * Prefer this over `Try.fromPromise(thunk())` when you want the work to be
   * deferred until wrapping (e.g. composing a chain of Try-returning thunks
   * before any of them runs).
   *
   * @example
   *   const result = await Try.async(() => fs.readFile(path, "utf8"))
   *   result.fold(err => log(err.message), data => process(data))
   *
   * @param thunk - Function returning a Promise to be wrapped
   * @returns Promise resolving to a Try
   */
  async: <T>(thunk: () => Promise<T>): Promise<Try<T>> => {
    try {
      const promise = thunk()
      return promise
        .then((value) => Success<T>(value))
        .catch((error) => Failure<T>(error instanceof Error ? error : new Error(String(error))))
    } catch (error) {
      return Promise.resolve(Failure<T>(error instanceof Error ? error : new Error(String(error))))
    }
  },
  /**
   * Type guard to check if a Try is Success
   * @param tryValue - The Try to check
   * @returns True if Try is Success
   */
  isSuccess: <T>(tryValue: Try<T>): tryValue is Try<T> & { readonly _tag: "Success"; error: undefined } =>
    tryValue.isSuccess(),
  /**
   * Type guard to check if a Try is Failure
   * @param tryValue - The Try to check
   * @returns True if Try is Failure
   */
  isFailure: <T>(tryValue: Try<T>): tryValue is Try<T> & { readonly _tag: "Failure"; error: Error } =>
    tryValue.isFailure(),
  /**
   * Creates a Try from JSON string
   * @param json - The JSON string
   * @returns Try instance
   */
  fromJSON: <T>(json: string): Try<T> => tryFromEnvelope<T>(JSON.parse(json) as ParsedEnvelope, "fromJSON"),

  /**
   * Creates a Try from YAML string
   * @param yaml - The YAML string
   * @returns Try instance
   */
  fromYAML: <T>(yaml: string): Try<T> =>
    readYAML(yaml, (parsed) => {
      expectMarker(parsed, "Try", "fromYAML")
      if (typeof parsed._tag !== "string") {
        return Failure<T>(new Error("Invalid YAML format for Try"))
      }
      if (parsed._tag === "Success" && !hasYAMLValue(yaml, "value")) {
        return Failure<T>(new Error("Invalid YAML format for Try Success"))
      }
      if (parsed._tag !== "Success" && !hasYAMLValue(yaml, "error")) {
        return Failure<T>(new Error("Invalid YAML format for Try Failure"))
      }
      return tryFromEnvelope<T>(parsed, "fromYAML")
    }),

  /**
   * Creates a Try from binary string
   * @param binary - The binary string
   * @returns Try instance
   */
  fromBinary: <T>(binary: string): Try<T> => {
    const json = base64ToUtf8(binary)
    return TryCompanion.fromJSON<T>(json)
  },
  /**
   * Combines an array of Trys into a single Try containing an array.
   * Short-circuits on the first Failure, preserving its error.
   * @param tries - Array of Try values
   * @returns Success with array of values, or first Failure
   */
  sequence: <T>(tries: ReadonlyArray<Try<T>>): Try<T[]> => Try(() => tries.map((t) => t.orThrow())),
  /**
   * Maps an array through a function returning Try, then sequences the results.
   * Short-circuits on the first Failure.
   * @param arr - Array of values
   * @param f - Function returning Try
   * @returns Success with array of mapped values, or first Failure
   */
  traverse: <T, U>(arr: ReadonlyArray<T>, f: (value: T, index: number) => Try<U>): Try<U[]> =>
    Try(() => arr.map((item, i) => f(item, i).orThrow())),
}

export const Try = Companion(TryConstructor, TryCompanion)
