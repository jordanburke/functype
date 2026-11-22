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
export interface Traversable<out A extends Type> extends AsyncMonad<A>, Reducible<A> {}

/**
 * Traversable's members without the monad's: size, membership and reduction. Key-value containers
 * and collections, whose `map` and `flatMap` take tighter shapes, extend this rather than
 * `Omit<Traversable<A>, …>`: a member reached through a mapped type has no declaration, so
 * `@typescript-eslint/unbound-method` can't see it.
 */
export interface Reducible<out A extends Type> {
  get size(): number

  get isEmpty(): boolean

  contains(value: unknown): boolean

  reduce<B = A>(op: (b: Widen<A, B>, a: Widen<A, B>) => Widen<A, B>): Widen<A, B>

  reduceRight<B = A>(op: (b: Widen<A, B>, a: Widen<A, B>) => Widen<A, B>): Widen<A, B>
}
