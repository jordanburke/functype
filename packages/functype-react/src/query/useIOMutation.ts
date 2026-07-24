"use client"

import type { UseMutationOptions, UseMutationResult } from "@tanstack/react-query"
import { useMutation } from "@tanstack/react-query"
import type { IO } from "functype/io"

import type { IOQueryError } from "./IOQueryError"
import { ioMutationFn } from "./ioQueryFn"

export type UseIOMutationOptions<A, E, V, TContext> = Omit<
  UseMutationOptions<A, IOQueryError<E>, V, TContext>,
  "mutationFn"
> & {
  /** Override the derived `Error.message` on failure. */
  readonly formatError?: (error: E) => string
}

/**
 * `useMutation` for effects — runs an `IO<never, E, A>` per invocation and threads its
 * typed error channel through to React Query.
 *
 * ```ts
 * const create = useIOMutation((body: CreateTokenInput) => Http.post<Token>(url, { headers, body }), {
 *   onError: (e) => toast(e.message, { detail: e.error._tag }),
 * })
 *
 * create.mutate({ name: "ci" })
 * ```
 *
 * React Query does not supply an `AbortSignal` to mutations, so the callback receives
 * only the mutation variables.
 */
export function useIOMutation<A, E, V = void, TContext = unknown>(
  io: (variables: V) => IO<never, E, A>,
  options?: UseIOMutationOptions<A, E, V, TContext>,
): UseMutationResult<A, IOQueryError<E>, V, TContext> {
  const { formatError, ...mutationOptions } = options ?? {}

  return useMutation<A, IOQueryError<E>, V, TContext>({
    ...mutationOptions,
    mutationFn: ioMutationFn<E, A, V>(io, { formatError }),
  })
}
