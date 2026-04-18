import { Companion } from "@/companion/Companion"
import { type Doable, type DoResult } from "@/do/protocol"
import type { Functype } from "@/functype"
import { safeStringify } from "@/internal/stringify"
import type { Reshapeable } from "@/reshapeable"
import { createSerializer } from "@/serialization"
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
 * The Option type represents a value that may or may not exist.
 * It's used to handle potentially null or undefined values in a type-safe way.
 * @typeParam T - The type of the value contained in the Option
 */
export interface Option<out T extends Type>
  extends Functype<T, "Some" | "None">, Promisable<T>, Doable<T>, Reshapeable<T> {
  /** The contained value (undefined for None) */
  readonly value: T | undefined
  /** Whether this Option contains no value */
  isEmpty: boolean
  /**
   * Returns true if this Option is a Some (contains a value)
   * @returns true if this Option contains a value, false otherwise
   */
  isSome(): this is Option<T> & { value: T; isEmpty: false }
  /**
   * Returns true if this Option is a None (contains no value)
   * @returns true if this Option is empty, false otherwise
   */
  isNone(): this is Option<T> & { value: undefined; isEmpty: true }
  /**
   * Returns the contained value or a default value if None. The default may be of a
   * different type; the result widens to `T | T2` so Option stays covariant in T.
   * @param defaultValue - The value to return if this Option is None
   * @returns The contained value or defaultValue, typed as `T | T2`
   */
  orElse<T2 extends Type>(defaultValue: T2): T | T2
  /**
   * Returns the contained value or throws an error if None
   * @param error - Optional custom error to throw. If not provided, throws a default error
   * @returns The contained value
   * @throws The specified error or a default error if the Option is None
   */
  orThrow(error?: Error): T
  /**
   * Returns this Option if it contains a value, otherwise returns the alternative container.
   * The alternative may hold a different type; the result widens to `Option<T | T2>`.
   * @param alternative - The alternative Option to return if this is None
   * @returns This Option or the alternative, typed as `Option<T | T2>`
   */
  or<T2 extends Type>(alternative: Option<T2>): Option<T | T2>
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
   * Converts this Option to a List.
   * @returns A List containing the value if Some, or empty List if None
   */
  toList(): List<T>
  /** The number of elements in this Option (0 or 1) */
  size: number
  /**
   * Converts this Option to an Either
   * @param left - The value to use for Left if this Option is None
   * @returns Either.Right with the contained value if Some, or Either.Left with left if None
   */
  toEither<E>(left: E): Either<E, T>
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
   * Pattern matches over the Option, applying a handler function based on the variant
   * @param patterns - Object with handler functions for Some and None variants
   * @returns The result of applying the matching handler function
   */
  match<R>(patterns: { Some: (value: T) => R; None: () => R }): R
}

/**
 * Creates a Some variant of Option containing a value.
 * @param value - The value to wrap in Some
 * @returns A new Some instance containing the value
 * @typeParam T - The type of the value
 */
export const Some = <T extends Type>(value: T): Option<T> => ({
  [Symbol.toStringTag]: "Option",
  _tag: "Some",
  value,
  isEmpty: false,
  isSome(): this is Option<T> & { value: T; isEmpty: false } {
    return true
  },
  isNone(): this is Option<T> & { value: undefined; isEmpty: true } {
    return false
  },
  orElse: <T2 extends Type>(_defaultValue: T2): T | T2 => value,
  orThrow: () => value,
  or: <T2 extends Type>(_alternative: Option<T2>): Option<T | T2> => Some<T | T2>(value),
  orNull: () => value,
  orUndefined: () => value,
  map: <U extends Type>(f: (value: T) => U) => Some(f(value)),
  ap: <U extends Type>(ff: Option<(value: T) => U>) =>
    ff._tag === "Some" && ff.value ? Some(ff.value(value)) : (NONE as unknown as Option<U>),
  filter(predicate: (value: T) => boolean) {
    if (predicate(value)) {
      return Some<T>(value) // type narrowing
    } else {
      return NONE as unknown as Option<T>
    }
  },
  count: (p: (x: T) => boolean) => (p(value) ? 1 : 0),
  find: (p: (a: T) => boolean) => (p(value) ? Some(value) : (NONE as unknown as Option<T>)),
  exists: (p: (a: T) => boolean) => p(value),
  forEach: (f: (a: T) => void) => f(value),
  fold: <U extends Type>(_onNone: () => U, onSome: (value: T) => U) => {
    return onSome(value)
  },
  foldAsync: async <U extends Type>(_onNone: () => U | Promise<U>, onSome: (value: T) => U | Promise<U>) =>
    onSome(value),
  match: <R>(patterns: { Some: (value: T) => R; None: () => R }): R => {
    return patterns.Some(value)
  },
  flatMap: <U extends Type>(f: (value: T) => Option<U>) => f(value),
  flatMapAsync: async <U extends Type>(f: (value: T) => Promise<Option<U>>) => {
    return await f(value)
  },
  reduce: <B = T>(_op: (b: Widen<T, B>, a: Widen<T, B>) => Widen<T, B>): Widen<T, B> => value as unknown as Widen<T, B>,
  reduceRight: <B = T>(_op: (b: Widen<T, B>, a: Widen<T, B>) => Widen<T, B>): Widen<T, B> =>
    value as unknown as Widen<T, B>,
  foldLeft:
    <B>(z: B) =>
    (op: (b: B, a: T) => B) =>
      op(z, value),
  foldRight:
    <B>(z: B) =>
    (op: (a: T, b: B) => B) =>
      op(value, z),
  contains: (val: T) => val === value,
  toList: () => List<T>([value]),
  size: 1,
  toOption: () => Some(value),
  toEither: <E>(_left: E) => Right<E, T>(value),
  toTry: () => Try(() => value),
  toPromise: (): Promise<T> => Promise.resolve(value),
  toString: () => `Some(${safeStringify(value)})`,
  toValue: () => ({ _tag: "Some", value }),
  pipe: <U extends Type>(f: (value: T) => U) => f(value),
  serialize: () => createSerializer("Some", value),
  // Implement Doable interface for Do-notation
  doUnwrap(): DoResult<T> {
    return { ok: true, value }
  },
})

