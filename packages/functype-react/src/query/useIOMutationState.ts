"use client"

import type { UseMutationResult } from "@tanstack/react-query"
import type { IO } from "functype/io"

import type { TaskState } from "../async/TaskState"
import type { IOQueryError } from "./IOQueryError"
import { toMutationState } from "./queryState"
import type { UseIOMutationOptions } from "./useIOMutation"
import { useIOMutation } from "./useIOMutation"

/**
 * `TaskState` plus the flags and the trigger functions. Unlike a query, a mutation is
 * useless without its trigger, so `mutate` / `mutateAsync` / `reset` are carried
 * through with React Query's own signatures.
 */
export type UseIOMutationStateResult<A, E, V, TContext> = TaskState<IOQueryError<E>, A> &
  Pick<UseMutationResult<A, IOQueryError<E>, V, TContext>, "mutate" | "mutateAsync" | "reset"> & {
    readonly isIdle: boolean
    readonly isPending: boolean
    readonly isSuccess: boolean
    readonly isFailure: boolean
  }

/**
 * `useIOMutation` projected onto the `TaskState` ADT, so a mutation's lifecycle matches
 * exhaustively like a query's. React Query's own `idle` status maps directly onto `Idle`.
 *
 * ```tsx
 * const create = useIOMutationState((body: CreateTokenInput) => Http.post<Token>(url, { body }))
 *
 * <button onClick={() => create.mutate({ name: "ci" })} disabled={create.isPending}>create</button>
 *
 * <Match value={create}>
 *   {{
 *     Idle: () => null,
 *     Pending: () => <Spinner />,
 *     Failure: ({ error }) => <Err e={error.error} />,
 *     Success: ({ value }) => <TokenRow token={value} />,
 *   }}
 * </Match>
 * ```
 */
export function useIOMutationState<A, E, V = void, TContext = unknown>(
  io: (variables: V) => IO<never, E, A>,
  options?: UseIOMutationOptions<A, E, V, TContext>,
): UseIOMutationStateResult<A, E, V, TContext> {
  const mutation = useIOMutation(io, options)
  const state = toMutationState(mutation)

  return {
    ...state,
    isIdle: state._tag === "Idle",
    isPending: state._tag === "Pending",
    isSuccess: state._tag === "Success",
    isFailure: state._tag === "Failure",
    mutate: mutation.mutate,
    mutateAsync: mutation.mutateAsync,
    reset: mutation.reset,
  }
}
