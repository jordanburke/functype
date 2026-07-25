/* eslint-disable functype/prefer-either -- This module IS the Either→rejection bridge.
 * React Query signals failure exclusively by promise rejection: `isError`, `onError`,
 * and retry all key off a rejected queryFn. Returning an `Either` here would be
 * indistinguishable from success to React Query — the very bug (see #239) that makes
 * `.run()` unusable as a `queryFn`. The throw is the contract, and it is confined to
 * `runBoxed` so no caller ever has to write it. Scoped to the file rather than to each
 * `throw` because the rule also fires on the enclosing function: three scattered
 * suppressions would read as incidental exceptions rather than one deliberate design. */
import { Try } from "functype"
import type { IO } from "functype/io"

import { IOQueryError } from "./IOQueryError"

/**
 * Minimal structural view of React Query's `QueryFunctionContext` — the floor that
 * every context satisfies, and the default when nothing wider is inferred.
 *
 * Typed structurally on purpose, so these primitives carry **no**
 * `@tanstack/react-query` type dependency. `ioQueryFn` is generic over the context, so
 * a richer one flows through unchanged: annotate the callback parameter (e.g. with
 * `QueryFunctionContext<QueryKey, number>` for an infinite query) and `pageParam`,
 * `queryKey`, and `meta` are all readable inside the effect factory.
 */
export type IOQueryFnContext = {
  readonly signal: AbortSignal
}

export type IOBridgeOptions<E> = {
  /** Override the derived `Error.message`. Defaults to a structural formatter. */
  readonly formatError?: (error: E) => string
}

/**
 * Runs an effect and returns its value, or throws a boxed {@link IOQueryError}.
 *
 * Two failure paths converge here:
 * - the effect's typed error channel (`Left`) → boxed with `defect: false`
 * - the factory throwing before an `IO` exists → boxed with `defect: true`
 *
 * The second matters because `.run()` itself never throws (defects raised *inside*
 * the effect are folded into `Left` by the interpreter), but `io(input)` is ordinary
 * user code that can throw while building the effect. Without this, that throw would
 * escape unboxed and `error.error` would be `undefined` despite the declared type.
 */
const runBoxed = async <E, A>(effect: () => IO<never, E, A>, options?: IOBridgeOptions<E>): Promise<A> => {
  const result = await Try(() => effect()).fold(
    (thrown) => {
      throw new IOQueryError(thrown as E, undefined, true)
    },
    (io) => io.run(),
  )

  if (result.isLeft()) {
    throw new IOQueryError(result.value, options?.formatError?.(result.value))
  }

  return result.value
}

/**
 * Adapts an `IO<never, E, A>` into a React Query `queryFn`.
 *
 * `Right` resolves with the value; `Left` rejects with an {@link IOQueryError} that
 * carries the typed error on `.error`. Wire cancellation by closing over the supplied
 * `signal`:
 *
 * ```ts
 * useQuery({
 *   queryKey: ["connector-limits", userId],
 *   queryFn: ioQueryFn(({ signal }) => Http.get<Limits>(url, { headers, signal })),
 *   enabled: !!userId,
 * })
 * ```
 */
export const ioQueryFn =
  <E, A, TContext extends IOQueryFnContext = IOQueryFnContext>(
    io: (context: TContext) => IO<never, E, A>,
    options?: IOBridgeOptions<E>,
  ) =>
  (context: TContext): Promise<A> =>
    runBoxed(() => io(context), options)

/**
 * Adapts a variables-taking `IO<never, E, A>` into a React Query `mutationFn`.
 *
 * React Query does not supply an `AbortSignal` to mutations, so the callback receives
 * only the mutation variables.
 *
 * ```ts
 * useMutation({
 *   mutationFn: ioMutationFn((body: CreateTokenInput) => Http.post<Token>(url, { body })),
 * })
 * ```
 */
export const ioMutationFn =
  <E, A, V = void>(io: (variables: V) => IO<never, E, A>, options?: IOBridgeOptions<E>) =>
  (variables: V): Promise<A> =>
    runBoxed(() => io(variables), options)
