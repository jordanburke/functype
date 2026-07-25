"use client"

import type { QueryFunctionContext, QueryKey, UseQueryResult } from "@tanstack/react-query"
import type { IO } from "functype/io"

import type { TaskState } from "../async/TaskState"
import type { IOQueryError } from "./IOQueryError"
import { toQueryState } from "./queryState"
import type { UseIOQueryOptions } from "./useIOQuery"
import { useIOQuery } from "./useIOQuery"

/**
 * `TaskState` plus the convenience flags and refetch trigger, mirroring
 * `UseTaskResult` from `functype-react/async` so both async surfaces read alike.
 *
 * `refetch` keeps React Query's own signature rather than a lossy re-declaration.
 */
export type UseIOQueryStateResult<A, E> = TaskState<IOQueryError<E>, A> &
  Pick<UseQueryResult<A, IOQueryError<E>>, "refetch"> & {
    readonly isIdle: boolean
    readonly isPending: boolean
    readonly isSuccess: boolean
    readonly isFailure: boolean
  }

/**
 * `useIOQuery` projected straight onto the `TaskState` ADT — the flag-soup-free path
 * in one call.
 *
 * ```tsx
 * const user = useIOQueryState(["user", id], ({ signal }) => Http.get<User>(url, { signal }))
 *
 * <Match value={user}>
 *   {{
 *     Idle: () => null,
 *     Pending: () => <Spinner />,
 *     Failure: ({ error }) => <Err e={error.error} />,
 *     Success: ({ value }) => <Profile user={value} />,
 *   }}
 * </Match>
 * ```
 *
 * Reads only `status` / `fetchStatus` / `data` / `error` / `refetch` off the query, so
 * React Query's tracked-properties optimization still applies — the component is not
 * subscribed to fields it never renders. When you need the rest of the result
 * (`isFetching`, `dataUpdatedAt`, `invalidate`), use {@link useIOQuery} with
 * {@link toQueryState} instead.
 */
export function useIOQueryState<A, E, TData = A, TQueryKey extends QueryKey = QueryKey>(
  queryKey: TQueryKey,
  io: (context: QueryFunctionContext<TQueryKey>) => IO<never, E, A>,
  options?: UseIOQueryOptions<A, E, TData, TQueryKey>,
): UseIOQueryStateResult<TData, E> {
  const query = useIOQuery(queryKey, io, options)
  const state = toQueryState(query)

  return {
    ...state,
    isIdle: state._tag === "Idle",
    isPending: state._tag === "Pending",
    isSuccess: state._tag === "Success",
    isFailure: state._tag === "Failure",
    refetch: query.refetch,
  }
}
