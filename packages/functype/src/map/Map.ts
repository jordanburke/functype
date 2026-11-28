import type { Collection } from "@/collections"
import type { Typeable } from "@/index"
import { Companion, type Foldable } from "@/index"
import { base64ToUtf8 } from "@/internal/base64"
import { type A, type B, define, type Mutable } from "@/internal/define"
import { freezeInDevelopment } from "@/internal/freeze"
import { List } from "@/list/List"
import { Option } from "@/option/Option"
import type { Pipe } from "@/pipe"
import type { Serializable } from "@/serializable/Serializable"
import { createSerializer, expectMarker, type ParsedEnvelope } from "@/serialization"
import { Set } from "@/set/Set"
import type { KVTraversable } from "@/traversable/KVTraversable"
import { Tuple } from "@/tuple/Tuple"
import type { Widen } from "@/typeclass"

import { ESMap } from "./shim"

export interface Map<K, out V>
  extends
    KVTraversable<Tuple<[K, V]>>,
    Collection<Tuple<[K, V]>>,
    Typeable<"Map">,
    Serializable<[K, V][]>,
    Pipe<[K, V][]>,
    Foldable<Tuple<[K, V]>>,
    Iterable<[K, V]> {
  readonly [Symbol.toStringTag]: string
  readonly _tag: "Map"
  add(item: Tuple<[K, V]>): Map<K, V>
  remove(value: K): Map<K, V>
  map<U>(f: (value: V) => U): Map<K, U>
  ap<U>(ff: Map<K, (value: V) => U>): Map<K, U>
  flatMap<K2, V2>(f: (entry: Tuple<[K, V]>) => Iterable<[K2, V2]>): Map<K2, V2>
  flatMapAsync<U>(f: (value: V) => PromiseLike<Map<K, U>>): PromiseLike<Map<K, U>>
  get(key: K): Option<V>
  /**
   * Whether the map holds an entry for `key`. Keys compare like a native `Map`:
   * by identity for objects, by `SameValueZero` otherwise.
   *
   * True even when the stored value is `undefined`, where `get(key)` returns `None`.
   * For an entry check (key and value), use `contains(Tuple([k, v]))`, which
   * compares the value with `===`.
   * @param key - The key to look up
   * @returns true if the map has an entry for `key`
   */
  has(key: K): boolean
  /**
   * The keys, in insertion order. A List, like `Obj.keys()`.
   * @returns A List of the map's keys
   */
  keys(): List<K>
  /**
   * The values, in insertion order. Duplicates are kept.
   * @returns A List of the map's values
   */
  values(): List<V>
  /** Returns the value for `key`, or calls `defaultValue` if the key is absent. The default is lazy. */
  getOrElse(key: K, defaultValue: () => V): V
  /** Returns `Some(value)` for `key`, or calls `alternative` for an Option if the key is absent. */
  orElse(key: K, alternative: () => Option<V>): Option<V>
  fold<B>(initial: B, fn: (acc: B, a: Tuple<[K, V]>) => B): B
  foldLeft<B>(z: B): (op: (b: B, a: Tuple<[K, V]>) => B) => B
  foldRight<B>(z: B): (op: (a: Tuple<[K, V]>, b: B) => B) => B
  /**
   * Pattern matches over the Map, applying a handler function based on whether it's empty
   * @param patterns - Object with handler functions for Empty and NonEmpty variants
   * @returns The result of applying the matching handler function
   */
  match<R>(patterns: { Empty: () => R; NonEmpty: (entries: Array<Tuple<[K, V]>>) => R }): R
  /** The two branches may return different types; the result is their union. */
  match<R, S>(patterns: { Empty: () => R; NonEmpty: (entries: Array<Tuple<[K, V]>>) => S }): R | S
  toValue(): { _tag: "Map"; value: [K, V][] }
}

/**
 * A Map's own data: its tag and the native Map it wraps. The native Map is never changed after the
 * Map is built, so `size` and `isEmpty` can't go stale. @internal
 */
