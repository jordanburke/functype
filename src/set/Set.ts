import { ESSet, IESSet } from "./shim"
import { _Iterable_, Seq } from "../iterable"
import { _List_, List } from "../list"
import { _Collection } from "../collections"
import { isIterable } from "../util/isIterable"

export type _Set_<T> = {
  has(value: T): boolean
} & _Iterable_<T> &
  _Collection<T>

export class Set<A> extends Seq<A> implements _Set_<A> {
  constructor(iterable?: Iterable<A> | _Iterable_<A>) {
    if (isIterable(iterable)) {
      super(new ESSet<A>(iterable))
    } else {
      super(iterable?.toArray())
    }
  }

  add(value: A): Set<A> {
    return new Set([...this.values, value])
  }

  remove(value: A): Set<A> {
    const newSet = new ESSet<A>()
    return newSet.delete(value) ? new Set(newSet) : this
  }

  contains(value: A): boolean {
    return this.has(value)
  }

  has(value: A): boolean {
    return (this.values as IESSet<A>).has(value)
  }

  map<B>(f: (a: A) => B): Set<B> {
    return new Set(super.map(f))
  }

  flatMap<B>(f: (a: A) => _Iterable_<B>): Set<B> {
    return new Set(super.flatMap(f))
  }

  toList(): _List_<A> {
    return new List(this)
  }

  toSet(): _Set_<A> {
    return this
  }

  toString(): string {
    return `Set(${this.toArray().toString()})`
  }
}
