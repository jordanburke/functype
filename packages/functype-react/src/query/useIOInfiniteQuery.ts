"use client"

import type {
  InfiniteData,
  QueryFunctionContext,
  QueryKey,
  QueryMeta,
  UseInfiniteQueryResult,
} from "@tanstack/react-query"
import { useInfiniteQuery } from "@tanstack/react-query"
import type { Option as OptionType } from "functype"
import { Option } from "functype"
import type { IO } from "functype/io"

import type { IOQueryError } from "./IOQueryError"
import { ioQueryFn } from "./ioQueryFn"

/**
 * A page param as React Query stores it: the param itself, or `null` for the first page. Kept a
 * plain value so the cache stays serializable for persisters and SSR hydration; the hook's own
 * callbacks see it as an `Option`.
 *
 * @interop React Query stores page params in its cache and reads a `null` next param as "no more pages".
 */
export type StoredPageParam<P> = P | null

/** What the effect factory of {@link useIOInfiniteQuery} receives. */
export type IOInfiniteQueryContext<P, TQueryKey extends QueryKey = QueryKey> = {
  /** Aborts when React Query cancels the fetch. Pass it on to the request. */
  readonly signal: AbortSignal
  readonly queryKey: TQueryKey
  /** `None` for the first page, else the param `getNextPageParam` or `getPreviousPageParam` gave. */
  readonly pageParam: OptionType<P>
  readonly meta: QueryMeta | undefined
}

/** Works out the param of the next or previous page, or `None` when there isn't one. */
export type IOPageParamFunction<A, P> = (
  page: A,
  allPages: ReadonlyArray<A>,
  pageParam: OptionType<P>,
  allPageParams: ReadonlyArray<OptionType<P>>,
) => OptionType<P>

/**
 * The options `useInfiniteQuery` itself takes for these types. Read from the function rather than
 * from `UseInfiniteQueryOptions`, whose type parameters changed within v5.
 */
type InfiniteOptions<A, E, P, TData, TQueryKey extends QueryKey> = Parameters<
  typeof useInfiniteQuery<A, IOQueryError<E>, TData, TQueryKey, StoredPageParam<P>>
>[0]

export type UseIOInfiniteQueryOptions<A, E, P, TData, TQueryKey extends QueryKey> = Omit<
  InfiniteOptions<A, E, P, TData, TQueryKey>,
  "queryKey" | "queryFn" | "initialPageParam" | "getNextPageParam" | "getPreviousPageParam"
> & {
  /** The next page's param, from the last page fetched, or `None` when it was the last. */
  readonly getNextPageParam: IOPageParamFunction<A, P>
  /** The previous page's param, from the first page fetched, or `None` when it was the first. */
  readonly getPreviousPageParam?: IOPageParamFunction<A, P>
  /** Override the derived `Error.message` on failure. */
  readonly formatError?: (error: E) => string
}

const toOption = <P>(param: StoredPageParam<P>): OptionType<P> => (param === null ? Option.none() : Option(param))

const toStored = <P>(param: OptionType<P>): StoredPageParam<P> => param.orNull()

const stored =
  <A, P>(f: IOPageParamFunction<A, P>) =>
  (
    page: A,
    allPages: ReadonlyArray<A>,
    pageParam: StoredPageParam<P>,
    allPageParams: ReadonlyArray<StoredPageParam<P>>,
  ): StoredPageParam<P> =>
    toStored(f(page, allPages, toOption(pageParam), allPageParams.map(toOption)))

/**
 * `useInfiniteQuery` for effects: each page is an `IO<never, E, A>`, and a failure on any page
 * reaches React Query's `error` as an {@link IOQueryError} whose `.error` is the typed `E`.
 *
 * The page param is an `Option`. The first page gets `None`, and `getNextPageParam` returns
 * `None` when there are no more pages, so a cursor needs no `null` sentinel:
 *
 * ```ts
 * const feed = useIOInfiniteQuery(
 *   ["feed", filter],
 *   ({ signal, pageParam }) => fetchFeed({ filter, cursor: pageParam.orUndefined() }, signal),
 *   { getNextPageParam: (last: FeedPage) => Option(last.nextCursor) },
 * )
 * ```
 *
 * **Annotate the page in `getNextPageParam`**, as above. TypeScript types the effect's
 * `pageParam` before it reads `getNextPageParam`, so it can only learn the param type from a
 * `getNextPageParam` that doesn't need the effect's result to type-check. Leave the annotation
 * out and TypeScript reports `Option<string>` not assignable to `Option<never>` on
 * `getNextPageParam`. Passing a named, typed function works too.
 *
 * `P` can't include `null` or `undefined`: React Query reads a `null` param as "no more pages",
 * and `None` already says so. React Query stores each param as itself, or `null` for the first
 * page, so `data.pageParams` is an array of `P | null`.
 *
 * Every other `useInfiniteQuery` option (`select`, `maxPages`, `placeholderData`, …) passes
 * through. Project the result with `toQueryState` to match it as an `AsyncState`; the hook
 * returns React Query's result unchanged, so `fetchNextPage` and `hasNextPage` stay on it.
 */
export function useIOInfiniteQuery<
  A,
  E,
  P extends NonNullable<unknown> = never,
  TData = InfiniteData<A, StoredPageParam<P>>,
  TQueryKey extends QueryKey = QueryKey,
>(
  queryKey: TQueryKey,
  io: (context: IOInfiniteQueryContext<P, TQueryKey>) => IO<never, E, A>,
  options: UseIOInfiniteQueryOptions<A, E, P, TData, TQueryKey>,
): UseInfiniteQueryResult<TData, IOQueryError<E>> {
  const { formatError, getNextPageParam, getPreviousPageParam, ...queryOptions } = options

  return useInfiniteQuery<A, IOQueryError<E>, TData, TQueryKey, StoredPageParam<P>>({
    ...queryOptions,
    queryKey,
    queryFn: ioQueryFn<E, A, QueryFunctionContext<TQueryKey, StoredPageParam<P>>>(
      (context) =>
        io({
          signal: context.signal,
          queryKey: context.queryKey,
          // React Query's context type for `pageParam` differs across v5 releases and a generic `P`
          // leaves it unresolved, so it's read structurally. The hook always sets `initialPageParam`.
          pageParam: toOption((context as { readonly pageParam: StoredPageParam<P> }).pageParam),
          meta: context.meta,
        }),
      { formatError },
    ),
    initialPageParam: null,
    getNextPageParam: stored(getNextPageParam),
    ...(getPreviousPageParam === undefined ? {} : { getPreviousPageParam: stored(getPreviousPageParam) }),
  })
}
