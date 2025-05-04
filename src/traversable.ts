import type { Functor } from "@/functor"
import type { Type } from "@/types"

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
