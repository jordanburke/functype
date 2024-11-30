import { AsyncFunctor, Functor, Type } from "../functor"
import { Option } from "../option/Option"

export type IterableType<A extends Type> = {
  count(p: (x: A) => boolean): number

  find(p: (a: A) => boolean): Option<A>

  forEach(f: (a: A) => void): void

  drop(n: number): IterableType<A>

  dropRight(n: number): IterableType<A>

  dropWhile(p: (a: A) => boolean): IterableType<A>

  exists(p: (a: A) => boolean): boolean

  filter(p: (a: A) => boolean): IterableType<A>

  filterNot(p: (a: A) => boolean): IterableType<A>

  flatten<B>(): IterableType<B>

  reduce(f: (b: A, a: A) => A): A

  reduceRight(f: (b: A, a: A) => A): A

  foldLeft<B>(z: B): (op: (b: B, a: A) => B) => B

  foldRight<B>(z: B): (op: (a: A, b: B) => B) => B

  get head(): A

  get headOption(): Option<A>

  get isEmpty(): boolean

  map<B extends Type>(f: (a: A) => B): IterableType<B>

  flatMap<B extends Type>(f: (a: A) => IterableType<B>): IterableType<B>

  get size(): number

  toArray(): readonly A[]

  toValue: () => { _tag: string; value: A[] }
} & Iterable<A> &
  Functor<A> &
  AsyncFunctor<A>
