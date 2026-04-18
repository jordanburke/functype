import type { AsyncMonad, Widen } from "@/typeclass"
import type { Type } from "@/types"

/**
 * Traversable typeclass for data structures that can be traversed through.
 *
 * Covariance: A is declared `<out A>`. Query (`contains`) accepts `unknown` —
 * mirroring Scala's `contains(elem: Any)` — so an unrelated-type arg is a
 * sound `false` rather than a type error. Aggregations (`reduce`, `reduceRight`)
 * widen the accumulator via `<B = A>`, matching Scala's `reduce[B >: A]`; when
 * called without an explicit type arg the behavior is identical to the pre-0.59
 * signature, so existing call sites compile unchanged.
 *
 * Implementers that previously overrode these methods with the widened shape
 * (List, Set) can inherit from this base without a per-type override.
 */
export interface Traversable<out A extends Type> extends AsyncMonad<A> {
  get size(): number

  get isEmpty(): boolean

  contains(value: unknown): boolean

  reduce<B = A>(op: (b: Widen<A, B>, a: Widen<A, B>) => Widen<A, B>): Widen<A, B>

  reduceRight<B = A>(op: (b: Widen<A, B>, a: Widen<A, B>) => Widen<A, B>): Widen<A, B>
}
