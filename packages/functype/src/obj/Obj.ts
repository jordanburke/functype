import { Companion } from "@/companion/Companion"
import { type Doable, type DoResult } from "@/do/protocol"
import type { Extractable } from "@/extractable/Extractable"
import type { Functype } from "@/functype"
import { safeStringify } from "@/internal/stringify"
import { Option } from "@/option"
import type { Reshapeable } from "@/reshapeable"
import { createSerializer } from "@/serialization"
import { Tuple } from "@/tuple"
import type { Promisable, Widen } from "@/typeclass"
import type { Type } from "@/types"

import { List, Right, Try } from "../index"

/**
 * Obj type module
 * @module Obj
 * @category Core
 */

/**
 * The Obj type wraps a plain JavaScript object and provides fluent,
 * immutable operations for building and transforming objects.
 *
 * @typeParam T - The record type of the contained object
 *
 * @example
 * ```typescript
 * // Build HTTP headers immutably with conditional auth
 * const headers = Obj({ "User-Agent": userAgent })
 *   .assign(options.headers)
 *   .when(requiresAuth, { Authorization: `Bearer ${token}` })
 *   .value()
 *
 * // Fluent object construction
 * Obj.of({ name: "John" })
 *   .set("age", 31)
 *   .merge({ city: "NYC" })
 *   .value()
 * ```
 */
// Note: Obj is invariant in T by design — T is a record type and
// `values()` / `keys()` / `entries()` depend on `keyof T`, which is
// contravariant. Widening T would lose key-type fidelity. Users get
// narrower Obj types that are NOT assignable to wider ones.
export interface Obj<T extends Record<string, Type>>
  extends
    Omit<Functype<T, "Obj">, "map" | "flatMap" | "flatMapAsync" | "ap">,
    Promisable<T>,
    Doable<T>,
    Reshapeable<T> {
  /** The contained object value */
  readonly data: T

  /**
   * Maps the contained object to a new object using the provided function
   * @param f - The mapping function (must return a Record)
   * @returns A new Obj containing the mapped value
   */
  map<U extends Record<string, Type>>(f: (value: T) => U): Obj<U>

  /**
   * FlatMaps the contained object using a function that returns an Obj
   * @param f - The flatMap function
   * @returns The Obj returned by f
   */
  flatMap<U extends Record<string, Type>>(f: (value: T) => Obj<U>): Obj<U>

  /**
   * Async flatMap for the contained object
   * @param f - The async flatMap function
   * @returns A Promise of the Obj returned by f
   */
  flatMapAsync<U extends Record<string, Type>>(f: (value: T) => PromiseLike<Obj<U>>): PromiseLike<Obj<U>>

  /**
   * Applies a wrapped function to the contained object
   * @param ff - An Obj containing a function from T to U
   * @returns A new Obj containing the result
   */
  ap<U extends Record<string, Type>>(ff: Obj<Record<string, Type>>): Obj<U>

  /**
   * Get a value by key, returning Option
   * @param key - The key to look up
   * @returns Option containing the value if present
   */
  get<K extends keyof T>(key: K): Option<T[K]>

  /**
   * Set a single key to a new value, returning a new Obj
   * @param key - The key to set (must exist in T)
   * @param value - The value to set
   * @returns A new Obj with the updated key
   */
  set<K extends keyof T>(key: K, value: T[K]): Obj<T>

  /**
   * Merge a partial of the same shape (no new keys)
   * @param partial - Partial object to merge
   * @returns A new Obj with merged values
   */
  assign(partial: Partial<T>): Obj<T>

  /**
   * Merge with a potentially wider type (can add new keys)
   * @param other - Object to merge in
   * @returns A new Obj with the merged type
   */
  merge<U extends Record<string, Type>>(other: U): Obj<T & U>

  /**
   * Conditionally merge a partial based on a boolean or predicate
   * @param condition - Boolean or predicate function
   * @param partial - Partial to merge if condition is true
   * @returns A new Obj, with or without the merge applied
   */
  when(condition: boolean | (() => boolean), partial: Partial<T>): Obj<T>

  /**
   * Return a new Obj without the specified keys
   * @param keys - Keys to remove
   * @returns A new Obj without the specified keys
   */
  omit<K extends keyof T>(...keys: K[]): Obj<Omit<T, K>>

  /**
   * Return a new Obj with only the specified keys
   * @param keys - Keys to keep
   * @returns A new Obj with only the specified keys
   */
  pick<K extends keyof T>(...keys: K[]): Obj<Pick<T, K>>

  /**
   * Return a List of keys
   * @returns List of string keys
   */
  keys(): List<string>

  /**
   * Return a List of values
   * @returns List of values
   */
  values(): List<T[keyof T]>

  /**
   * Return a List of [key, value] Tuples
   * @returns List of key-value Tuples
   */
  entries(): List<ReturnType<typeof Tuple<[string, T[keyof T]]>>>

  /**
   * Unwrap to the plain object
   * @returns The contained plain object
   */
  value(): T

  /**
   * Check if a key exists
   * @param key - The key to check
   * @returns true if the key exists
   */
  has<K extends keyof T>(key: K): boolean

  /**
   * Pattern match fold — applies onEmpty if empty, onValue if non-empty
   * @param onEmpty - Handler for empty Obj
   * @param onValue - Handler for non-empty Obj
   * @returns The result of the matching handler
   */
  fold<U extends Type>(onEmpty: () => U, onValue: (value: T) => U): U

  /**
   * Returns a string representation of this Obj
   * @returns A string representation
   */
  toString(): string
}

