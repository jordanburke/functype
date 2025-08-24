import stringify from "safe-stable-stringify"

import { Companion } from "@/companion/Companion"
import { DO_PROTOCOL, type DoProtocol, type DoResult, EmptyListError } from "@/do"
import type { FunctypeCollection } from "@/functype"
import { None, Option } from "@/option/Option"
import { Set } from "@/set/Set"
import type { Typeable } from "@/typeable/Typeable"
import { type ExtractTag, isTypeable } from "@/typeable/Typeable"
import type { Type } from "@/types"

export interface List<A> extends FunctypeCollection<A, "List">, DoProtocol<A> {
  readonly length: number
  readonly [Symbol.iterator]: () => Iterator<A>
  // Override these to return List instead of FunctypeCollection
  map: <B>(f: (a: A) => B) => List<B>
  ap: <B>(ff: List<(value: A) => B>) => List<B>
  flatMap: <B>(f: (a: A) => Iterable<B>) => List<B>
  flatMapAsync: <B>(f: (a: A) => PromiseLike<Iterable<B>>) => PromiseLike<List<B>>
  // Override filter for type guard support
  filter<S extends A>(predicate: (a: A) => a is S): List<S>
  filter(predicate: (a: A) => unknown): List<A>
  filterNot: (p: (a: A) => boolean) => List<A>
  // List-specific methods
  /** @internal */
  filterType: <T extends Typeable<string, unknown>>(tag: string) => List<T & A>
  remove: (value: A) => List<A>
  removeAt: (index: number) => List<A>
  add: (item: A) => List<A>
  get: (index: number) => Option<A>
  concat: (other: List<A>) => List<A>
  /**
   * Pattern matches over the List, applying a handler function based on whether it's empty
   * @param patterns - Object with handler functions for Empty and NonEmpty variants
   * @returns The result of applying the matching handler function
   */
  match<R>(patterns: { Empty: () => R; NonEmpty: (values: A[]) => R }): R
}

const ListObject = <A>(values?: Iterable<A>): List<A> => {
  const array: A[] = Array.from(values ?? [])

  const list: List<A> = {
    _tag: "List" as const,

    [Symbol.iterator]: () => array[Symbol.iterator](),

    get size() {
      return array.length
    },

    get length() {
      return array.length
    },

    map: <B>(f: (a: A) => B) => ListObject(array.map(f)),

    ap: <B>(ff: List<(value: A) => B>) => ListObject(array.flatMap((a) => Array.from(ff).map((f) => f(a)))),

    flatMap: <B>(f: (a: A) => Iterable<B>) => ListObject(array.flatMap((a) => Array.from(f(a)))),

    flatMapAsync: async <B>(f: (a: A) => PromiseLike<Iterable<B>>): Promise<List<B>> => {
      const results = await Promise.all(array.map(async (a) => await f(a)))
      return ListObject(results.flatMap((iterable) => Array.from(iterable)))
    },

    forEach: (f: (a: A) => void) => array.forEach(f),

    contains: (value: A): boolean => array.includes(value),

    count: (p: (x: A) => boolean) => array.filter(p).length,

    exists: (p: (a: A) => boolean) => array.some(p),

    filter: (predicate: (a: A) => unknown) => ListObject(array.filter(predicate as (a: A) => boolean)),

    filterNot: (p: (a: A) => boolean) => ListObject(array.filter((x) => !p(x))),

    filterType: <T extends Typeable<string, unknown>>(tag: string) =>
      ListObject(array.filter((x): x is T & A => isTypeable(x, tag))),

    find: <T extends A = A>(predicate: (a: A) => boolean, tag?: ExtractTag<T>) => {
      const result = array.find((x) => predicate(x) && (tag ? isTypeable(x, tag) : true))
      return Option<T>(result as T | null | undefined)
    },

    get head() {
      return array[0] as A | undefined
    },

    get headOption() {
      return array.length > 0 ? Option(array[0]) : None<A>()
    },

    get isEmpty() {
      return array.length === 0
    },

    toArray: <B = A>(): B[] => [...array] as unknown as B[],

    reduce: (f: (prev: A, curr: A) => A) => array.reduce(f),

    reduceRight: (f: (prev: A, curr: A) => A) => array.reduceRight(f),

    fold: <B extends Type>(onEmpty: () => B, onValue: (value: A) => B): B => {
      if (array.length === 0) {
        return onEmpty()
      }
      const firstElement = array[0] as A // Type assertion to avoid undefined
      return onValue(firstElement)
    },

    foldLeft:
      <B>(z: B) =>
      (op: (b: B, a: A) => B) =>
        array.reduce(op, z),

    foldRight:
      <B>(z: B) =>
      (op: (a: A, b: B) => B) =>
        array.reduceRight((acc, value) => op(value, acc), z),

    match: <R>(patterns: { Empty: () => R; NonEmpty: (values: A[]) => R }): R => {
      return array.length === 0 ? patterns.Empty() : patterns.NonEmpty([...array])
    },

    remove: (value: A) => ListObject(array.filter((x) => x !== value)),

    removeAt: (index: number) =>
      index < 0 || index >= array.length ? list : ListObject([...array.slice(0, index), ...array.slice(index + 1)]),

    add: (item: A) => ListObject([...array, item]),

    get: (index: number) => Option(array[index]),

    concat: (other: List<A>) => ListObject([...array, ...other.toArray()]),

    drop: (n: number) => ListObject(array.slice(n)),

    dropRight: (n: number) => ListObject(array.slice(0, -n)),

    dropWhile: (p: (a: A) => boolean) => ListObject(array.slice(array.findIndex((x) => !p(x)))),

    flatten: <B>() => ListObject(array.flatMap((item) => (Array.isArray(item) ? item : ([item] as unknown as B[])))),

    toList: () => list,

    toSet: () => Set(array),

    toString: () => `List(${stringify(array)})`,

    toValue: () => ({ _tag: "List", value: array }),

    pipe: <U>(f: (value: A[]) => U) => f([...array]),

    serialize: () => {
      return {
        toJSON: () => JSON.stringify({ _tag: "List", value: array }),
        toYAML: () => `_tag: List\nvalue: ${stringify(array)}`,
        toBinary: () => Buffer.from(JSON.stringify({ _tag: "List", value: array })).toString("base64"),
      }
    },
    // Add Do-notation protocol support
    [DO_PROTOCOL](): DoResult<A> {
      if (array.length === 0) {
        return { ok: false, error: EmptyListError(), recoverable: true }
      }
      return { ok: true, value: array[0]! }
    },
  }

  return list
}

const ListConstructor = <A>(values?: Iterable<A>): List<A> => ListObject(values)

const ListCompanion = {
  /**
   * Creates a List from JSON string
   * @param json - The JSON string
   * @returns List instance
   */
  fromJSON: <A>(json: string): List<A> => {
    const parsed = JSON.parse(json)
    return List<A>(parsed.value)
  },

  /**
   * Creates a List from YAML string
   * @param yaml - The YAML string
   * @returns List instance
   */
  fromYAML: <A>(yaml: string): List<A> => {
    const lines = yaml.split("\n")
    const valueStr = lines[1]?.split(": ")[1]
    if (!valueStr) {
      return List<A>([])
    }
    const value = JSON.parse(valueStr)
    return List<A>(value)
  },

  /**
   * Creates a List from binary string
   * @param binary - The binary string
   * @returns List instance
   */
  fromBinary: <A>(binary: string): List<A> => {
    const json = Buffer.from(binary, "base64").toString()
    return ListCompanion.fromJSON<A>(json)
  },
}

export const List = Companion(ListConstructor, ListCompanion)
