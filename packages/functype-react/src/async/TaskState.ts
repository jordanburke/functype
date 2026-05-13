/**
 * Lifecycle state of an async operation managed by `useTask`.
 *
 * Note: the tag values are `Idle | Pending | Success | Failure` — these are
 * the consumer-facing lifecycle phases, intentionally broader than functype
 * core's `TaskOutcome<T>` (which has only `Ok | Err`). The hook maps
 * `TaskOutcome.Ok → Success`, `TaskOutcome.Err → Failure`, and adds `Idle`
 * (pre-mount) and `Pending` (in flight) for the rendering side.
 */
export type TaskState<E, A> =
  | { readonly _tag: "Idle" }
  | { readonly _tag: "Pending" }
  | { readonly _tag: "Success"; readonly value: A }
  | { readonly _tag: "Failure"; readonly error: E }
