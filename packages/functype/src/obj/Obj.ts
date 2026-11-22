import { Companion } from "@/companion/Companion"
import { type Doable, type DoResult } from "@/do/protocol"
import type { Extractable } from "@/extractable/Extractable"
import type { Functype } from "@/functype"
import { base64ToUtf8 } from "@/internal/base64"
import { type A, define, type Mutable } from "@/internal/define"
import { safeStringify } from "@/internal/stringify"
import { Option } from "@/option"
import type { Reshapeable } from "@/reshapeable"
import { createSerializer } from "@/serialization"
import { Tuple } from "@/tuple"
import type { Promisable, Widen } from "@/typeclass"
import type { Type } from "@/types"

import { type Either, List, Right, Try } from "../index"

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

/* eslint-disable functional/immutable-data -- omit and pick fill in the copy they just made, and wrap fills in the Obj it just created */

/**
 * Every Obj shares these methods (#276 §14). `this.data` is the object the Obj wraps.
 *
 * size and isEmpty stay getters: an Obj wraps the object it's given without copying it, so they
 * count its keys when read, like a native Map's size.
 */
const ObjProto = define<Obj<A>, "_tag" | "data">()("Obj", {
  [Symbol.toStringTag]: "Obj",

  get isEmpty() {
    return Object.keys(this.data).length === 0
  },

  get size() {
    return Object.keys(this.data).length
  },

  // --- Core object operations ---

  get(key) {
    return Option(this.data[key])
  },

  set(key, val) {
    return wrap({ ...this.data, [key]: val })
  },

  assign(partial) {
    return wrap({ ...this.data, ...partial })
  },

  merge<U extends Record<string, Type>>(other: U): Obj<A & U> {
    return wrap({ ...this.data, ...other })
  },

  when(condition, partial) {
    const shouldApply = typeof condition === "function" ? condition() : condition
    return shouldApply ? wrap({ ...this.data, ...partial }) : wrap(this.data)
  },

  omit<K extends keyof A>(...keys: K[]): Obj<Omit<A, K>> {
    const result: Partial<A> = { ...this.data }
    for (const key of keys) delete result[key]
    return wrap(result as Omit<A, K>)
  },

  pick<K extends keyof A>(...keys: K[]): Obj<Pick<A, K>> {
    const result: Partial<Pick<A, K>> = {}
    for (const key of keys) {
      if (key in this.data) result[key] = this.data[key]
    }
    return wrap(result as Pick<A, K>)
  },

  keys() {
    return List(Object.keys(this.data))
  },

  values() {
    return List(Object.values(this.data) as A[keyof A][])
  },

  entries() {
    return List(Object.entries(this.data).map(([k, v]) => Tuple([k, v] as [string, A[keyof A]])))
  },

  has(key) {
    return key in this.data
  },

  value() {
    return this.data
  },

  // --- Functype contract ---

  map<U extends Record<string, Type>>(f: (value: A) => U): Obj<U> {
    return wrap(f(this.data))
  },

  flatMap(f) {
    return f(this.data)
  },

  async flatMapAsync<U extends Record<string, Type>>(f: (value: A) => PromiseLike<Obj<U>>): Promise<Obj<U>> {
    return await f(this.data)
  },

  ap<U extends Record<string, Type>>(ff: Obj<Record<string, Type>>): Obj<U> {
    const fn = ff.data as unknown as (value: A) => U
    return wrap(fn(this.data))
  },

  fold(onEmpty, onValue) {
    return Object.keys(this.data).length === 0 ? onEmpty() : onValue(this.data)
  },

  match<R>(patterns: { Obj: (value: A) => R }): R {
    return patterns.Obj(this.data)
  },

  foldLeft(z) {
    return (op) => op(z, this.data)
  },

  foldRight(z) {
    return (op) => op(this.data, z)
  },

  count(p) {
    return p(this.data) ? 1 : 0
  },

  find(p) {
    return p(this.data) ? Option(this.data) : Option<A>(undefined)
  },

  exists(p) {
    return p(this.data)
  },

  forEach(f) {
    f(this.data)
  },

  reduce<B = A>(_op: (b: Widen<A, B>, a: Widen<A, B>) => Widen<A, B>): Widen<A, B> {
    return this.data as unknown as Widen<A, B>
  },

  reduceRight<B = A>(_op: (b: Widen<A, B>, a: Widen<A, B>) => Widen<A, B>): Widen<A, B> {
    return this.data as unknown as Widen<A, B>
  },

  contains(value) {
    return JSON.stringify(this.data) === JSON.stringify(value)
  },

  // --- Extractable ---

  getOrElse() {
    return this.data
  },

  orThrow() {
    return this.data
  },

  orElse<T2 extends Type>(_alternative: () => Extractable<T2>): Extractable<A | T2> {
    return wrap(this.data)
  },

  orNull() {
    return this.data
  },

  orUndefined() {
    return this.data
  },

  // --- Reshapeable ---

  toOption() {
    return Option(this.data)
  },

  toEither<E>(_left: E): Either<E, A> {
    return Right<E, A>(this.data)
  },

  toList() {
    return List<A>([this.data])
  },

  toTry() {
    const { data } = this
    return Try(() => data)
  },

  toPromise() {
    return Promise.resolve(this.data)
  },

  // --- Serialization ---

  toString() {
    return `Obj(${safeStringify(this.data)})`
  },

  toValue() {
    return { _tag: "Obj" as const, value: this.data }
  },

  toJSON() {
    return { "@functype": "Obj" as const, _tag: "Obj" as const, value: this.data }
  },

  pipe(f) {
    return f(this.data)
  },

  serialize() {
    return createSerializer("Obj", this.data)
  },

  // --- Doable ---

  doUnwrap(): DoResult<A> {
    return { ok: true, value: this.data }
  },
})

