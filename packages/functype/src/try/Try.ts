import { Companion } from "@/companion/Companion"
import { type Doable, type DoResult } from "@/do/protocol"
import type { Either } from "@/either/Either"
import { Left, Right } from "@/either/Either"
import type { Extractable } from "@/extractable"
import type { FunctypeSum } from "@/functype"
import { safeStringify } from "@/internal/stringify"
import { List } from "@/list"
import { Option, Some } from "@/option"
import type { Pipe } from "@/pipe"
import type { Reshapeable } from "@/reshapeable"
import type { SerializedError } from "@/serialization"
import { createSerializer, createTaggedSerializer, deserializeError, serializeError } from "@/serialization"
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
  orThrow: (error?: Error) => T
  /**
   * Returns the success value, or calls the never-returning handler with the Failure's error.
   * Use this when you have a helper like `(msg) => fail(msg, 2)` that terminates the program —
   * the result type is unconditionally `T`, so you avoid the TypeScript narrowing trap where
   * `if (t.isFailure()) fail(...)` fails to narrow `t.value` when `fail` is an arrow function
   * typed as `(...): never`.
   */
  expect: (handler: (error: Error) => never) => T
  or<T2 extends Type>(alternative: Try<T2>): Try<T | T2>
  orNull: () => T | null
  orUndefined: () => T | undefined
  toOption: () => Option<T>
  /**
   * Converts to a plain readonly array: `[value]` for Success, `[]` for Failure.
   * Symmetric with `Try.toList()` but skips the List wrapper for code that
   * just wants to feed Array.prototype methods or spread into another array.
   */
  toArray: () => readonly T[]
  /**
   * Converts to Either<E, T>. Failure becomes Left(builder(error)) when given a function,
   * or Left(leftValue) when given a value. Success becomes Right(value).
   *
   * Prefer the function form to thread the underlying Error's context into the Left:
   *
   *   Try.fromYAML(text).toEither((e) => `parse failed: ${e.message}`)
   */
  toEither: <E extends Type>(leftOrBuilder: E | ((err: Error) => E)) => Either<E, T>
  toTry: () => Try<T>
  map: <U>(f: (value: T) => U) => Try<U>
  ap: <U>(ff: Try<(value: T) => U>) => Try<U>
  flatMap: <U>(f: (value: T) => Try<U>) => Try<U>
  flatMapAsync: <U>(f: (value: T) => Promise<Try<U>>) => Promise<Try<U>>
  /**
   * Pattern matches over the Try, applying onFailure if Failure and onSuccess if Success
   * @param onFailure - Function to apply if the Try is Failure
   * @param onSuccess - Function to apply if the Try is Success
   * @returns The result of applying the appropriate function
   */
  fold: <U extends Type>(onFailure: (error: Error) => U, onSuccess: (value: T) => U) => U
  /**
   * Async variant of fold. Accepts sync or async handlers on either branch and
   * always returns a Promise.
   */
  foldAsync: <U extends Type>(
    onFailure: (error: Error) => U | Promise<U>,
    onSuccess: (value: T) => U | Promise<U>,
  ) => Promise<U>
  toString: () => string
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
    | { "@functype": "Try"; _tag: "Success"; value: T }
    | { "@functype": "Try"; _tag: "Failure"; error: SerializedError }
}

