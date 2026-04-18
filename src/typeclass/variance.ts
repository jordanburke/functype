/**
 * Variance helpers — small utilities for expressing covariance-safe signatures
 * when TypeScript's type system doesn't offer the exact constraint we need.
 *
 * Motivation: Scala has lower-bound type parameters like `def reduce[B >: A](op: (B, B) => B): B`
 * — B must be a supertype of A. TypeScript lacks lower bounds, so a naive port
 * (`reduce<B = A>(op: (b: B, a: B) => B): B`) lets the caller pick ANY B, including
 * unrelated types. At runtime that's a footgun: `List<number>.reduce<string>(...)` would
 * compile but run as number addition typed as string.
 *
 * `Widen<A, B>` closes that gap using a conditional type. When B is truly a supertype
 * of A (including the default case B = A), `Widen<A, B>` is B. When B is unrelated,
 * it resolves to `never`, which makes the callback uncallable and produces a compile
 * error at the call site.
 *
 * @module typeclass/variance
 */

/**
 * The TypeScript equivalent of Scala's `B >: A` (B is a supertype of A).
 *
 * Resolves to `B` when `A extends B` (i.e., B is a legitimate supertype of A, or B = A).
 * Resolves to `never` otherwise, which renders any callback position using Widen
 * uncallable — the user gets a compile-time error rather than a runtime type lie.
 *
 * @example
 * ```ts
 * // Inside a container interface:
 * reduce<B = A>(op: (b: Widen<A, B>, a: Widen<A, B>) => Widen<A, B>): Widen<A, B>
 *
 * // Callers:
 * list.reduce((a, b) => a + b)          // B defaults to A, Widen<A,A> = A, fine
 * list.reduce<A | "extra">(...)         // A extends A | "extra", Widen = B, fine
 * list.reduce<UnrelatedType>(...)       // A doesn't extend Unrelated, Widen = never, compile error
 * ```
 */
export type Widen<A, B> = A extends B ? B : never

/**
 * Runtime-safe `reduce` over an array whose element type `A` may be narrower than
 * the accumulator type `B`. Centralizes the single `as unknown as B` cast that's
 * otherwise spread across every container's implementation.
 *
 * Safety: the cast is sound because the `Widen<A, B>` type-level constraint at the
 * public API layer guarantees `A <: B`. When that holds, A values flowing into the
 * callback are valid B values at runtime — exactly what Scala's `[B >: A]` provides.
 *
 * @param arr - source array of A values
 * @param op - accumulator operation typed over B (where B is A or a supertype)
 * @returns the folded value, typed as B
 */
export const reduceWiden = <A, B>(arr: readonly A[], op: (b: B, a: B) => B): B =>
  arr.reduce(op as unknown as (prev: A, curr: A) => A) as unknown as B

/**
 * Right-associative variant of {@link reduceWiden}. Same safety argument.
 */
export const reduceRightWiden = <A, B>(arr: readonly A[], op: (b: B, a: B) => B): B =>
  arr.reduceRight(op as unknown as (prev: A, curr: A) => A) as unknown as B
