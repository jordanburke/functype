import { _Collection } from "../collections"
import { _Iterable_, Seq } from "../iterable"
import { option } from "../option"
import { Option } from "../option"
import { Set } from "../set"

export type _List_<T> = _Iterable_<T> &
  ArrayLike<T> & {
    add: (item: T) => _List_<T>
    removeAt: (index: number) => _List_<T>
  }

export type List<A> = _Collection<A> & {
  map: <B>(f: (a: A) => B) => List<B>
  flatMap: <B>(f: (a: A) => _Iterable_<B>) => List<B>
  remove: (value: A) => List<A>
  contains: (value: A) => boolean
  removeAt: (index: number) => List<A>
  get: (index: number) => Option<A>
  concat: (other: List<A>) => List<A>
  toList: () => _List_<A>
  toSet: () => Set<A>
  toString: () => string
  valueOf: () => { values: A[] }
} & _List_<A>

const createList = <A>(values?: Iterable<A> | _Iterable_<A>): List<A> => {
  function isIterable<T>(value: any): value is Iterable<T> {
    return value != null && typeof value[Symbol.iterator] === "function"
  }

  //const array = Array.isArray(values) ? values : Array.from(values ?? [])
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

    toList: (): _List_<A> => list,

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
