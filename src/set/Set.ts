import { Collection } from "../collections"
import { _Iterable_, Seq } from "../iterable"
import { List } from "../list"
import { isIterable } from "../util/isIterable"
import { ESSet, IESSet } from "./shim"

export type Set<A> = {
  add: (value: A) => Set<A>
  remove: (value: A) => Set<A>
  contains: (value: A) => boolean
  has: (value: A) => boolean
  map: <B>(f: (a: A) => B) => Set<B>
  flatMap: <B>(f: (a: A) => _Iterable_<B>) => Set<B>
  toList: () => List<A>
  toSet: () => Set<A>
  toString: () => string
} & _Iterable_<A> &
  Collection<A>

const createSet = <A>(iterable?: Iterable<A> | _Iterable_<A>): Set<A> => {
  const values: IESSet<A> = isIterable(iterable) ? new ESSet<A>(iterable) : new ESSet<A>(iterable?.toArray() ?? [])

  const seqMethods = Seq(values)

  const set: Set<A> = {
    ...seqMethods,

    add: (value: A): Set<A> => createSet([...values, value]),

    remove: (value: A): Set<A> => {
      const newSet = new ESSet(values)
      newSet.delete(value)
      return createSet(newSet)
    },

    contains: (value: A): boolean => values.has(value),

    has: (value: A): boolean => values.has(value),

    map: <B>(f: (a: A) => B): Set<B> => createSet(seqMethods.map(f)),

    flatMap: <B>(f: (a: A) => _Iterable_<B>): Set<B> => createSet(seqMethods.flatMap(f)),

    toList: (): List<A> => List(values),

    toSet: (): Set<A> => set,

    toString: (): string => `Set(${Array.from(values).toString()})`,
  }

  return set
}

export const Set = <A>(iterable?: Iterable<A> | _Iterable_<A>): Set<A> => createSet(iterable)
