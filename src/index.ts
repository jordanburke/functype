import type { Functor, Type } from "./functor"

/**
 * Foldable typeclass for data structures that can be folded to a summary value.
 * This is just a reference. The actual Foldable implementation is in @/foldable.
 */

/**
 * Traversable typeclass for data structures that can be traversed through
 */
export type Traversable<A extends Type> = Functor<A> & {
  get size(): number

  get isEmpty(): boolean

  contains(value: A): boolean

  reduce(f: (b: A, a: A) => A): A

  reduceRight(f: (b: A, a: A) => A): A
}

export * from "@/branded"
export * from "@/companion/Companion"
export * from "@/core/base/Base"
export * from "@/core/task/Task"
export * from "@/core/throwable/Throwable"
export * from "@/either/Either"
export * from "@/foldable"
export * from "@/foldable/Foldable"
export * from "@/fpromise/FPromise"
export * from "@/functor"
export * from "@/hkt"
export * from "@/identity/Identity"
export * from "@/iterable"
export * from "@/list/List"
export * from "@/map/Map"
export * from "@/matchable"
export * from "@/option/Option"
export * from "@/pipe"
export * from "@/set/Set"
export * from "@/try/Try"
export * from "@/tuple/Tuple"
export * from "@/typeable/Typeable"
