import { Collection } from "../collections"
import { _Iterable_, Seq } from "../iterable"
import { option } from "../option"
import { Option } from "../option"
import { Set } from "../set"

export type List<A> = {
  add: (item: A) => List<A>
  map: <B>(f: (a: A) => B) => List<B>
  flatMap: <B>(f: (a: A) => _Iterable_<B>) => List<B>
  remove: (value: A) => List<A>
  contains: (value: A) => boolean
  removeAt: (index: number) => List<A>
  get: (index: number) => Option<A>
  concat: (other: List<A>) => List<A>
  toList: () => List<A>
  toSet: () => Set<A>
  toString: () => string
  valueOf: () => { values: A[] }
} & ArrayLike<A> &
  _Iterable_<A> &
  Collection<A>

const createList = <A>(values?: Iterable<A> | _Iterable_<A>): List<A> => {
  function isIterable<T>(value: unknown): value is Iterable<T> {
    return value != null && typeof value[Symbol.iterator] === "function"
  }

  const array = Array.isArray(values) ? values : isIterable(values) ? Array.from(values) : []
  const seqMethods = Seq(array)

  const list: List<A> = {
    ...seqMethods,

    length: array.length,

    //[Symbol.iterator]: () => array[Symbol.iterator](),

    map: <B>(f: (a: A) => B): List<B> => createList(array.map(f)),

    flatMap: <B>(f: (a: A) => _Iterable_<B>): List<B> => createList(seqMethods.flatMap(f)),

    remove: (value: A): List<A> => {
      const index = array.indexOf(value)
      return list.removeAt(index)
    },

    contains: (value: A): boolean => array.includes(value),

    add: (item: A): List<A> => createList([...array, item]),

    removeAt: (index: number): List<A> => {
      if (index < 0 || index >= array.length) {
        return list
      }
      return createList([...array.slice(0, index), ...array.slice(index + 1)])
    },

    get: (index: number): Option<A> => option(array[index]),

    concat: (other: List<A>): List<A> => createList([...array, ...other.toArray()]),

    toList: (): List<A> => list,

    toSet: (): Set<A> => Set(array),

    toString: (): string => `List(${array.toString()})`,
  }

  return new Proxy(list, {
    get(target, prop) {
      if (typeof prop === "symbol" || isNaN(Number(prop))) {
        return target[prop as keyof typeof target]
      }
      return target.get(Number(prop))
    },
  })
}

export const List = <A>(values?: Iterable<A> | _Iterable_<A>): List<A> => createList(values)
