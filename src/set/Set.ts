import { Collection } from "@/collections"
import { IterableType } from "@/iterable"
import { List } from "@/list/List"

import { ESSet, IESSet } from "./shim"

export type Set<A> = {
  add: (value: A) => Set<A>
  remove: (value: A) => Set<A>
  contains: (value: A) => boolean
  has: (value: A) => boolean
  map: <B>(f: (a: A) => B) => Set<B>
  flatMap: <B>(f: (a: A) => IterableType<B>) => Set<B>
  toList: () => List<A>
  toSet: () => Set<A>
  toString: () => string
} & IterableType<A> &
  Collection<A>

const createSet = <A>(iterable?: Iterable<A>): Set<A> => {
  const values: IESSet<A> = new ESSet<A>(iterable)

  const seqMethods = List(values)

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

    flatMap: <B>(f: (a: A) => IterableType<B>): Set<B> => createSet(seqMethods.flatMap(f)),

    toList: (): List<A> => List(values),

    toSet: (): Set<A> => set,

    toString: (): string => `Set(${Array.from(values).toString()})`,
  }

  return set
}

export const Set = <A>(iterable?: Iterable<A> | IterableType<A>): Set<A> => createSet(iterable)
