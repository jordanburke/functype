/**
 * `functype-react/query` — TanStack Query adapters for `IO`.
 *
 * Bridges `IO<never, E, A>` (e.g. the `Http` client from `functype/fetch`) onto React
 * Query's resolve/reject contract, preserving the typed error channel that both
 * `.run()` (never throws) and `.runOrThrow()` (throws a non-`Error` tagged object) lose.
 *
 * Requires `@tanstack/react-query` — an *optional* peer dependency, so consumers who
 * don't import this subpath neither install it nor bundle it.
 *
 * - `ioQueryFn` / `ioMutationFn` — framework-agnostic primitives; drop into any
 *   `useQuery` / `useSuspenseQuery` / `prefetchQuery` call for full option control.
 * - `useIOQuery` / `useIOMutation` — the common path, one call.
 * - `toQueryState` / `toMutationState` — project a React Query result onto the
 *   `TaskState` ADT so it can be matched exhaustively with the `<Match>` family,
 *   rather than read through `data && !error && !isLoading` flag soup.
 */
export { formatIOError, IOQueryError, isIOQueryError } from "./IOQueryError"
export type { IOBridgeOptions, IOQueryFnContext } from "./ioQueryFn"
export { ioMutationFn, ioQueryFn } from "./ioQueryFn"
export type { MutationResultView, QueryResultView } from "./queryState"
export { toMutationState, toQueryState } from "./queryState"
export type { UseIOMutationOptions } from "./useIOMutation"
export { useIOMutation } from "./useIOMutation"
export type { UseIOMutationStateResult } from "./useIOMutationState"
export { useIOMutationState } from "./useIOMutationState"
export type { UseIOQueryOptions } from "./useIOQuery"
export { useIOQuery } from "./useIOQuery"
export type { UseIOQueryStateResult } from "./useIOQueryState"
export { useIOQueryState } from "./useIOQueryState"
