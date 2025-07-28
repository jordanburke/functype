import type { Collection } from "@/collections"
import { Companion, type Foldable, Typeable } from "@/index"
import { List } from "@/list/List"
import { Option } from "@/option/Option"
import type { Pipe } from "@/pipe"
import type { Serializable } from "@/serializable/Serializable"
import { Set } from "@/set/Set"
import type { Traversable } from "@/traversable/Traversable"
import { Tuple } from "@/tuple/Tuple"
import type { Type } from "@/types"

import { ESMap, type ESMapType } from "./shim"

/**
 * A traversable interface for map that excludes map and flatMap operations
 */
export type SafeTraversable<K, V> = Omit<Traversable<Tuple<[K, V]>>, "map" | "flatMap" | "flatMapAsync" | "ap">

export interface Map<K, V>
  extends SafeTraversable<K, V>,
    Collection<Tuple<[K, V]>>,
    Typeable<"Map">,
    Serializable<[K, V][]>,
    Pipe<[K, V][]>,
    Foldable<Tuple<[K, V]>>,
    Iterable<[K, V]> {
  readonly _tag: "Map"
  add(item: Tuple<[K, V]>): Map<K, V>
  remove(value: K): Map<K, V>
  map<U>(f: (value: V) => U): Map<K, U>
  ap<U>(ff: Map<K, (value: V) => U>): Map<K, U>
  flatMap<K2, V2>(f: (entry: Tuple<[K, V]>) => Iterable<[K2, V2]>): Map<K2, V2>
  flatMapAsync<U>(f: (value: V) => PromiseLike<Map<K, U>>): PromiseLike<Map<K, U>>
  get(key: K): Option<V>
  getOrElse(key: K, defaultValue: V): V
  orElse(key: K, alternative: Option<V>): Option<V>
  fold<U extends Type>(onEmpty: () => U, onValue: (value: Tuple<[K, V]>) => U): U
  foldLeft<B>(z: B): (op: (b: B, a: Tuple<[K, V]>) => B) => B
  foldRight<B>(z: B): (op: (a: Tuple<[K, V]>, b: B) => B) => B
  /**
   * Pattern matches over the Map, applying a handler function based on whether it's empty
   * @param patterns - Object with handler functions for Empty and NonEmpty variants
   * @returns The result of applying the matching handler function
   */
  match<R>(patterns: { Empty: () => R; NonEmpty: (entries: Array<Tuple<[K, V]>>) => R }): R
  toValue(): { _tag: "Map"; value: [K, V][] }
}

type MapState<K, V> = {
  values: ESMapType<K, V>
}