interface MapOf<K, out V> extends Map<K, V> {
  readonly value: ReadonlyMap<K, V>
}

/** The entries as Tuples, in insertion order. */
const tuplesOf = <K, V>(values: ReadonlyMap<K, V>): Tuple<[K, V]>[] =>
  Array.from(values, ([key, value]) => Tuple<[K, V]>([key, value]))

/* eslint-disable functional/immutable-data -- methods build fresh native Maps, and wrap fills in the Map it just created */

/** Every Map shares these methods (#276 §14). `this.value` is the Map's own native Map. */
const MapProto = define<MapOf<A, B>, "_tag" | "value">()("Map", {
  [Symbol.toStringTag]: "FunctypeMap",

  get size() {
    return this.value.size
  },

  get isEmpty() {
    return this.value.size === 0
  },

  [Symbol.iterator]() {
    return this.value.entries()
  },

  add(item) {
    const [key, value] = item.toArray()
    return wrap(new ESMap(this.value).set(key, value))
  },

  remove(key) {
    if (!this.value.has(key)) return this
    const next = new ESMap(this.value)
    next.delete(key)
    return wrap(next)
  },

  contains(value) {
    if (!value || typeof (value as { toArray?: unknown }).toArray !== "function") return false
    const [key, entry] = (value as Tuple<[A, B]>).toArray()
    return this.value.get(key) === entry
  },

  map<U>(f: (value: B) => U): Map<A, U> {
    return wrap(new ESMap(Array.from(this.value, ([k, v]): [A, U] => [k, f(v)])))
  },

  flatMap<K2, V2>(f: (entry: Tuple<[A, B]>) => Iterable<[K2, V2]>): Map<K2, V2> {
    return wrap(new ESMap(tuplesOf(this.value).flatMap((entry) => Array.from(f(entry)))))
  },

  ap<U>(ff: Map<A, (value: B) => U>): Map<A, U> {
    const newEntries: Array<[A, U]> = []
    for (const [key, value] of this.value) {
      const fn = ff.get(key)
      if (fn._tag === "Some" && fn.value) {
        newEntries.push([key, fn.value(value)])
      }
    }
    return wrap(new ESMap(newEntries))
  },

  async flatMapAsync<U>(f: (value: B) => PromiseLike<Map<A, U>>): Promise<Map<A, U>> {
    const results = new ESMap<A, U>()
    for (const value of this.value.values()) {
      const mappedMap = await f(value)
      // Merge all entries from the resulting map
      for (const [k, v] of mappedMap) {
        results.set(k, v)
      }
    }
    return wrap(results)
  },

  reduce<R = Tuple<[A, B]>>(
    op: (b: Widen<Tuple<[A, B]>, R>, a: Widen<Tuple<[A, B]>, R>) => Widen<Tuple<[A, B]>, R>,
  ): Widen<Tuple<[A, B]>, R> {
    return List(tuplesOf(this.value)).reduce(op)
  },

  reduceRight<R = Tuple<[A, B]>>(
    op: (b: Widen<Tuple<[A, B]>, R>, a: Widen<Tuple<[A, B]>, R>) => Widen<Tuple<[A, B]>, R>,
  ): Widen<Tuple<[A, B]>, R> {
    return List(tuplesOf(this.value)).reduceRight(op)
  },

  foldLeft(z) {
    return (op) => tuplesOf(this.value).reduce(op, z)
  },

  foldRight(z) {
    return (op) => tuplesOf(this.value).reduceRight((acc, entry) => op(entry, acc), z)
  },

  fold(initial, fn) {
    return tuplesOf(this.value).reduce(fn, initial)
  },

  match<R, S>(patterns: { Empty: () => R; NonEmpty: (entries: Array<Tuple<[A, B]>>) => S }): R | S {
    return this.value.size === 0 ? patterns.Empty() : patterns.NonEmpty(tuplesOf(this.value))
  },

  get(key) {
    return Option(this.value.get(key))
  },

  has(key) {
    return this.value.has(key)
  },

  keys() {
    return List(this.value.keys())
  },

  values() {
    return List(this.value.values())
  },

  getOrElse(key, defaultValue) {
    return Option(this.value.get(key)).getOrElse(defaultValue)
  },

  orElse(key, alternative) {
    return Option(this.value.get(key)).orElse(alternative)
  },

  toList() {
    return List(tuplesOf(this.value))
  },

  toSet() {
    return Set(tuplesOf(this.value))
  },

  toString() {
    return `Map(${tuplesOf(this.value).toString()})`
  },

  toValue() {
    return { _tag: "Map" as const, value: Array.from(this.value.entries()) }
  },

  toJSON() {
    return { "@functype": "Map" as const, _tag: "Map" as const, value: Array.from(this.value.entries()) }
  },

  pipe(f) {
    return f(Array.from(this.value.entries()))
  },

  serialize() {
    return createSerializer("Map", Array.from(this.value.entries()))
  },
})

