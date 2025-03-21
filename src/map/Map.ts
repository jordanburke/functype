import type { Collection } from "@/collections"
import { type Traversable, Typeable } from "@/index"
import type { IterableType } from "@/iterable"
import { List } from "@/list/List"
import { Option } from "@/option/Option"
import { Set } from "@/set/Set"
import { Tuple } from "@/tuple/Tuple"
import { Valuable } from "@/valuable/Valuable"

import { ESMap, type IESMap } from "./shim"

type SafeTraversable<K, V> = Omit<Traversable<Tuple<[K, V]>>, "map" | "flatMap">

export type Map<K, V> = {
  add(item: Tuple<[K, V]>): Map<K, V>
  remove(value: K): Map<K, V>
  map<U>(f: (value: V) => U): Map<K, U>
  flatMap<K2, V2>(f: (entry: Tuple<[K, V]>) => IterableType<[K2, V2]>): Map<K2, V2>
  get(key: K): Option<V>
  getOrElse(key: K, defaultValue: V): V
  orElse(key: K, alternative: Option<V>): Option<V>
} & SafeTraversable<K, V> &
  Collection<Tuple<[K, V]>> &
  Typeable<"Map"> &
  Valuable<"Map", IESMap<K, V>>

type MapState<K, V> = {
  values: IESMap<K, V>
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

  const flatMap = <K2, V2>(f: (entry: Tuple<[K, V]>) => IterableType<[K2, V2]>): Map<K2, V2> => {
    const list = MapObject(state.values.entries()).toList()
    return MapObject(list.flatMap(f).toArray())
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

  const toList = (): List<Tuple<[K, V]>> => List(getEntries())

  const toSet = (): Set<Tuple<[K, V]>> => Set(getEntries())

  const toString = (): string => `Map(${getEntries().toString()})`

  const toValue = () => ({ _tag: "Map", value: state.values })

  return {
    _tag,
    add,
    remove,
    contains,
    get size() {
      return size()
    },
    map,
    flatMap,
    reduce,
    reduceRight,
    foldLeft,
    foldRight,
    get,
    getOrElse,
    get isEmpty() {
      return isEmpty()
    },
    orElse,
    toList,
    toSet,
    toString,
    toValue: () => ({ _tag: "Map", value: state.values }),
  }
}

export const Map = <K, V>(entries?: readonly (readonly [K, V])[] | IterableIterator<[K, V]> | null): Map<K, V> =>
  MapObject(entries)

// Example usage
// const myMap = createMap<string, unknown>([
//   ["a", 1],
//   ["b", 2],
//   ["c", 3],
// ])
