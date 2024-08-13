import { _Functor_, Type } from "../functor"
import { _Option_ } from "../option"

export type _Iterable_<A extends Type> = {
  count(p: (x: A) => boolean): number

  find(p: (a: A) => boolean): _Option_<A>

  forEach(f: (a: A) => void): void

  // drop(n: number): IIterable<A>
  //
  // dropRight(n: number): IIterable<A>
  //
  // dropWhile(p: (a: A) => boolean): IIterable<A>

  exists(p: (a: A) => boolean): Boolean

  filter(p: (a: A) => boolean): _Iterable_<A>

  filterNot(p: (a: A) => boolean): _Iterable_<A>

  //flatten<B>() : Iterable<B>;

  reduce(f: (b: A, a: A) => A): A

  reduceRight(f: (b: A, a: A) => A): A

  foldLeft<B>(z: B): (op: (b: B, a: A) => B) => B

  foldRight<B>(z: B): (op: (a: A, b: B) => B) => B

  get head(): A

  get headOption(): _Option_<A>

  get isEmpty(): boolean

  map<B extends Type>(f: (a: A) => B): _Iterable_<B>

  flatMap<B extends Type>(f: (a: A) => _Iterable_<B>): _Iterable_<B>

  get size(): number

  toArray(): readonly A[]
} & _Functor_<A>

export { Seq } from "./Seq"
