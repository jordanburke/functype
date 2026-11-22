import { Companion } from "@/companion/Companion"
import { type Doable, type DoResult } from "@/do/protocol"
import type { Functype } from "@/functype"
import { base64ToUtf8 } from "@/internal/base64"
import { type A, define, type Mutable } from "@/internal/define"
import { showValue } from "@/internal/stringify"
import type { Reshapeable } from "@/reshapeable"
import { createSerializer, expectMarker, type ParsedEnvelope } from "@/serialization"
import type { Promisable, Widen } from "@/typeclass"
import type { Type } from "@/types"

import type { Either } from "../index"
import { Left, List, Right, Try } from "../index"

/**
 * Option type module
 * @module Option
 * @category Core
 */

/**
 * What every Option has, Some or None. `Option<T>` is the union of `SomeOf<T>` and `NoneOf<T>`, so
 * TypeScript narrows it on `isSome()`, `isNone()` and `_tag`, as it does Either.
 * @typeParam T - The type of the value contained in the Option
 */
export interface OptionBase<out T extends Type>
  extends Functype<T, "Some" | "None">, Promisable<T>, Doable<T>, Reshapeable<T> {
  /** The contained value (undefined for None) */
  readonly value: T | undefined
  /** Whether this Option contains no value */
  readonly isEmpty: boolean
  /**
   * Returns true if this Option is a Some (contains a value)
   * @returns true if this Option contains a value, false otherwise
   */
  isSome(): this is SomeOf<T>
  /**
   * Returns true if this Option is a None (contains no value)
   * @returns true if this Option is empty, false otherwise
   */
  isNone(): this is NoneOf<T>
  /**
   * Returns the contained value, or calls `defaultValue` if None. The default is lazy: it runs
   * only on None. The default is typed against `T` first, so `() => "light"` on an
   * `Option<"light" | "dark">` stays `"light" | "dark"`. A default of another type widens the
   * result to `T | T2`, which keeps Option covariant in T.
   * @param defaultValue - A function that returns the value to use if this Option is None
   * @returns The contained value or the default, typed as `T | T2`
   */
  getOrElse<T2 extends Type = never>(defaultValue: () => T | T2): T | T2
  /**
   * Returns the contained value or throws an error if None
   * @param error - Optional error to throw, or a builder that makes one (called only on None). If not
   *   provided, throws a default error
   * @returns The contained value
   * @throws The specified or built error, or a default error if the Option is None
   */
  orThrow(error?: Error | (() => Error)): T
  /**
   * Returns the contained value, or calls the never-returning handler if None.
   * Use this when you have a helper like `(msg) => fail(msg, 2)` that terminates the
   * program — the result type is unconditionally `T`, so you avoid the TypeScript
   * narrowing trap where `if (o.isNone()) fail(...)` fails to narrow `o.value` when
   * `fail` is an arrow function typed as `(...): never`.
   */
  expect(handler: () => never): T
  /**
   * Returns this Option if it contains a value, otherwise calls `alternative` for another Option.
   * The alternative is lazy: it runs only on None. It may hold a different type; the result
   * widens to `Option<T | T2>`.
   * @param alternative - A function that returns the Option to use if this is None
   * @returns This Option or the alternative, typed as `Option<T | T2>`
   */
  orElse<T2 extends Type>(alternative: () => Option<T2>): Option<T | T2>
  /**
   * Returns the contained value or null if None
   * @returns The contained value or null
   */
  orNull(): T | null
  /**
   * Returns the contained value or undefined if None
   * @returns The contained value or undefined
   */
  orUndefined(): T | undefined
  /**
   * Maps the value inside the Option using the provided function
   * @param f - The mapping function
   * @returns A new Option containing the mapped value, or None if this Option is None
   */
  map<U extends Type>(f: (value: T) => U): Option<U>
  /**
   * Applies a wrapped function to a wrapped value (Applicative pattern)
   * @param ff - An Option containing a function from T to U
   * @returns A new Option containing the result of applying the function
   */
  ap<U extends Type>(ff: Option<(value: T) => U>): Option<U>
  /**
   * Returns this Option if it contains a value that satisfies the predicate, otherwise returns None
   * @param predicate - The predicate function to test the value
   * @returns This Option or None
   */
  filter(predicate: (value: T) => boolean): Option<T>
  /**
   * Maps the value using a function that returns an Option
   * @param f - The mapping function returning an Option
   * @returns The result of applying f to the contained value, or None if this Option is None
   */
  flatMap<U extends Type>(f: (value: T) => Option<U>): Option<U>
  /**
   * Maps the value using an async function that returns an Option
   * @param f - The async mapping function returning an Option
   * @returns Promise of the result of applying f to the contained value, or None if this Option is None
   */
  flatMapAsync<U extends Type>(f: (value: T) => Promise<Option<U>>): Promise<Option<U>>
  /**
   * Pattern matches over the Option, applying onNone if None and onSome if Some
   * @param onNone - Function to apply if the Option is None
   * @param onSome - Function to apply if the Option has a value
   * @returns The result of applying the appropriate function
   */
  fold<U>(onNone: () => U, onSome: (value: T) => U): U
  /**
   * Async variant of fold. Accepts sync or async handlers on either branch and
   * always returns a Promise.
   */
  foldAsync<U>(onNone: () => U | Promise<U>, onSome: (value: T) => U | Promise<U>): Promise<U>
  /**
   * Left-associative fold using the provided zero value and operation
   * @param z - Zero/identity value
   * @returns A function that takes an operation to apply
   */
  foldLeft<B>(z: B): (op: (b: B, a: T) => B) => B
  /**
   * Right-associative fold using the provided zero value and operation
   * @param z - Zero/identity value
   * @returns A function that takes an operation to apply
   */
  foldRight<B>(z: B): (op: (a: T, b: B) => B) => B
  /**
   * Checks if this Option contains the specified value
   * @param value - The value to check for
   * @returns true if this Option contains the value, false otherwise
   */
  contains(value: T): boolean
  /**
   * Tests whether the value, if there is one, satisfies the predicate. The dual of `exists`, and
   * Scala's `forall`: `None` gives `true`, the same way `[].every(p)` does.
   * @param p - The predicate to test the value with
   * @returns `true` for None, otherwise `p(value)`
   * @example
   * ```typescript
   * Option("abc").every((s) => s.length > 2) // true
   * Option<string>(undefined).every((s) => s.length > 2) // true: nothing to fail
   * ```
   */
  every(p: (a: T) => boolean): boolean
  /**
   * Converts this Option to a List.
   * @returns A List containing the value if Some, or empty List if None
   */
  toList(): List<T>
  /**
   * Converts this Option to a plain readonly array.
   * @returns `[value]` if Some, `[]` if None. Symmetric with `toList()` but
   *   skips the List wrapper for code that just wants Array-prototype methods
   *   or spread into another array.
   */
  toArray(): readonly T[]
  /** The number of elements in this Option (0 or 1) */
  size: number
  /**
   * Converts this Option to an Either
   * @param leftOrBuilder - The Left value to use if None, or a thunk producing it.
   *   Pass a thunk when the Left value is expensive to construct or carries
   *   context (e.g. `() => ConfigError(missing)`) so the cost is paid only
   *   on the None path. Eager value is fine for cheap errors.
   * @returns Right(value) if Some, else Left(leftOrBuilder()) / Left(leftOrBuilder)
   */
  toEither<E>(leftOrBuilder: E | (() => E)): Either<E, T>
  /**
   * Returns a string representation of this Option
   * @returns A string representation
   */
  toString(): string
  /**
   * Returns a simple object representation of this Option
   * @returns An object with _tag and value properties
   */
  toValue(): { _tag: "Some" | "None"; value: T }
  /**
   * Custom JSON serialization producing the canonical `@functype`-marked
   * envelope so native `JSON.stringify` recursion (e.g. inside a plain
   * object) emits a round-trip-able shape.
   */
  toJSON(): { "@functype": "Option"; _tag: "Some" | "None"; value: T | null }
  /**
   * Pattern matches over the Option, applying a handler function based on the variant
   * @param patterns - Object with handler functions for Some and None variants
   * @returns The result of applying the matching handler function
   */
  match<R>(patterns: { Some: (value: T) => R; None: () => R }): R
}

