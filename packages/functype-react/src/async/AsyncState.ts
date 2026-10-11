/**
 * Lifecycle state of an async operation managed by `useIO` (and the query hooks'
 * `toQueryState` / `useIOQueryState` projections).
 *
 * `Idle` is before the first run, `Pending` while it's in flight, then `Success` or
 * `Failure`. A cancelled run (unmount, or `deps` changing) never reaches `Failure`: its
 * result is discarded.
 */
export type AsyncState<E, A> =
  | { readonly _tag: "Idle" }
  | { readonly _tag: "Pending" }
  | { readonly _tag: "Success"; readonly value: A }
  | { readonly _tag: "Failure"; readonly error: E }
