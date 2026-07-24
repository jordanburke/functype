"use client"

import type { QueryFunctionContext, QueryKey, UseQueryOptions, UseQueryResult } from "@tanstack/react-query"
import { useQuery } from "@tanstack/react-query"
import type { IO } from "functype/io"

import type { IOQueryError } from "./IOQueryError"
import { ioQueryFn } from "./ioQueryFn"

export type UseIOQueryOptions<A, E, TData, TQueryKey extends QueryKey> = Omit<
  UseQueryOptions<A, IOQueryError<E>, TData, TQueryKey>,
  "queryKey" | "queryFn"
> & {
  /** Override the derived `Error.message` on failure. */
  readonly formatError?: (error: E) => string
}

/**
 * `useQuery` for effects — runs an `IO<never, E, A>` and threads its typed error channel
 * through to React Query's `error`.
 *
 * The failure is boxed as `IOQueryError<E>`, so `error instanceof Error` and
 * `error.message` behave normally while `error.error` stays fully discriminable:
 *
 * ```ts
 * const { data, error } = useIOQuery(
 *   ["connector-limits", userId],
 *   ({ signal }) => Http.get<Limits>(url, { headers, signal }),
 *   { enabled: !!userId },
 * )
 *
 * if (error) {
 *   HttpErrors.match(error.error, {
 *     NetworkError: () => <Offline />,
 *     HttpStatusError: (e) => (e.status === 403 ? <UpgradePrompt /> : <Failed />),
 *     DecodeError: () => <SchemaDrift />,
 *   })
 * }
 * ```
 *
 * Every other `useQuery` option (`select`, `staleTime`, `placeholderData`, …) passes
 * through untouched. For full control over the query object — or for
 * `useSuspenseQuery` / `useInfiniteQuery` — use the `ioQueryFn` primitive directly.
 */
export function useIOQuery<A, E, TData = A, TQueryKey extends QueryKey = QueryKey>(
  queryKey: TQueryKey,
  io: (context: QueryFunctionContext<TQueryKey>) => IO<never, E, A>,
  options?: UseIOQueryOptions<A, E, TData, TQueryKey>,
): UseQueryResult<TData, IOQueryError<E>> {
  const { formatError, ...queryOptions } = options ?? {}

  return useQuery<A, IOQueryError<E>, TData, TQueryKey>({
    ...queryOptions,
    queryKey,
    queryFn: ioQueryFn<E, A, QueryFunctionContext<TQueryKey>>(io, { formatError }),
  })
}
