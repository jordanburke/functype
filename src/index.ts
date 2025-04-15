import type { Functor, Type } from "./functor"

export type Traversable<A extends Type> = Functor<A> & {
  get size(): number

  get isEmpty(): boolean

  contains(value: A): boolean

  reduce(f: (b: A, a: A) => A): A

  reduceRight(f: (b: A, a: A) => A): A

  foldLeft<B>(z: B): (op: (b: B, a: A) => B) => B

  foldRight<B>(z: B): (op: (a: A, b: B) => B) => B
}

export * from "@/branded"
export * from "@/companion/Companion"
export * from "@/core/base/Base"
export * from "@/core/task/Task"
export * from "@/core/throwable/Throwable"
export * from "@/either/Either"
export * from "@/fpromise/FPromise"
export * from "@/functor"
export * from "@/hkt"
export * from "@/identity/Identity"
export * from "@/iterable"
export * from "@/list"
export * from "@/map"
export * from "@/option"
export * from "@/set"
export * from "@/try"
export * from "@/tuple"
export * from "@/typeable"
