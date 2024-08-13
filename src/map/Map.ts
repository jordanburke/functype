import { ESMap, IESMap } from "./shim"
import { _Tuple_, Tuple } from "../tuple"
import { Seq } from "../iterable"
import { _Set_, Set } from "../set"
import { _Option_, option } from "../option"
import { _List_, List } from "../list"
import { _Traversable_ } from "../index"
import { _Collection } from "../collections"

type SafeTraversable<K, V> = Omit<_Traversable_<_Tuple_<[K, V]>>, "map" | "flatMap">

export type _Map_<K, V> = {
  map<U>(f: (value) => U): _Map_<K, U>

  flatMap<U>(f: (value) => _Map_<K, U>): _Map_<K, U>

  get(key: K): _Option_<V>

  getOrElse(key: K, defaultValue: V): V

  orElse(key: K, alternative: _Option_<V>): _Option_<V>
} & SafeTraversable<K, V> &
  _Collection<_Tuple_<[K, V]>>

export class Map<K, V> implements _Map_<K, V> {
  private values: IESMap<K, V>

  private get entries() {
    return Array.from(this.values.entries()).map(([key, value]) => new Tuple<[K, V]>([key, value]))
  }

  constructor(entries?: readonly (readonly [K, V])[] | IterableIterator<[K, V]> | null) {
    this.values = new ESMap<K, V>(entries)
  }

  add(item: _Tuple_<[K, V]>): Map<K, V> {
    return new Map<K, V>(this.values.set(item[0], item[1]).entries())
  }

  remove(value: _Tuple_<[K, V]>): Map<K, V> {
    const newMap = new Map<K, V>([...this.values.entries()])
    return newMap.values.delete(value[0]) ? newMap : this
  }

  contains(value: _Tuple_<[K, V]>): boolean {
    return this.values.get(value[0]) === value[1]
  }

  get size(): number {
    return this.values.size
  }

  map<U>(f: (value: V) => U): _Map_<K, U> {
    return new Map(Array.from(this.values.entries()).map((kv) => [kv[0], f(kv[1])]))
  }

  flatMap<U>(f: (value: V) => _Map_<K, U>): _Map_<K, U> {
    const newEntries: [K, U][] = []
    for (const [key, value] of this.values.entries()) {
      const mapped = f(value)
      if (mapped instanceof Map) {
        for (const [newKey, newValue] of mapped.values.entries()) {
          newEntries.push([newKey, newValue])
        }
      }
    }
    return new Map(newEntries)
  }

  reduce(f: (acc: Tuple<[K, V]>, value: Tuple<[K, V]>) => Tuple<[K, V]>): Tuple<[K, V]> {
    return new Seq(this.entries).reduce(f)
  }

  reduceRight(f: (acc: Tuple<[K, V]>, value: Tuple<[K, V]>) => Tuple<[K, V]>): Tuple<[K, V]> {
    return new Seq(this.entries).reduceRight(f)
  }

  foldLeft<B>(z: B): (op: (b: B, a: _Tuple_<[K, V]>) => B) => B {
    const iterables = new Seq(this.entries)
    return (f: (b: B, a: _Tuple_<[K, V]>) => B) => {
      return iterables.foldLeft(z)(f)
    }
  }

  foldRight<B>(z: B): (op: (a: _Tuple_<[K, V]>, b: B) => B) => B {
    const iterables = new Seq(this.entries)
    return (f: (a: _Tuple_<[K, V]>, b: B) => B) => {
      return iterables.foldRight(z)(f)
    }
  }

  get(key: K): _Option_<V> {
    return option(this.values.get(key))
  }

  getOrElse(key: K, defaultValue: V): V {
    return option(this.values.get(key)).getOrElse(defaultValue)
  }

  get isEmpty(): boolean {
    return this.values.size === 0
  }

  orElse(key: K, alternative: _Option_<V>): _Option_<V> {
    const v = option(this.values.get(key))
    return alternative
  }

  toList(): _List_<Tuple<[K, V]>> {
    return new List(this.entries)
  }

  toSet(): _Set_<Tuple<[K, V]>> {
    return new Set(this.entries)
  }

  toString(): string {
    return `Map(${this.entries.toString()})`
  }
}

// Example usage
const myMap = new Map<string, any>([
  ["a", 1],
  ["b", 2],
  ["c", 3],
])
