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

export * from "./core/base/Base"
export * from "./core/task/Sync"
export * from "./core/throwable/Throwable"
export * from "./either/Either"
export * from "./functor"
export * from "./identity/Identity"
export * from "./iterable"
export * from "./list/List"
export * from "./map/Map"
export * from "./option/Option"
export * from "./set/Set"
export * from "./try/Try"
export * from "./tuple/Tuple"
export * from "./typeable/Typeable"