/**
 * Creates an Obj instance wrapping a plain object with immutable operations.
 * @param data - The plain object to wrap
 * @returns A new Obj instance
 * @typeParam T - The record type
 */
const ObjObject = <T extends Record<string, Type>>(data: T): Obj<T> => ({
  [Symbol.toStringTag]: "Obj",
  _tag: "Obj",
  data,

  // --- Core object operations ---

  get: <K extends keyof T>(key: K): Option<T[K]> => Option(data[key] as T[K] | undefined),

  set: <K extends keyof T>(key: K, val: T[K]): Obj<T> => ObjObject({ ...data, [key]: val } as T),

  assign: (partial: Partial<T>): Obj<T> => ObjObject({ ...data, ...partial }),

  merge: <U extends Record<string, Type>>(other: U): Obj<T & U> => ObjObject({ ...data, ...other } as T & U),

  when: (condition: boolean | (() => boolean), partial: Partial<T>): Obj<T> => {
    const shouldApply = typeof condition === "function" ? condition() : condition
    return shouldApply ? ObjObject({ ...data, ...partial }) : ObjObject(data)
  },

  omit: <K extends keyof T>(...keys: K[]): Obj<Omit<T, K>> => {
    const result = { ...data }
    for (const key of keys) delete result[key]
    return ObjObject(result as Omit<T, K>)
  },

  pick: <K extends keyof T>(...keys: K[]): Obj<Pick<T, K>> => {
    const result = {} as Pick<T, K>
    for (const key of keys) {
      if (key in data) (result as Record<string, unknown>)[key as string] = data[key]
    }
    return ObjObject(result)
  },

  keys: () => List(Object.keys(data)),

  values: () => List(Object.values(data) as T[keyof T][]),

  entries: () => List(Object.entries(data).map(([k, v]) => Tuple([k, v] as [string, T[keyof T]]))),

  has: <K extends keyof T>(key: K): boolean => key in data,

  value: () => data,

  // --- Functype contract ---

  get isEmpty() {
    return Object.keys(data).length === 0
  },

  get size() {
    return Object.keys(data).length
  },

  map: <U extends Record<string, Type>>(f: (value: T) => U): Obj<U> => ObjObject(f(data)),

  flatMap: <U extends Record<string, Type>>(f: (value: T) => Obj<U>): Obj<U> => f(data),

  flatMapAsync: async <U extends Record<string, Type>>(f: (value: T) => PromiseLike<Obj<U>>): Promise<Obj<U>> =>
    await f(data),

  ap: <U extends Record<string, Type>>(ff: Obj<Record<string, Type>>): Obj<U> => {
    const fn = ff.data as unknown as (value: T) => U
    return ObjObject(fn(data))
  },

  fold: <U extends Type>(onEmpty: () => U, onValue: (value: T) => U) =>
    Object.keys(data).length === 0 ? onEmpty() : onValue(data),

  match: <R>(patterns: { Obj: (value: T) => R }): R => patterns.Obj(data),

  foldLeft:
    <B>(z: B) =>
    (op: (b: B, a: T) => B) =>
      op(z, data),

  foldRight:
    <B>(z: B) =>
    (op: (a: T, b: B) => B) =>
      op(data, z),

  count: (p: (x: T) => boolean) => (p(data) ? 1 : 0),
  find: (p: (a: T) => boolean) => (p(data) ? Option(data) : Option(undefined as T | undefined)),
  exists: (p: (a: T) => boolean) => p(data),
  forEach: (f: (a: T) => void) => f(data),

  reduce: <B = T>(_op: (b: Widen<T, B>, a: Widen<T, B>) => Widen<T, B>): Widen<T, B> => data as unknown as Widen<T, B>,
  reduceRight: <B = T>(_op: (b: Widen<T, B>, a: Widen<T, B>) => Widen<T, B>): Widen<T, B> =>
    data as unknown as Widen<T, B>,

  contains: (value: unknown) => JSON.stringify(data) === JSON.stringify(value),

  // --- Extractable ---

  orElse: <T2 extends Type>(_defaultValue: T2): T | T2 => data,
  orThrow: (_error?: Error) => data,
  or: <T2 extends Type>(_alternative: Extractable<T2>): Extractable<T | T2> => ObjObject(data) as Extractable<T | T2>,
  orNull: () => data,
  orUndefined: () => data,

  // --- Reshapeable ---

  toOption: () => Option(data),
  toEither: <E>(_left: E) => Right<E, T>(data),
  toList: () => List<T>([data]),
  toTry: () => Try(() => data),
  toPromise: (): Promise<T> => Promise.resolve(data),

  // --- Serialization ---

  toString: () => `Obj(${safeStringify(data)})`,
  toValue: () => ({ _tag: "Obj" as const, value: data }),
  pipe: <U extends Type>(f: (value: T) => U) => f(data),
  serialize: () => createSerializer("Obj", data),

  // --- Doable ---

  doUnwrap(): DoResult<T> {
    return { ok: true, value: data }
  },
})

