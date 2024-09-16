import { None, Option, option } from "../option"
import { isIterable } from "../util/isIterable"
import { _Iterable_ } from "./index"

export type Seq<A> = {
  readonly length: number
  readonly [Symbol.iterator]: () => Iterator<A>
  map: <B>(f: (a: A) => B) => Seq<B>
  flatMap: <B>(f: (a: A) => _Iterable_<B>) => Seq<B>
  forEach: (f: (a: A) => void) => void
  count: (p: (x: A) => boolean) => number
  exists: (p: (a: A) => boolean) => boolean
  filter: (p: (a: A) => boolean) => Seq<A>
  filterNot: (p: (a: A) => boolean) => Seq<A>
  find: (p: (a: A) => boolean) => Option<A>
  readonly head: A
  readonly headOption: Option<A>
  readonly isEmpty: boolean
  readonly size: number
  toArray: () => A[]
  reduce: (f: (prev: A, curr: A) => A) => A
  reduceRight: (f: (prev: A, curr: A) => A) => A
  foldLeft: <B>(z: B) => (op: (b: B, a: A) => B) => B
  foldRight: <B>(z: B) => (op: (a: A, b: B) => B) => B
  valueOf: () => { values: A[] }
} & _Iterable_<A>

export const createSeq = <A>(values?: Iterable<A> | _Iterable_<A>): Seq<A> => {
  const iterable: Iterable<A> = isIterable(values)
    ? values
    : values instanceof Object && "toArray" in values
      ? values.toArray()
      : []

  const array = Array.from(iterable)

  return {
    [Symbol.iterator]: () => array[Symbol.iterator](),

    get length() {
      return array.length
    },

    map: <B>(f: (a: A) => B) => createSeq(array.map(f)),

    flatMap: <B>(f: (a: A) => _Iterable_<B>): Seq<B> => createSeq(array.flatMap((a) => f(a).toArray())),

    forEach: (f: (a: A) => void) => array.forEach(f),

    count: (p: (x: A) => boolean) => array.filter(p).length,

    exists: (p: (a: A) => boolean) => array.some(p),

    filter: (p: (a: A) => boolean) => createSeq(array.filter(p)),

    filterNot: (p: (a: A) => boolean) => createSeq(array.filter((x) => !p(x))),

    find: (p: (a: A) => boolean) => option(array.find(p)),

    get head() {
      return array[0]
    },

    get headOption() {
      return array.length > 0 ? option(array[0]) : None<A>()
    },

    get isEmpty() {
      return array.length === 0
    },

    get size() {
      return array.length
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

    valueOf: () => ({ values: array }),
  }
}

export const Seq = <A>(values?: Iterable<A> | _Iterable_<A>): Seq<A> => createSeq(values)