const NONE: Option<never> = {
  [Symbol.toStringTag]: "Option",
  _tag: "None",
  value: undefined as never,
  isEmpty: true,
  isSome(): this is Option<never> & { value: never; isEmpty: false } {
    return false
  },
  isNone(): this is Option<never> & { value: undefined; isEmpty: true } {
    return true
  },
  orElse: <T2 extends Type>(defaultValue: T2): never | T2 => defaultValue,
  orThrow<T>(error?: Error): T {
    throw error ?? new Error("Cannot extract value from None")
  },
  or: <T2 extends Type>(alternative: Option<T2>): Option<never | T2> => alternative,
  orNull: () => null,
  orUndefined: () => undefined,
  map: <U extends Type>(_f: (value: never) => U) => NONE as unknown as Option<U>,
  ap: <U extends Type>(_ff: Option<(value: never) => U>) => NONE as unknown as Option<U>,
  filter(_predicate: (value: never) => boolean): Option<never> {
    return NONE
  },
  count: (_p: (x: never) => boolean) => 0,
  find: (_p: (a: never) => boolean) => NONE as unknown as Option<never>,
  exists: (_p: (a: never) => boolean) => false,
  forEach: (_f: (a: never) => void) => {},
  flatMap: <U extends Type>(_f: (value: never) => Option<U>) => NONE as unknown as Option<U>,
  flatMapAsync: <U extends Type>(_f: (value: never) => Promise<Option<U>>): Promise<Option<U>> => {
    return Promise.resolve(NONE as unknown as Option<U>)
  },
  reduce: <B = never>(_op: (b: Widen<never, B>, a: Widen<never, B>) => Widen<never, B>): Widen<never, B> => {
    throw new Error("Cannot reduce an empty Option")
  },
  reduceRight: <B = never>(_op: (b: Widen<never, B>, a: Widen<never, B>) => Widen<never, B>): Widen<never, B> => {
    throw new Error("Cannot reduceRight an empty Option")
  },
  fold: <U extends Type>(onNone: () => U, _onSome: (value: never) => U) => {
    return onNone()
  },
  foldAsync: async <U extends Type>(onNone: () => U | Promise<U>, _onSome: (value: never) => U | Promise<U>) =>
    onNone(),
  match: <R>(patterns: { Some: (value: never) => R; None: () => R }): R => {
    return patterns.None()
  },
  foldLeft:
    <B>(z: B) =>
    () =>
      z,
  foldRight:
    <B>(z: B) =>
    () =>
      z,
  contains: () => false,
  toList: () => List([]),
  size: 0,
  toOption: <T>() => NONE as unknown as Option<T>,
  toEither: <E>(left: E) => Left<E, never>(left),
  toTry: <T>() =>
    Try<T>(() => {
      throw new Error("None")
    }),
  toPromise: <T>(): Promise<T> => Promise.reject(new Error("Cannot convert None to Promise")),
  toString: () => "None",
  toValue: () => ({ _tag: "None", value: undefined as never }),
  pipe: <U extends Type>(f: (_value: never) => U) => f(undefined as never),
  serialize: () => createSerializer("None", null),
  // Implement Doable interface for Do-notation
  doUnwrap(): DoResult<never> {
    return { ok: false, empty: true }
  },
}

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
  isSome: <T>(option: Option<T>): option is Option<T> & { value: T; isEmpty: false } => option.isSome(),
  /**
   * Type guard to check if an Option is None
   * @param option - The Option to check
   * @returns True if Option is None
   */
  isNone: <T>(option: Option<T>): option is Option<T> & { value: undefined; isEmpty: true } => option.isNone(),
  /**
   * Creates an Option from JSON string
   * @param json - The JSON string
   * @returns Option instance
   */
  fromJSON: <T>(json: string): Option<T> => {
    const parsed = JSON.parse(json) as { _tag: string; value: T | null }
    return parsed._tag === "Some" ? Some<T>(parsed.value as T) : None<T>()
  },
  /**
   * Creates an Option from YAML string
   * @param yaml - The YAML string
   * @returns Option instance
   */
  fromYAML: <T>(yaml: string): Option<T> => {
    const lines = yaml.split("\n")
    const tag = lines[0]?.split(": ")[1]
    const valueStr = lines[1]?.split(": ")[1]
    if (!tag || !valueStr) {
      return None<T>()
    }
    const value = valueStr === "null" ? null : (JSON.parse(valueStr) as T)
    return tag === "Some" ? Some<T>(value as T) : None<T>()
  },
  /**
   * Creates an Option from binary string
   * @param binary - The binary string
   * @returns Option instance
   */
  fromBinary: <T>(binary: string): Option<T> => {
    const json = Buffer.from(binary, "base64").toString()
    return OptionCompanion.fromJSON<T>(json)
  },
}

export const Option = Companion(OptionConstructor, OptionCompanion)