const MapObject = <K, V>(entries?: readonly (readonly [K, V])[] | IterableIterator<[K, V]> | null): Map<K, V> => {
  const _tag = "Map"
  const state: MapState<K, V> = {
    values: new ESMap<K, V>(entries),
  }

  const getEntries = () => Array.from(state.values.entries()).map(([key, value]) => Tuple<[K, V]>([key, value]))

  const add = (item: Tuple<[K, V]>): Map<K, V> =>
    MapObject(new ESMap(state.values).set(item.toArray()[0], item.toArray()[1]).entries())

  const remove = (value: K): Map<K, V> => {
    const newMap = new ESMap(state.values)
    return newMap.delete(value) ? MapObject(newMap.entries()) : MapObject(state.values.entries())
  }

  const contains = (value: Tuple<[K, V]>): boolean => {
    const tuple = value.toArray()
    return state.values.get(tuple[0]) === tuple[1]
  }

  const size = (): number => state.values.size

  const map = <U>(f: (value: V) => U): Map<K, U> =>
    MapObject(Array.from(state.values.entries()).map(([k, v]) => [k, f(v)]))

  const flatMap = <K2, V2>(f: (entry: Tuple<[K, V]>) => Iterable<[K2, V2]>): Map<K2, V2> => {
    const list = MapObject(state.values.entries()).toList()
    return MapObject(list.flatMap(f).toArray())
  }

  const ap = <U>(ff: Map<K, (value: V) => U>): Map<K, U> => {
    const newEntries: Array<[K, U]> = []
    for (const [key, value] of state.values.entries()) {
      const fn = ff.get(key)
      if (fn._tag === "Some" && fn.value) {
        newEntries.push([key, fn.value(value)])
      }
    }
    return MapObject(newEntries)
  }

  const flatMapAsync = async <U>(f: (value: V) => PromiseLike<Map<K, U>>): Promise<Map<K, U>> => {
    const results = new ESMap<K, U>()
    for (const [_key, value] of state.values.entries()) {
      const mappedMap = await f(value)
      // Merge all entries from the resulting map
      for (const entry of mappedMap.toList()) {
        const [k, v] = entry.toArray()
        results.set(k, v)
      }
    }
    return MapObject(results.entries())
  }

  const reduce = (f: (acc: Tuple<[K, V]>, value: Tuple<[K, V]>) => Tuple<[K, V]>): Tuple<[K, V]> =>
    List(getEntries()).reduce(f)

  const reduceRight = (f: (acc: Tuple<[K, V]>, value: Tuple<[K, V]>) => Tuple<[K, V]>): Tuple<[K, V]> =>
    List(getEntries()).reduceRight(f)

  const foldLeft =
    <B>(z: B) =>
    (op: (b: B, a: Tuple<[K, V]>) => B): B =>
      List(getEntries()).foldLeft(z)(op)

  const foldRight =
    <B>(z: B) =>
    (op: (a: Tuple<[K, V]>, b: B) => B): B =>
      List(getEntries()).foldRight(z)(op)

  const get = (key: K): Option<V> => Option(state.values.get(key))

  const getOrElse = (key: K, defaultValue: V): V => Option(state.values.get(key)).getOrElse(defaultValue)

  const isEmpty = (): boolean => state.values.size === 0

  const orElse = (key: K, alternative: Option<V>): Option<V> => Option(state.values.get(key)).orElse(alternative)

  const fold = <U extends Type>(onEmpty: () => U, onValue: (value: Tuple<[K, V]>) => U): U => {
    if (isEmpty()) return onEmpty()

    // For Map, we'll always return the first entry as the value for fold
    // This is consistent with how Option and other single-value types work
    const entries = getEntries()
    if (entries.length === 0) {
      return onEmpty()
    }

    const firstEntry = entries[0]
    // Make sure we handle potential undefined values
    if (firstEntry === undefined) {
      return onEmpty()
    }

    return onValue(firstEntry)
  }

  const toList = (): List<Tuple<[K, V]>> => List(getEntries())

  const toSet = (): Set<Tuple<[K, V]>> => Set(getEntries())

  const toString = (): string => `Map(${getEntries().toString()})`

  const match = <R>(patterns: { Empty: () => R; NonEmpty: (entries: Array<Tuple<[K, V]>>) => R }): R => {
    if (isEmpty()) {
      return patterns.Empty()
    }
    return patterns.NonEmpty(getEntries())
  }

  return {
    _tag,
    [Symbol.iterator]: () => state.values.entries(),
    add,
    remove,
    contains,
    get size() {
      return size()
    },
    map,
    ap,
    flatMap,
    flatMapAsync,
    reduce,
    reduceRight,
    foldLeft,
    foldRight,
    fold,
    match,
    get,
    getOrElse,
    get isEmpty() {
      return isEmpty()
    },
    orElse,
    toList,
    toSet,
    toString,
    toValue: () => ({ _tag: "Map" as const, value: Array.from(state.values.entries()) }),
    pipe: <U>(f: (value: [K, V][]) => U) => f(Array.from(state.values.entries())),
    serialize: () => {
      return {
        toJSON: () => JSON.stringify({ _tag: "Map", value: Array.from(state.values.entries()) }),
        toYAML: () => `_tag: Map\nvalue: ${JSON.stringify(Array.from(state.values.entries()))}`,
        toBinary: () =>
          Buffer.from(JSON.stringify({ _tag: "Map", value: Array.from(state.values.entries()) })).toString("base64"),
      }
    },
  }
}

const MapConstructor = <K, V>(entries?: readonly (readonly [K, V])[] | IterableIterator<[K, V]> | null): Map<K, V> =>
  MapObject(entries)

const MapCompanion = {
  /**
   * Creates a Map from JSON string
   * @param json - The JSON string
   * @returns Map instance
   */
  fromJSON: <K, V>(json: string): Map<K, V> => {
    const parsed = JSON.parse(json)
    return Map<K, V>(parsed.value)
  },

  /**
   * Creates a Map from YAML string
   * @param yaml - The YAML string
   * @returns Map instance
   */
  fromYAML: <K, V>(yaml: string): Map<K, V> => {
    const lines = yaml.split("\n")
    const valueStr = lines[1]?.split(": ")[1]
    if (!valueStr) {
      return Map<K, V>([])
    }
    const value = JSON.parse(valueStr)
    return Map<K, V>(value)
  },

  /**
   * Creates a Map from binary string
   * @param binary - The binary string
   * @returns Map instance
   */
  fromBinary: <K, V>(binary: string): Map<K, V> => {
    const json = Buffer.from(binary, "base64").toString()
    return MapCompanion.fromJSON<K, V>(json)
  },
}

export const Map = Companion(MapConstructor, MapCompanion)
