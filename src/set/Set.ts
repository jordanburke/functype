import type { Collection } from "@/collections"
import { Companion } from "@/companion/Companion"
import type { FunctypeCollection } from "@/functype"
import { List } from "@/list/List"
import { Option } from "@/option/Option"
import { createSerializer } from "@/serialization"
import type { Type } from "@/types"

type NativeSet<T> = globalThis.Set<T>
const NativeSet = globalThis.Set

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
  const values: NativeSet<A> = new NativeSet<A>(iterable)

  const set: Set<A> = {
    _tag: "Set",

    [Symbol.iterator]: () => values[Symbol.iterator](),

    add: (value: A): Set<A> => createSet([...values, value]),

    remove: (value: A): Set<A> => {
      const newSet = new NativeSet(values)
      newSet.delete(value)
      return createSet(newSet)
    },

    contains: (value: A): boolean => values.has(value),

    has: (value: A): boolean => values.has(value),

    map: <B>(f: (a: A) => B): Set<B> => createSet(Array.from(values).map(f)),

    ap: <B>(ff: Set<(value: A) => B>): Set<B> => {
      const results = new NativeSet<B>()
      for (const a of values) {
        for (const f of ff) {
          results.add(f(a))
        }
      }
      return createSet(results)
    },

    flatMap: <B>(f: (a: A) => Iterable<B>): Set<B> => {
      const results = new NativeSet<B>()
      for (const a of values) {
        for (const b of f(a)) {
          results.add(b)
        }
      }
      return createSet(results)
    },

    flatMapAsync: async <B>(f: (a: A) => PromiseLike<Iterable<B>>): Promise<Set<B>> => {
      const results = new NativeSet<B>()
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
      const results = new NativeSet<A>()
      for (const a of values) {
        if (p(a)) results.add(a)
      }
      return createSet(results)
    },

    filterNot: (p: (a: A) => boolean) => {
      const results = new NativeSet<A>()
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
      const results = new NativeSet<B>()
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

    take: (n: number) => createSet(Array.from(values).slice(0, Math.max(0, n))),

    takeWhile: (p: (a: A) => boolean) => {
      const arr = Array.from(values)
      const result: A[] = []
      for (const item of arr) {
        if (!p(item)) break
        result.push(item)
      }
      return createSet(result)
    },

    takeRight: (n: number) => {
      const arr = Array.from(values)
      return createSet(n <= 0 ? [] : arr.slice(-n))
    },

    get last() {
      const arr = Array.from(values)
      return arr[arr.length - 1] as A | undefined
    },

    get lastOption() {
      const arr = Array.from(values)
      return Option(arr[arr.length - 1])
    },

    get tail() {
      return createSet(Array.from(values).slice(1))
    },

    get init() {
      const arr = Array.from(values)
      return createSet(arr.length === 0 ? [] : arr.slice(0, -1))
    },

    toList: (): List<A> => List(Array.from(values)),

    toSet: (): Set<A> => set,

    toArray: <B = A>(): B[] => Array.from(values) as unknown as B[],

    toString: (): string => `Set(${Array.from(values).toString()})`,

    toValue: (): { _tag: "Set"; value: A[] } => ({ _tag: "Set", value: Array.from(values) }),

    pipe: <U>(f: (value: A[]) => U) => f(Array.from(values)),

    serialize: () => createSerializer("Set", Array.from(values)),
  }

  return set
}

const SetConstructor = <A>(iterable?: Iterable<A>): Set<A> => createSet(iterable)

// Singleton empty set - uses 'never' which is subtype of all types
const EMPTY_SET: Set<never> = createSet<never>([])

const SetCompanion = {
  /**
   * Creates an empty Set
   * Returns a singleton instance for efficiency
   * @returns An empty Set instance
   */
  empty: <A extends Type>(): Set<A> => EMPTY_SET as unknown as Set<A>,

  /**
   * Creates a Set from variadic arguments
   * @param values - Values to create set from
   * @returns A Set containing the unique values
   */
  of: <A extends Type>(...values: A[]): Set<A> => createSet<A>(values),

  /**
   * Creates a Set from JSON string
   * @param json - The JSON string
   * @returns Set instance
   */
  fromJSON: <A>(json: string): Set<A> => {
    const parsed = JSON.parse(json) as { _tag: string; value: A[] }
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
    const value = JSON.parse(valueStr) as A[]
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
