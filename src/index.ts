import { Functor, Type } from "./functor"

export type Traversable<A extends Type> = Functor<A> & {
  get size(): number

  get isEmpty(): boolean

  contains(value: A): boolean

  reduce(f: (b: A, a: A) => A): A

  reduceRight(f: (b: A, a: A) => A): A

  foldLeft<B>(z: B): (op: (b: B, a: A) => B) => B

  foldRight<B>(z: B): (op: (a: A, b: B) => B) => B
}

export * from "./either"
export * from "./functor"
export * from "./iterable"
export * from "./list"
export * from "./map"
export * from "./option"
export * from "./set"
export * from "./try"
export * from "./tuple"

export type Typeable = { _tag: Type }