/**
 * Creates an Obj wrapping a plain object.
 * Returns an immutable wrapper with fluent chainable operations.
 *
 * @param data - The plain object to wrap
 * @returns A new Obj instance
 *
 * @example
 * ```typescript
 * const obj = Obj({ name: "John", age: 30 })
 * obj.get("name")  // Some("John")
 * obj.set("age", 31).value()  // { name: "John", age: 31 }
 * ```
 */
const ObjConstructor = <T extends Record<string, Type>>(data: T): Obj<T> => ObjObject(data)

const ObjCompanion = {
  /**
   * Creates an Obj from a plain object. Alias for Obj().
   * @param data - The plain object to wrap
   * @returns A new Obj instance
   */
  of: <T extends Record<string, Type>>(data: T): Obj<T> => ObjObject(data),

  /**
   * Creates an empty Obj.
   * @returns An empty Obj instance
   */
  empty: <T extends Record<string, Type>>(): Obj<T> => ObjObject({} as T),

  /**
   * Deserializes an Obj from a JSON string.
   * @param json - The JSON string to parse
   * @returns A new Obj instance
   */
  fromJSON: <T extends Record<string, Type>>(json: string): Obj<T> => {
    const parsed = JSON.parse(json) as { _tag: string; value: T }
    return ObjObject(parsed.value)
  },

  /**
   * Deserializes an Obj from a base64-encoded binary string.
   * @param binary - The base64 string to decode
   * @returns A new Obj instance
   */
  fromBinary: <T extends Record<string, Type>>(binary: string): Obj<T> => {
    const json = Buffer.from(binary, "base64").toString()
    return ObjCompanion.fromJSON<T>(json)
  },
}

/**
 * Obj - Immutable object wrapper with fluent operations.
 *
 * Wraps plain JavaScript objects and provides chainable, immutable
 * operations for building and transforming them. Implements the full
 * Functype interface (Functor, Foldable, Serializable, Matchable, etc.).
 *
 * @example
 * ```typescript
 * // Build headers with conditional auth
 * const headers = Obj({ "User-Agent": "MyApp/1.0" })
 *   .assign(options.headers)
 *   .when(requiresAuth, { Authorization: `Bearer ${token}` })
 *   .value()
 *
 * // Object manipulation
 * const user = Obj({ name: "John", age: 30, role: "admin" })
 * user.pick("name", "role").value()  // { name: "John", role: "admin" }
 * user.omit("role").value()          // { name: "John", age: 30 }
 * user.get("name")                   // Some("John")
 * ```
 */
export const Obj = Companion(ObjConstructor, ObjCompanion)
