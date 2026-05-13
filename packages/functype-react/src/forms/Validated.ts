import { type Either, Left, List, type List as ListT, Right } from "functype"

/**
 * Applicative-error-accumulating result for form validation.
 *
 * Encoded as `Either<List<E>, A>` — the same shape Scala's cats uses for
 * `ValidatedNel`. Multiple field errors accumulate via `List.concat`; on
 * success, the validated value rides in the `Right` channel.
 *
 * functype core already exposes this pattern via `FormValidation<T>` in
 * `packages/functype/src/error/typed/Validation.ts`; this alias just gives
 * the React-facing surface an ergonomic name.
 */
export type Validated<E, A> = Either<ListT<E>, A>

/** Construct a `Valid` (Right) result. */
export function valid<A>(value: A): Validated<never, A> {
  return Right<ListT<never>, A>(value)
}

/** Construct an `Invalid` (Left) result from an iterable of errors. */
export function invalid<E>(errors: ListT<E> | ReadonlyArray<E>): Validated<E, never> {
  const list = errors instanceof Array ? List<E>(errors) : (errors as ListT<E>)
  return Left<ListT<E>, never>(list)
}
