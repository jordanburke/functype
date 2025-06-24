import type { Functor } from "@/functor/Functor"
import type { Type } from "@/types"

/**
 * Traversable typeclass for data structures that can be traversed through
 */
export interface Traversable<A extends Type> extends Functor<A> {
  get size(): number

  get isEmpty(): boolean

  contains(value: A): boolean

  reduce(f: (b: A, a: A) => A): A

  reduceRight(f: (b: A, a: A) => A): A
}
