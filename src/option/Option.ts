import stringify from "safe-stable-stringify"

import type { Foldable } from "@/foldable"
import type { AsyncFunctor, Functor, Type } from "@/functor"
import type { Pipe } from "@/pipe"
import type { Serializable } from "@/serializable/Serializable"
import { Typeable } from "@/typeable/Typeable"
import { Valuable } from "@/valuable/Valuable"

import { Companion, Either, Left, List, Right, type Traversable } from "../index"

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
export type Option<T extends Type> = {
  /** Tag identifying if this is a Some or None variant */
  readonly _tag: "Some" | "None"
  /** The contained value (undefined for None) */
  readonly value: T | undefined
  /** Whether this Option contains no value */
  isEmpty: boolean
  /**
   * Extracts the value if present
   * @throws Error if the Option is None
   * @returns The contained value
   */
  get(): T
  /**
   * Returns the contained value or a default value if None
   * @param defaultValue - The value to return if this Option is None
   * @returns The contained value or defaultValue
   */
  getOrElse(defaultValue: T): T
  /**
   * Returns the contained value or throws a specified error if None
   * @param error - The error to throw if this Option is None
   * @returns The contained value
   * @throws The specified error if the Option is None
   */
  getOrThrow(error: Error): T
  /**
   * Returns this Option if it contains a value, otherwise returns the alternative
   * @param alternative - The alternative Option to return if this is None
   * @returns This Option or the alternative
   */
  orElse(alternative: Option<T>): Option<T>
  /**
   * Returns the contained value or null if None
   * @returns The contained value or null
   */
  orNull(): T | null
  /**
   * Maps the value inside the Option using the provided function
   * @param f - The mapping function
   * @returns A new Option containing the mapped value, or None if this Option is None
   */
  map<U extends Type>(f: (value: T) => U): Option<U>
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
   * Applies a binary operator to a start value and the contained value
   * @param f - The binary operator
   * @returns The result of the reduction
   */
  reduce<U>(f: (acc: U, value: T) => U): U
  /**
   * Applies a binary operator to the contained value and a start value
   * @param f - The binary operator
   * @returns The result of the reduction
   */
  reduceRight<U>(f: (acc: U, value: T) => U): U
  /**
   * Pattern matches over the Option, applying onNone if None and onSome if Some
   * @param onNone - Function to apply if the Option is None
   * @param onSome - Function to apply if the Option has a value
   * @returns The result of applying the appropriate function
   */
  fold<U>(onNone: () => U, onSome: (value: T) => U): U
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
   * Converts this Option to a List
   * @returns A List containing the value if Some, or empty List if None
   */
  toList(): List<T>
  /**
   * Checks if this Option contains the specified value
   * @param value - The value to check for
   * @returns true if this Option contains the value, false otherwise
   */
  contains(value: T): boolean
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
} & (Traversable<T> &
  Functor<T> &
  Typeable<"Some" | "None"> &
  Valuable<"Some" | "None", T> &
  AsyncFunctor<T> &
  Serializable<T> &
  Pipe<T> &
  Foldable<T>)

/**
 * Creates a Some variant of Option containing a value.
 * @param value - The value to wrap in Some
 * @returns A new Some instance containing the value
 * @typeParam T - The type of the value
 */
export const Some = <T extends Type>(value: T): Option<T> => ({
  _tag: "Some",
  value,
  isEmpty: false,
  get: () => value,
  getOrElse: () => value,
  getOrThrow: () => value,
  orElse: () => Some(value),
  orNull: () => value,
  map: <U extends Type>(f: (value: T) => U) => Some(f(value)),
  filter(predicate: (value: T) => boolean) {
    if (predicate(value)) {
      return Some<T>(value) // type narrowing
    } else {
      return NONE as unknown as Option<T>
    }
  },
  fold: <U extends Type>(_onNone: () => U, onSome: (value: T) => U) => {
    return onSome(value)
  },
  flatMap: <U extends Type>(f: (value: T) => Option<U>) => f(value),
  flatMapAsync: async <U extends Type>(f: (value: T) => Promise<Option<U>>) => {
    return await f(value)
  },
  reduce: <U>(f: (acc: U, value: T) => U) => f(undefined as never, value),
  reduceRight: <U>(f: (acc: U, value: T) => U) => f(undefined as never, value),
  foldLeft:
    <B>(z: B) =>
    (op: (b: B, a: T) => B) =>
      op(z, value),
  foldRight:
    <B>(z: B) =>
    (op: (a: T, b: B) => B) =>
      op(value, z),
  toList: () => List<T>([value]),
  contains: (val: T) => val === value,
  size: 1,
  toEither: <E>(_left: E) => Right<E, T>(value),
  toString: () => `Some(${stringify(value)})`,
  toValue: () => ({ _tag: "Some", value }),
  pipe: <U extends Type>(f: (value: T) => U) => f(value),
  serialize: () => {
    return {
      toJSON: () => JSON.stringify({ _tag: "Some", value }),
      toYAML: () => `_tag: Some\nvalue: ${stringify(value)}`,
      toBinary: () => Buffer.from(JSON.stringify({ _tag: "Some", value })).toString("base64"),
    }
  },
})

const NONE: Option<never> = {
  _tag: "None",
  value: undefined as never,
  isEmpty: true,
  get: () => {
    throw new Error("Cannot call get() on None")
  },
  getOrElse: <T>(defaultValue: T) => defaultValue,
  getOrThrow<T>(error: Error): T {
    throw error
  },
  orElse: <T>(alternative: Option<T>) => alternative,
  orNull: () => null,
  map: <U extends Type>(_f: (value: never) => U) => NONE as unknown as Option<U>,
  filter(_predicate: (value: never) => boolean): Option<never> {
    return NONE
  },
  flatMap: <U extends Type>(_f: (value: never) => Option<U>) => NONE as unknown as Option<U>,
  flatMapAsync: async <U extends Type>(_f: (value: never) => Promise<Option<U>>) => {
    return NONE as unknown as Option<U>
  },
  reduce: () => undefined as never,
  reduceRight: () => undefined as never,
  fold: <U extends Type>(onNone: () => U, _onSome: (value: never) => U) => {
    return onNone()
  },
  foldLeft:
    <B>(z: B) =>
    () =>
      z,
  foldRight:
    <B>(z: B) =>
    () =>
      z,
  toList: () => List([]),
  contains: () => false,
  size: 0,
  toEither: <E>(left: E) => Left<E, never>(left),
  toString: () => "None",
  toValue: () => ({ _tag: "None", value: undefined as never }),
  pipe: <U extends Type>(f: (_value: never) => U) => f(undefined as never),
  serialize: () => {
    return {
      toJSON: () => JSON.stringify({ _tag: "None", value: null }),
      toYAML: () => "_tag: None\nvalue: null",
      toBinary: () => Buffer.from(JSON.stringify({ _tag: "None", value: null })).toString("base64"),
    }
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
   * Creates an Option from JSON string
   * @param json - The JSON string
   * @returns Option instance
   */
  fromJSON: <T>(json: string): Option<T> => {
    const parsed = JSON.parse(json)
    return parsed._tag === "Some" ? Some<T>(parsed.value) : None<T>()
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
    const value = valueStr === "null" ? null : JSON.parse(valueStr)
    return tag === "Some" ? Some<T>(value) : None<T>()
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