const Success = <T>(value: T): Try<T> => ({
  [Symbol.toStringTag]: "Try",
  _tag: "Success",
  error: undefined,
  isSuccess(): this is Try<T> & { readonly _tag: "Success"; error: undefined } {
    return true
  },
  isFailure(): this is Try<T> & { readonly _tag: "Failure"; error: Error } {
    return false
  },
  orElse: <T2 extends Type>(_defaultValue: T2): T | T2 => value,
  orThrow: (_error?: Error) => value,
  expect: (_handler: (error: Error) => never): T => value,
  or: <T2 extends Type>(_alternative: Try<T2>): Try<T | T2> => Success<T | T2>(value),
  orNull: () => value,
  orUndefined: () => value,
  toEither: <E extends Type>(_leftOrBuilder: E | ((err: Error) => E)) => Right<E, T>(value),
  map: <U>(f: (value: T) => U) => Try(() => f(value)),
  ap: <U>(ff: Try<(value: T) => U>) => ff.map((f) => f(value)),
  flatMap: <U>(f: (value: T) => Try<U>) => f(value),
  flatMapAsync: async <U>(f: (value: T) => Promise<Try<U>>) => f(value),
  fold: <U extends Type>(_onFailure: (error: Error) => U, onSuccess: (value: T) => U): U => onSuccess(value),
  foldAsync: async <U extends Type>(
    _onFailure: (error: Error) => U | Promise<U>,
    onSuccess: (value: T) => U | Promise<U>,
  ) => onSuccess(value),
  match: <R>(patterns: { Success: (value: T) => R; Failure: (error: Error) => R }): R => patterns.Success(value),
  recover: <U extends Type>(_f: (error: Error) => U): Try<T | U> => Success<T | U>(value),
  recoverWith: <U extends Type>(_f: (error: Error) => Try<U>): Try<T | U> => Success<T | U>(value),
  filterOrElse: (predicate: (value: T) => boolean, onUnsatisfied: (value: T) => Error): Try<T> => {
    try {
      return predicate(value) ? Success<T>(value) : Failure<T>(onUnsatisfied(value))
    } catch (e) {
      return Failure<T>(e instanceof Error ? e : new Error(String(e)))
    }
  },
  foldLeft:
    <B>(z: B) =>
    (op: (b: B, a: T) => B) =>
      op(z, value),
  foldRight:
    <B>(z: B) =>
    (op: (a: T, b: B) => B) =>
      op(value, z),
  toString: () => `Success(${safeStringify(value)})`,
  toPromise: (): Promise<T> => Promise.resolve(value),
  toValue: () => ({ _tag: "Success", value }),
  toJSON: () => ({ "@functype": "Try" as const, _tag: "Success" as const, value }),
  toOption: () => Some(value),
  toList: () => List<T>([value]),
  toArray: () => [value] as readonly T[],
  toTry: () => Success(value),
  pipe: <U>(f: (value: T) => U) => f(value),
  serialize: () => createSerializer("Try", "Success", value),
  contains: (v: T) => value === v,
  exists: (p: (a: T) => boolean) => p(value),
  forEach: (f: (a: T) => void) => f(value),
  // Implement Doable interface for Do-notation
  doUnwrap(): DoResult<T> {
    return { ok: true, value }
  },
})

const Failure = <T>(error: Error): Try<T> => ({
  [Symbol.toStringTag]: "Try",
  _tag: "Failure",
  error,
  isSuccess(): this is Try<T> & { readonly _tag: "Success"; error: undefined } {
    return false
  },
  isFailure(): this is Try<T> & { readonly _tag: "Failure"; error: Error } {
    return true
  },
  orElse: <T2 extends Type>(defaultValue: T2): T | T2 => defaultValue,
  orThrow: (e?: Error) => {
    throw e ?? error
  },
  expect: (handler: (error: Error) => never): T => handler(error),
  or: <T2 extends Type>(alternative: Try<T2>): Try<T | T2> => alternative as Try<T | T2>,
  orNull: () => null,
  orUndefined: () => undefined,
  toEither: <E extends Type>(leftOrBuilder: E | ((err: Error) => E)) =>
    Left<E, T>(typeof leftOrBuilder === "function" ? (leftOrBuilder as (e: Error) => E)(error) : leftOrBuilder),
  map: <U>(_f: (value: T) => U) => Failure<U>(error),
  ap: <U>(_ff: Try<(value: T) => U>) => Failure<U>(error),
  flatMap: <U>(_f: (value: T) => Try<U>) => Failure<U>(error),
  flatMapAsync: <U>(_f: (value: T) => Promise<Try<U>>): Promise<Try<U>> => Promise.resolve(Failure<U>(error)),
  fold: <U extends Type>(onFailure: (error: Error) => U, _onSuccess: (value: T) => U): U => onFailure(error),
  foldAsync: async <U extends Type>(
    onFailure: (error: Error) => U | Promise<U>,
    _onSuccess: (value: T) => U | Promise<U>,
  ) => onFailure(error),
  match: <R>(patterns: { Success: (value: T) => R; Failure: (error: Error) => R }): R => patterns.Failure(error),
  recover: <U extends Type>(f: (error: Error) => U): Try<T | U> => Try(() => f(error)),
  recoverWith: <U extends Type>(f: (error: Error) => Try<U>): Try<T | U> => {
    try {
      return f(error)
    } catch (e) {
      return Failure<T | U>(e instanceof Error ? e : new Error(String(e)))
    }
  },
  filterOrElse: (_predicate: (value: T) => boolean, _onUnsatisfied: (value: T) => Error): Try<T> => Failure<T>(error),
  foldLeft:
    <B>(z: B) =>
    (_op: (b: B, a: T) => B) =>
      z, // No transformation on failure
  foldRight:
    <B>(z: B) =>
    (_op: (a: T, b: B) => B) =>
      z, // No transformation on failure
  toString: () => `Failure(${safeStringify(error)}))`,
  toPromise: (): Promise<T> => Promise.reject(error),
  toValue: () => ({ _tag: "Failure", value: error }),
  toJSON: () => ({
    "@functype": "Try" as const,
    _tag: "Failure" as const,
    error: serializeError(error),
  }),
  toOption: () => Option<T>(null),
  toList: () => List<T>([]),
  toArray: () => [] as readonly T[],
  toTry: () => Failure<T>(error),
  pipe: <U>(_f: (value: T) => U) => {
    throw error
  },
  serialize: () => createTaggedSerializer("Try", "Failure", { error: serializeError(error) }),
  contains: (_v: T) => false,
  exists: (_p: (a: T) => boolean) => false,
  forEach: (_f: (a: T) => void) => {},
  // Implement Doable interface for Do-notation
  doUnwrap(): DoResult<never> {
    return { ok: false, empty: false, error }
  },
})

