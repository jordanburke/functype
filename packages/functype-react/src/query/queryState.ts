import type { TaskState } from "../async/TaskState"

/**
 * Structural view of a React Query result — the discriminated shape this module
 * actually depends on. Typed structurally (like {@link IOQueryFnContext}) so the
 * projection carries no `@tanstack/react-query` type dependency; `UseQueryResult`
 * satisfies it.
 */
export type QueryResultView<E, A> =
  | { readonly status: "pending"; readonly fetchStatus: "fetching" | "paused" | "idle" }
  | { readonly status: "success"; readonly data: A }
  | { readonly status: "error"; readonly error: E }

/** Structural view of a React Query mutation result. */
export type MutationResultView<E, A> =
  | { readonly status: "idle" }
  | { readonly status: "pending" }
  | { readonly status: "success"; readonly data: A }
  | { readonly status: "error"; readonly error: E }

/**
 * Projects a React Query result onto the package's `TaskState` ADT, so a query can
 * be folded or matched exhaustively instead of read through `data && !error && !isLoading`.
 *
 * This is the whole point of `functype-react`: omitting a case becomes a compile
 * error, and the success branch hands you a defined `A` rather than `A | undefined`
 * that needs a `!`.
 *
 * ```tsx
 * const query = useIOQuery(["user", id], ({ signal }) => Http.get<User>(url, { signal }))
 *
 * <Match value={toQueryState(query)}>
 *   {{
 *     Idle: () => null,
 *     Pending: () => <Spinner />,
 *     Failure: ({ error }) => <Err e={error} />,
 *     Success: ({ value }) => <Profile user={value} />,
 *   }}
 * </Match>
 * ```
 *
 * A disabled query (`enabled: false`, never fetched) projects to `Idle`; an
 * in-flight or paused one to `Pending`. Reuses the same `TaskState` that
 * `functype-react/async`'s `useTask` returns, so both async surfaces match alike.
 *
 * **Stale data on a failed refetch.** React Query keeps the last successful `data`
 * while setting `status: "error"` when a *background refetch* fails. `TaskState` has
 * no variant for "loaded, but the latest fetch failed", so that squashes to `Failure`
 * and the still-held data is not surfaced through the ADT — a transient background
 * failure will flip a loaded view to an error branch. This is the deliberate default:
 * it never silently hides a failure. If you would rather keep rendering stale data,
 * read `query.data` directly alongside the projection, or branch on
 * `query.isRefetchError` before projecting.
 *
 * **Interruption.** `IO.run()` maps an interrupted effect to `Left(InterruptedError)`,
 * which is not an `E`. Nothing in this subpath interrupts effects, so it will not
 * arise here, but it is worth knowing that `.error` is `E` by construction rather
 * than by proof.
 */
export const toQueryState = <E, A>(result: QueryResultView<E, A>): TaskState<E, A> => {
  switch (result.status) {
    case "success":
      return { _tag: "Success", value: result.data }
    case "error":
      return { _tag: "Failure", error: result.error }
    case "pending":
      return result.fetchStatus === "idle" ? { _tag: "Idle" } : { _tag: "Pending" }
  }
}

/**
 * Projects a React Query mutation result onto `TaskState`. React Query models an
 * unfired mutation as `status: "idle"`, which maps directly onto `Idle`.
 */
export const toMutationState = <E, A>(result: MutationResultView<E, A>): TaskState<E, A> => {
  switch (result.status) {
    case "success":
      return { _tag: "Success", value: result.data }
    case "error":
      return { _tag: "Failure", error: result.error }
    case "pending":
      return { _tag: "Pending" }
    case "idle":
      return { _tag: "Idle" }
  }
}
