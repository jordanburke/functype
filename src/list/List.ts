import stringify from "safe-stable-stringify"

import { AsyncFunctor } from "../functor"
import { IterableType } from "../iterable"
import { None, Option } from "../option/Option"
import { Set } from "../set/Set"
import { Typeable } from "../typeable/Typeable"

export type List<A> = {
  readonly length: number
  readonly [Symbol.iterator]: () => Iterator<A>
  map: <B>(f: (a: A) => B) => List<B>
  flatMap: <B>(f: (a: A) => IterableType<B>) => List<B>
  flatMapAsync: <B>(f: (a: A) => PromiseLike<IterableType<B>>) => PromiseLike<List<B>>
  forEach: (f: (a: A) => void) => void
  count: (p: (x: A) => boolean) => number
  exists: (p: (a: A) => boolean) => boolean
  filter: (p: (a: A) => boolean) => List<A>
  filterNot: (p: (a: A) => boolean) => List<A>
  find: (p: (a: A) => boolean) => Option<A>
  readonly head: A
  readonly headOption: Option<A>
  readonly isEmpty: boolean
  toArray: () => A[]
  reduce: (f: (prev: A, curr: A) => A) => A
  reduceRight: (f: (prev: A, curr: A) => A) => A
  foldLeft: <B>(z: B) => (op: (b: B, a: A) => B) => B
  foldRight: <B>(z: B) => (op: (a: A, b: B) => B) => B
  remove: (value: A) => List<A>
  removeAt: (index: number) => List<A>
  add: (item: A) => List<A>
  get: (index: number) => Option<A>
  concat: (other: List<A>) => List<A>
  toList: () => List<A>
  toSet: () => Set<A>
  toString: () => string
  toValue: () => { _tag: string; value: A[] }
} & IterableType<A> &
  Typeable<"List"> &
  AsyncFunctor<A>

const createList = <A>(values?: Iterable<A>): List<A> => {
  const array = Array.from(values || [])

  const list: List<A> = {
    _tag: "List",

    [Symbol.iterator]: () => array[Symbol.iterator](),

    get size() {
      return array.length
    },

    get length() {
      return array.length
    },

    map: <B>(f: (a: A) => B) => createList(array.map(f)),

    flatMap: <B>(f: (a: A) => IterableType<B>) => createList(array.flatMap((a) => Array.from(f(a)))),

    flatMapAsync: async <B>(f: (a: A) => PromiseLike<IterableType<B>>): Promise<List<B>> => {
      const results = await Promise.all(array.map(async (a) => await f(a)))
      return createList(results.flatMap((iterable) => Array.from(iterable)))
    },

    forEach: (f: (a: A) => void) => array.forEach(f),

    count: (p: (x: A) => boolean) => array.filter(p).length,

    exists: (p: (a: A) => boolean) => array.some(p),

    filter: (p: (a: A) => boolean) => createList(array.filter(p)),

    filterNot: (p: (a: A) => boolean) => createList(array.filter((x) => !p(x))),

    find: (p: (a: A) => boolean) => Option(array.find(p)),

    get head() {
      return array[0]
    },

    get headOption() {
      return array.length > 0 ? Option(array[0]) : None<A>()
    },

    get isEmpty() {
      return array.length === 0
    },

    toArray: () => [...array],

    reduce: (f: (prev: A, curr: A) => A) => array.reduce(f),

    reduceRight: (f: (prev: A, curr: A) => A) => array.reduceRight(f),

    foldLeft:
      <B>(z: B) =>
      (op: (b: B, a: A) => B) =>
        array.reduce(op, z),

    foldRight:
      <B>(z: B) =>
      (op: (a: A, b: B) => B) =>
        array.reduceRight((acc, value) => op(value, acc), z),

    remove: (value: A) => createList(array.filter((x) => x !== value)),

    removeAt: (index: number) => createList(array.slice(0, index).concat(array.slice(index + 1))),

    add: (item: A) => createList([...array, item]),

    get: (index: number) => Option(array[index]),

    concat: (other: List<A>) => createList([...array, ...other.toArray()]),

    drop: (n: number) => createList(array.slice(n)),

    dropRight: (n: number) => createList(array.slice(0, -n)),

    dropWhile: (p: (a: A) => boolean) => createList(array.slice(array.findIndex((x) => !p(x)))),

    flatten: <B>() => createList(array.flatMap((item) => (Array.isArray(item) ? item : ([item] as unknown as B[])))),

    toList: () => list,

    toSet: () => Set(array),

    toString: () => `List(${stringify(array)})`,

    toValue: () => ({ _tag: "List", value: array }),
  }

  return list
}

export const List = <A>(values?: Iterable<A>): List<A> => createList(values)