const TryConstructor = <T>(f: () => T): Try<T> => {
  try {
    return Success(f())
  } catch (error) {
    return Failure(error instanceof Error ? error : new Error(String(error)))
  }
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
  fromJSON: <T>(json: string): Try<T> => {
    const parsed = JSON.parse(json) as {
      "@functype"?: string
      _tag?: string
      value?: T
      error?: SerializedError | string
      // 1.1.0 back-compat — older Failure envelopes used flat {error, stack} strings.
      stack?: string
    }
    if (parsed["@functype"] !== undefined && parsed["@functype"] !== "Try") {
      throw new Error(`Try.fromJSON: expected @functype="Try", got ${JSON.stringify(parsed["@functype"])}`)
    }
    if (parsed._tag === "Success") {
      return Success<T>(parsed.value as T)
    }
    // Failure: prefer the new SerializedError shape (object); fall back to the
    // 1.1.0 flat shape ({error: string, stack: string}) for back-compat.
    if (parsed.error !== undefined && typeof parsed.error === "object") {
      return Failure<T>(deserializeError(parsed.error))
    }
    const legacyError = new Error(typeof parsed.error === "string" ? parsed.error : "")
    if (parsed.stack) {
      legacyError.stack = parsed.stack
    }
    return Failure<T>(legacyError)
  },

  /**
   * Creates a Try from YAML string
   * @param yaml - The YAML string
   * @returns Try instance
   */
  fromYAML: <T>(yaml: string): Try<T> => {
    const lines = yaml.split("\n")
    const tag = lines[0]?.split(": ")[1]

    if (!tag) {
      return Failure<T>(new Error("Invalid YAML format for Try"))
    }

    if (tag === "Success") {
      const valueStr = lines[1]?.split(": ")[1]
      if (!valueStr) {
        return Failure<T>(new Error("Invalid YAML format for Try Success"))
      }
      const value = JSON.parse(valueStr) as T
      return Success<T>(value)
    } else {
      const errorMsg = lines[1]?.split(": ")[1]
      if (!errorMsg) {
        return Failure<T>(new Error("Invalid YAML format for Try Failure"))
      }
      const stackLine = lines[2]?.split(": ")
      const stack = stackLine && stackLine.length > 1 ? stackLine.slice(1).join(": ") : undefined
      const error = new Error(errorMsg)
      if (stack) {
        error.stack = stack
      }
      return Failure<T>(error)
    }
  },

  /**
   * Creates a Try from binary string
   * @param binary - The binary string
   * @returns Try instance
   */
  fromBinary: <T>(binary: string): Try<T> => {
    const json = Buffer.from(binary, "base64").toString()
    return TryCompanion.fromJSON<T>(json)
  },
  /**
   * Combines an array of Trys into a single Try containing an array.
   * Short-circuits on the first Failure, preserving its error.
   * @param tries - Array of Try values
   * @returns Success with array of values, or first Failure
   */
  sequence: <T>(tries: Try<T>[]): Try<T[]> => Try(() => tries.map((t) => t.orThrow())),
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