/**
 * Creates an Obj instance wrapping a plain object with immutable operations. The object isn't
 * copied. Frozen, as collections have been since 1.27.0 (#276 §14 Rules).
 * @param data - The plain object to wrap
 * @returns A new Obj instance
 * @typeParam T - The record type
 */
const wrap = <T extends Record<string, Type>>(data: T): Obj<T> => {
  // The one cast: a prototype checked at the opaque A works for every T.
  const obj = Object.create(ObjProto) as Mutable<Obj<T>>
  obj._tag = "Obj"
  obj.data = data
  return Object.freeze(obj)
}

/* eslint-enable functional/immutable-data */

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
const ObjConstructor = <T extends Record<string, Type>>(data: T): Obj<T> => wrap(data)

const ObjCompanion = {
  /**
   * Creates an Obj from a plain object. Alias for Obj().
   * @param data - The plain object to wrap
   * @returns A new Obj instance
   */
  of: <T extends Record<string, Type>>(data: T): Obj<T> => wrap(data),

  /**
   * Creates an empty Obj.
   * @returns An empty Obj instance
   */
  empty: <T extends Record<string, Type>>(): Obj<T> => wrap({} as T),

  /**
   * Deserializes an Obj from a JSON string.
   * @param json - The JSON string to parse
   * @returns A new Obj instance
   */
  fromJSON: <T extends Record<string, Type>>(json: string): Obj<T> => {
    const parsed = JSON.parse(json) as { "@functype"?: string; _tag: string; value: T }
    if (parsed["@functype"] !== undefined && parsed["@functype"] !== "Obj") {
      throw new Error(`Obj.fromJSON: expected @functype="Obj", got ${JSON.stringify(parsed["@functype"])}`)
    }
    return wrap(parsed.value)
  },

  /**
   * Deserializes an Obj from a base64-encoded binary string.
   * @param binary - The base64 string to decode
   * @returns A new Obj instance
   */
  fromBinary: <T extends Record<string, Type>>(binary: string): Obj<T> => {
    const json = base64ToUtf8(binary)
    return ObjCompanion.fromJSON<T>(json)
  },
}

// The statics under a second name: the .d.ts then declares no value called ObjCompanion beside the interface
const ObjStatics = ObjCompanion

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
export const Obj: ObjCompanion = Companion(ObjConstructor, ObjStatics)

/** The type of `Obj`: its constructor and its statics, named so that errors and hovers print `ObjCompanion`. */
export interface ObjCompanion extends ObjConstructorType, ObjStaticsType {}
type ObjConstructorType = typeof ObjConstructor
type ObjStaticsType = typeof ObjStatics