/** An Option holding a value. Discriminated by `_tag: "Some"`. */
export interface SomeOf<out T extends Type> extends OptionBase<T> {
  readonly _tag: "Some"
  readonly value: T
  readonly isEmpty: false
}

/** An Option holding nothing. Discriminated by `_tag: "None"`. */
export interface NoneOf<out T extends Type> extends OptionBase<T> {
  readonly _tag: "None"
  readonly value: undefined
  readonly isEmpty: true
}

/**
 * A value that may or may not exist: a Some or a None. TypeScript narrows it across both branches of
 * `isSome()` / `isNone()` and `_tag` checks. Variance comes from SomeOf and NoneOf, because a union
 * type alias can't carry its own variance annotation.
 * @typeParam T - The type of the value contained in the Option
 */
export type Option<T extends Type> = SomeOf<T> | NoneOf<T>

/* eslint-disable functional/immutable-data -- each constructor fills in the object it just created */

/** Every Some shares these methods (#276 §14). `this.value` is the Some's own data. */
const SomeProto = define<SomeOf<A>>()("Some", {
  [Symbol.toStringTag]: "Option",
  isEmpty: false,
  size: 1,
  isSome(): this is SomeOf<A> {
    return true
  },
  isNone(): this is NoneOf<A> {
    return false
  },
  getOrElse() {
    return this.value
  },
  orThrow() {
    return this.value
  },
  expect() {
    return this.value
  },
  orElse() {
    return this
  },
  orNull() {
    return this.value
  },
  orUndefined() {
    return this.value
  },
  map(f) {
    return Some(f(this.value))
  },
  ap(ff) {
    return ff._tag === "Some" && ff.value ? Some(ff.value(this.value)) : NONE
  },
  filter(predicate) {
    return predicate(this.value) ? this : NONE
  },
  count(p) {
    return p(this.value) ? 1 : 0
  },
  find(p) {
    return p(this.value) ? this : NONE
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
  fold(_onNone, onSome) {
    return onSome(this.value)
  },
  async foldAsync(_onNone, onSome) {
    return onSome(this.value)
  },
  match(patterns) {
    return patterns.Some(this.value)
  },
  flatMap(f) {
    return f(this.value)
  },
  async flatMapAsync(f) {
    return f(this.value)
  },
  reduce<B>() {
    return this.value as unknown as Widen<A, B>
  },
  reduceRight<B>() {
    return this.value as unknown as Widen<A, B>
  },
  foldLeft(z) {
    return (op) => op(z, this.value)
  },
  foldRight(z) {
    return (op) => op(this.value, z)
  },
  contains(val) {
    return val === this.value
  },
  toList() {
    return List([this.value])
  },
  toArray() {
    return [this.value]
  },
  toOption() {
    return this
  },
  toEither() {
    return Right(this.value)
  },
  toTry() {
    return Try(() => this.value)
  },
  toPromise() {
    return Promise.resolve(this.value)
  },
  toString() {
    return `Some(${showValue(this.value)})`
  },
  toValue() {
    return { _tag: "Some", value: this.value }
  },
  toJSON() {
    return { "@functype": "Option", _tag: "Some", value: this.value }
  },
  pipe(f) {
    return f(this.value)
  },
  serialize() {
    return createSerializer("Option", "Some", this.value)
  },
  doUnwrap(): DoResult<A> {
    return { ok: true, value: this.value }
  },
})

/** The one None's methods. */
const NoneProto = define<NoneOf<A>>()("None", {
  [Symbol.toStringTag]: "Option",
  isEmpty: true,
  size: 0,
  isSome(): this is SomeOf<A> {
    return false
  },
  isNone(): this is NoneOf<A> {
    return true
  },
  getOrElse(defaultValue) {
    return defaultValue()
  },
  orThrow(error) {
    throw error === undefined
      ? new Error("Cannot extract value from None")
      : typeof error === "function"
        ? error()
        : error
  },
  expect(handler) {
    return handler()
  },
  orElse(alternative) {
    return alternative()
  },
  orNull() {
    return null
  },
  orUndefined() {
    return undefined
  },
  map() {
    return NONE
  },
  ap() {
    return NONE
  },
  filter() {
    return NONE
  },
  count() {
    return 0
  },
  find() {
    return NONE
  },
  exists() {
    return false
  },
  every() {
    return true
  },
  forEach() {},
  fold(onNone) {
    return onNone()
  },
  async foldAsync(onNone) {
    return onNone()
  },
  match(patterns) {
    return patterns.None()
  },
  flatMap() {
    return NONE
  },
  flatMapAsync() {
    return Promise.resolve(NONE)
  },
  reduce() {
    throw new Error("Cannot reduce an empty Option")
  },
  reduceRight() {
    throw new Error("Cannot reduceRight an empty Option")
  },
  foldLeft(z) {
    return () => z
  },
  foldRight(z) {
    return () => z
  },
  contains() {
    return false
  },
  toList() {
    return List([])
  },
  toArray() {
    return []
  },
  toOption() {
    return NONE
  },
  toEither<E>(leftOrBuilder: E | (() => E)) {
    return Left<E, A>(typeof leftOrBuilder === "function" ? (leftOrBuilder as () => E)() : leftOrBuilder)
  },
  toTry() {
    return Try(() => {
      throw new Error("None")
    })
  },
  toPromise() {
    return Promise.reject(new Error("Cannot convert None to Promise"))
  },
  toString() {
    return "None"
  },
  toValue() {
    return { _tag: "None", value: undefined as unknown as A }
  },
  toJSON() {
    return { "@functype": "Option", _tag: "None", value: null }
  },
  pipe(f) {
    return f(undefined as unknown as A)
  },
  serialize() {
    return createSerializer("Option", "None", null)
  },
  doUnwrap(): DoResult<never> {
    return { ok: false, empty: true }
  },
})

/**
 * Creates a Some variant of Option containing a value.
 * @param value - The value to wrap in Some
 * @returns A new Some instance containing the value
 * @typeParam T - The type of the value
 */
export const Some = <T extends Type>(value: T): Option<T> => {
  // The one cast: a prototype checked at the opaque A works for every T.
  const some = Object.create(SomeProto) as Mutable<SomeOf<T>>
  some._tag = "Some"
  some.value = value
  return some
}

const NONE: Option<never> = (() => {
  const none = Object.create(NoneProto) as Mutable<NoneOf<never>>
  none._tag = "None"
  none.value = undefined
  return none
})()

/* eslint-enable functional/immutable-data */

/**
 * Creates a None variant of Option representing absence of a value.
 * @returns A new None instance
 * @typeParam T - The type that would be contained if this was a Some
 */
export const None = <T extends Type>(): Option<T> => NONE as unknown as Option<T>

/**
 * Safely wraps a value that might be null or undefined in an Option.
 * Creates Some if the value is defined, None otherwise.
 * @param value - The value to wrap (might be null/undefined)
 * @returns Some(value) if value is defined, None otherwise
 * @typeParam T - The type of the value
 */
export const OptionConstructor = <T extends Type>(value: T | null | undefined): Option<T> =>
  value !== null && value !== undefined ? Some<T>(value) : None<T>()

/** Rebuilds an Option from a parsed envelope. */
const optionFromEnvelope = <T>(parsed: ParsedEnvelope, method: string): Option<T> => {
  expectMarker(parsed, "Option", method)
  return parsed._tag === "Some" ? Some<T>(parsed.value as T) : None<T>()
}

const OptionCompanion = {
  /**
   * Creates an Option from any value. Alias for Option function.
   * @param value - The value to wrap
   * @returns Some(value) if value is defined, None otherwise
   * @typeParam T - The type of the value
   */
  from: <T>(value: T) => Option(value),
  /**
   * Returns a None instance. Alias for None function.
   * @returns A None instance
   * @typeParam T - The type that would be contained if this was a Some
   */
  none: <T>() => None<T>(),
  /**
   * Type guard to check if an Option is Some
   * @param option - The Option to check
   * @returns True if Option is Some
   */
  isSome: <T>(option: Option<T>): option is SomeOf<T> => option.isSome(),
  /**
   * Type guard to check if an Option is None
   * @param option - The Option to check
   * @returns True if Option is None
   */
  isNone: <T>(option: Option<T>): option is NoneOf<T> => option.isNone(),
  /**
   * Creates an Option from JSON string
   * @param json - The JSON string
   * @returns Option instance
   */
  fromJSON: <T>(json: string): Option<T> => optionFromEnvelope<T>(JSON.parse(json) as ParsedEnvelope, "fromJSON"),
  /**
   * Creates an Option from binary string
   * @param binary - The binary string
   * @returns Option instance
   */
  fromBinary: <T>(binary: string): Option<T> => {
    const json = base64ToUtf8(binary)
    return OptionCompanion.fromJSON<T>(json)
  },
  /**
   * Combines an array of Options into a single Option containing an array.
   * Short-circuits on the first None.
   * @param options - Array of Option values
   * @returns Some with array of values, or None if any element is None
   */
  sequence: <T extends Type>(options: ReadonlyArray<Option<T>>): Option<T[]> =>
    options.reduce<Option<T[]>>(
      (acc, opt) => (acc.isEmpty || opt.isEmpty ? None<T[]>() : Some([...(acc.value as T[]), opt.value as T])),
      Some<T[]>([]),
    ),
  /**
   * Maps an array through a function returning Option, then sequences the results.
   * Short-circuits on the first None — `f` is not invoked for elements after the
   * first None result.
   * @param arr - Array of values
   * @param f - Function returning Option
   * @returns Some with array of mapped values, or None if any application returned None
   */
  traverse: <T extends Type, U extends Type>(
    arr: ReadonlyArray<T>,
    f: (value: T, index: number) => Option<U>,
  ): Option<U[]> =>
    arr.reduce<Option<U[]>>(
      (acc, item, i) => acc.flatMap((acc_) => f(item, i).map((u) => [...acc_, u])),
      Some<U[]>([]),
    ),
}

export const Option: OptionCompanion = Companion(OptionConstructor, OptionCompanion)

/** The type of `Option`: its constructor and its statics, named so that errors and hovers print `OptionCompanion`. */
export interface OptionCompanion extends OptionConstructorType, OptionStaticsType {}
type OptionConstructorType = typeof OptionConstructor
type OptionStaticsType = typeof OptionCompanion
