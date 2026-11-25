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

/** The `is…` flags for one case of `AsyncState`: `true` for that case, `false` for the rest. */
type FlagsFor<Tag extends AsyncState<unknown, unknown>["_tag"]> = {
  readonly isIdle: Tag extends "Idle" ? true : false
  readonly isPending: Tag extends "Pending" ? true : false
  readonly isSuccess: Tag extends "Success" ? true : false
  readonly isFailure: Tag extends "Failure" ? true : false
}

/**
 * `AsyncState` with an `is…` flag for each case. Each flag is the literal `true` on its own case
 * and `false` on the others, so a flag narrows the state the way `_tag` does:
 * `if (state.isFailure) state.error` type-checks.
 */
export type AsyncStateWithFlags<E, A> =
  | ({ readonly _tag: "Idle" } & FlagsFor<"Idle">)
  | ({ readonly _tag: "Pending" } & FlagsFor<"Pending">)
  | ({ readonly _tag: "Success"; readonly value: A } & FlagsFor<"Success">)
  | ({ readonly _tag: "Failure"; readonly error: E } & FlagsFor<"Failure">)

const NONE = { isIdle: false, isPending: false, isSuccess: false, isFailure: false } as const

/** Adds the `is…` flags to an `AsyncState`, typed per case so each flag narrows. */
export const withFlags = <E, A>(state: AsyncState<E, A>): AsyncStateWithFlags<E, A> => {
  switch (state._tag) {
    case "Idle":
      return { ...state, ...NONE, isIdle: true }
    case "Pending":
      return { ...state, ...NONE, isPending: true }
    case "Success":
      return { ...state, ...NONE, isSuccess: true }
    case "Failure":
      return { ...state, ...NONE, isFailure: true }
  }
}