/**
 * Builds a Map around a native Map it now owns: nothing may change the native Map afterwards.
 * Frozen only in development (`NODE_ENV=development` or `FUNCTYPE_FREEZE=1`; see `internal/freeze.ts`): in production the types mark its fields read-only, eslint-plugin-functype's no-container-mutation reports a write through a cast, and freezing was most of what building one cost.
 */
const wrap = <K, V>(values: ReadonlyMap<K, V>): Map<K, V> => {
  // The one cast: a prototype checked at the opaque A and B works for every K and V.
  const map = Object.create(MapProto) as Mutable<MapOf<K, V>>
  map._tag = "Map"
  map.value = values
  return freezeInDevelopment(map)
}

/* eslint-enable functional/immutable-data */

const MapConstructor = <K, V>(entries?: readonly (readonly [K, V])[] | IterableIterator<[K, V]> | null): Map<K, V> =>
  wrap(new ESMap<K, V>(entries))

/** Rebuilds a Map from a parsed envelope. */
const mapFromEnvelope = <K, V>(parsed: ParsedEnvelope, method: string): Map<K, V> => {
  expectMarker(parsed, "Map", method)
  return Map<K, V>((parsed.value ?? []) as Array<[K, V]>)
}

const MapCompanion = {
  /**
   * Creates an empty Map
   * Builds a new one each call: a native Map can't be frozen, so a shared empty Map could be
   * changed for every caller through a cast. It costs about 20 ns more than a shared one.
   * @returns An empty Map instance
   */
  empty: <K, V>(): Map<K, V> => wrap(new ESMap<K, V>()),

  /**
   * Creates a Map from variadic key-value pair arguments
   * @param entries - Key-value pairs to create map from
   * @returns A Map containing the entries
   */
  of: <K, V>(...entries: [K, V][]): Map<K, V> => wrap(new ESMap<K, V>(entries)),

  /**
   * Creates a Map from JSON string
   * @param json - The JSON string
   * @returns Map instance
   */
  fromJSON: <K, V>(json: string): Map<K, V> => mapFromEnvelope<K, V>(JSON.parse(json) as ParsedEnvelope, "fromJSON"),

  /**
   * Creates a Map from binary string
   * @param binary - The binary string
   * @returns Map instance
   */
  fromBinary: <K, V>(binary: string): Map<K, V> => {
    const json = base64ToUtf8(binary)
    return MapCompanion.fromJSON<K, V>(json)
  },
}

// The statics under a second name: the .d.ts then declares no value called MapCompanion beside the interface
const MapStatics = MapCompanion

export const Map: MapCompanion = Companion(MapConstructor, MapStatics)

/** The type of `Map`: its constructor and its statics, named so that errors and hovers print `MapCompanion`. */
export interface MapCompanion extends MapConstructorType, MapStaticsType {}
type MapConstructorType = typeof MapConstructor
type MapStaticsType = typeof MapStatics
