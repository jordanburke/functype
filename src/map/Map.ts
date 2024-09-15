import { _Collection } from "../collections"
import { _Traversable_ } from "../index"
import { Seq } from "../iterable"
import { _List_, List } from "../list"
import { Option } from "../option"
import { _Set_, Set } from "../set"
import { Tuple } from "../tuple"
import { ESMap, IESMap } from "./shim"

type SafeTraversable<K, V> = Omit<_Traversable_<Tuple<[K, V]>>, "map" | "flatMap">

export type _Map_<K, V> = {
  map<U>(f: (value) => U): _Map_<K, U>

  flatMap<U>(f: (value) => _Map_<K, U>): _Map_<K, U>

  get(key: K): Option<V>

  getOrElse(key: K, defaultValue: V): V

  orElse(key: K, alternative: Option<V>): Option<V>
} & SafeTraversable<K, V> &
  _Collection<Tuple<[K, V]>>

export class Map<K, V> implements _Map_<K, V> {
  private values: IESMap<K, V>

  private get entries() {
    return Array.from(this.values.entries()).map(([key, value]) => Tuple<[K, V]>([key, value]))
  }

  constructor(entries?: readonly (readonly [K, V])[] | IterableIterator<[K, V]> | null) {
    this.values = new ESMap<K, V>(entries)
  }

  add(item: Tuple<[K, V]>): Map<K, V> {
    return new Map<K, V>(this.values.set(item.toArray()[0], item.toArray()[1]).entries())
  }

  remove(value: Tuple<[K, V]>): Map<K, V> {
    const newMap = new Map<K, V>([...this.values.entries()])
    return newMap.values.delete(value[0]) ? newMap : this
  }

  contains(value: Tuple<[K, V]>): boolean {
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
    return Seq(this.entries).reduce(f)
  }

  reduceRight(f: (acc: Tuple<[K, V]>, value: Tuple<[K, V]>) => Tuple<[K, V]>): Tuple<[K, V]> {
    return Seq(this.entries).reduceRight(f)
  }

  foldLeft<B>(z: B): (op: (b: B, a: Tuple<[K, V]>) => B) => B {
    const iterables = Seq(this.entries)
    return (f: (b: B, a: Tuple<[K, V]>) => B) => {
      return iterables.foldLeft(z)(f)
    }
  }

  foldRight<B>(z: B): (op: (a: Tuple<[K, V]>, b: B) => B) => B {
    const iterables = Seq(this.entries)
    return (f: (a: Tuple<[K, V]>, b: B) => B) => {
      return iterables.foldRight(z)(f)
    }
  }

  get(key: K): Option<V> {
    return Option(this.values.get(key))
  }

  getOrElse(key: K, defaultValue: V): V {
    return Option(this.values.get(key)).getOrElse(defaultValue)
  }

  get isEmpty(): boolean {
    return this.values.size === 0
  }

  orElse(key: K, alternative: Option<V>): Option<V> {
    const v = Option(this.values.get(key))
    return alternative
  }

  toList(): _List_<Tuple<[K, V]>> {
    return List(this.entries)
  }

  toSet(): _Set_<Tuple<[K, V]>> {
    return Set(this.entries)
  }

  toString(): string {
    return `Map(${this.entries.toString()})`
  }
}

// Example usage
// const myMap = new Map<string, unknown>([
//   ["a", 1],
//   ["b", 2],
//   ["c", 3],
// ])
