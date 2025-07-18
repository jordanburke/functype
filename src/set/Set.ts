import type { Collection } from "@/collections"
import { Companion } from "@/companion/Companion"
import type { FunctypeCollection } from "@/functype"
import { List } from "@/list/List"
import { Option } from "@/option/Option"
import type { Type } from "@/types"

import { ESSet, type ESSetType } from "./shim"

export interface Set<A> extends FunctypeCollection<A, "Set">, Collection<A> {
  add: (value: A) => Set<A>
  remove: (value: A) => Set<A>
  contains: (value: A) => boolean
  has: (value: A) => boolean
  map: <B>(f: (a: A) => B) => Set<B>
  flatMap: <B>(f: (a: A) => Iterable<B>) => Set<B>
  filter: (p: (a: A) => boolean) => Set<A>
  filterNot: (p: (a: A) => boolean) => Set<A>
  fold: <U extends Type>(onEmpty: () => U, onValue: (value: A) => U) => U
  toList: () => List<A>
  toSet: () => Set<A>
  toArray: <B = A>() => B[]
  toString: () => string
}

const createSet = <A>(iterable?: Iterable<A>): Set<A> => {
  const values: ESSetType<A> = new ESSet<A>(iterable)

  const set: Set<A> = {
    _tag: "Set",

    [Symbol.iterator]: () => values[Symbol.iterator](),

    add: (value: A): Set<A> => createSet([...values, value]),

    remove: (value: A): Set<A> => {
      const newSet = new ESSet(values)
      newSet.delete(value)
      return createSet(newSet)
    },

    contains: (value: A): boolean => values.has(value),

    has: (value: A): boolean => values.has(value),

    map: <B>(f: (a: A) => B): Set<B> => createSet(Array.from(values).map(f)),

    ap: <B>(ff: Set<(value: A) => B>): Set<B> => {
      const results = new ESSet<B>()
      for (const a of values) {
        for (const f of ff) {
          results.add(f(a))
        }
      }
      return createSet(results)
    },

    flatMap: <B>(f: (a: A) => Iterable<B>): Set<B> => {
      const results = new ESSet<B>()
      for (const a of values) {
        for (const b of f(a)) {
          results.add(b)
        }
      }
      return createSet(results)
    },

    flatMapAsync: async <B>(f: (a: A) => PromiseLike<Iterable<B>>): Promise<Set<B>> => {
      const results = new ESSet<B>()
      for (const a of values) {
        const items = await f(a)
        for (const b of items) {
          results.add(b)
        }
      }
      return createSet(results)
    },

    fold: <U extends Type>(onEmpty: () => U, onValue: (value: A) => U): U => {
      if (values.size === 0) return onEmpty()

      // For Set, we'll always return the first entry as the value for fold
      // This is consistent with how Option and other single-value types work
      const entries = Array.from(values)
      if (entries.length === 0) {
        return onEmpty()
      }

      const firstEntry = entries[0]
      // Make sure we handle potential undefined values
      if (firstEntry === undefined) {
        return onEmpty()
      }

      return onValue(firstEntry)
    },

    foldLeft:
      <B>(z: B) =>
      (op: (b: B, a: A) => B) => {
        let acc = z
        for (const a of values) {
          acc = op(acc, a)
        }
        return acc
      },

    foldRight:
      <B>(z: B) =>
      (op: (a: A, b: B) => B) => {
        const arr = Array.from(values)
        return arr.reduceRight((acc, value) => op(value, acc), z)
      },

    get size() {
      return values.size
    },

    get isEmpty() {
      return values.size === 0
    },

    reduce: (f: (prev: A, curr: A) => A) => {
      const arr = Array.from(values)
      if (arr.length === 0) throw new Error("Cannot reduce empty Set")
      return arr.reduce(f)
    },

    reduceRight: (f: (prev: A, curr: A) => A) => {
      const arr = Array.from(values)
      if (arr.length === 0) throw new Error("Cannot reduceRight empty Set")
      return arr.reduceRight(f)
    },

    count: (p: (x: A) => boolean) => {
      let count = 0
      for (const a of values) {
        if (p(a)) count++
      }
      return count
    },

    find: (p: (a: A) => boolean) => {
      for (const a of values) {
        if (p(a)) return Option(a)
      }
      return Option<A>(null)
    },

    exists: (p: (a: A) => boolean) => {
      for (const a of values) {
        if (p(a)) return true
      }
      return false
    },

    forEach: (f: (a: A) => void) => {
      values.forEach(f)
    },

    filter: (p: (a: A) => boolean) => {
      const results = new ESSet<A>()
      for (const a of values) {
        if (p(a)) results.add(a)
      }
      return createSet(results)
    },

    filterNot: (p: (a: A) => boolean) => {
      const results = new ESSet<A>()
      for (const a of values) {
        if (!p(a)) results.add(a)
      }
      return createSet(results)
    },

    drop: (n: number) => createSet(Array.from(values).slice(n)),

    dropRight: (n: number) => createSet(Array.from(values).slice(0, -n)),

    dropWhile: (p: (a: A) => boolean) => {
      const arr = Array.from(values)
      const idx = arr.findIndex((x) => !p(x))
      return createSet(idx === -1 ? [] : arr.slice(idx))
    },

    flatten: <B>() => {
      const results = new ESSet<B>()
      for (const item of values) {
        if (Array.isArray(item)) {
          for (const subItem of item) {
            results.add(subItem as B)
          }
        } else if (item && typeof item === "object" && Symbol.iterator in item) {
          for (const subItem of item as Iterable<B>) {
            results.add(subItem)
          }
        } else {
          results.add(item as unknown as B)
        }
      }
      return createSet(results)
    },

    get head() {
      return Array.from(values)[0] as A | undefined
    },

    get headOption() {
      const first = Array.from(values)[0]
      return Option(first)
    },

    toList: (): List<A> => List(Array.from(values)),

    toSet: (): Set<A> => set,

    toArray: <B = A>(): B[] => Array.from(values) as unknown as B[],

    toString: (): string => `Set(${Array.from(values).toString()})`,

    toValue: (): { _tag: "Set"; value: A[] } => ({ _tag: "Set", value: Array.from(values) }),

    pipe: <U>(f: (value: A[]) => U) => f(Array.from(values)),

    serialize: () => {
      return {
        toJSON: () => JSON.stringify({ _tag: "Set", value: Array.from(values) }),
        toYAML: () => `_tag: Set\nvalue: ${JSON.stringify(Array.from(values))}`,
        toBinary: () => Buffer.from(JSON.stringify({ _tag: "Set", value: Array.from(values) })).toString("base64"),
      }
    },
  }

  return set
}

const SetConstructor = <A>(iterable?: Iterable<A>): Set<A> => createSet(iterable)

const SetCompanion = {
  /**
   * Creates a Set from JSON string
   * @param json - The JSON string
   * @returns Set instance
   */
  fromJSON: <A>(json: string): Set<A> => {
    const parsed = JSON.parse(json)
    return Set<A>(parsed.value)
  },

  /**
   * Creates a Set from YAML string
   * @param yaml - The YAML string
   * @returns Set instance
   */
  fromYAML: <A>(yaml: string): Set<A> => {
    const lines = yaml.split("\n")
    const valueStr = lines[1]?.split(": ")[1]
    if (!valueStr) {
      return Set<A>([])
    }
    const value = JSON.parse(valueStr)
    return Set<A>(value)
  },

  /**
   * Creates a Set from binary string
   * @param binary - The binary string
   * @returns Set instance
   */
  fromBinary: <A>(binary: string): Set<A> => {
    const json = Buffer.from(binary, "base64").toString()
    return SetCompanion.fromJSON<A>(json)
  },
}

export const Set = Companion(SetConstructor, SetCompanion)
