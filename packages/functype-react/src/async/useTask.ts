"use client"

import { createCancellationTokenSource, Task, type Throwable } from "functype"
import { useCallback, useEffect, useReducer, useRef } from "react"

import type { TaskState } from "./TaskState"

type Action<E, A> =
  | { readonly type: "PENDING" }
  | { readonly type: "SUCCESS"; readonly value: A }
  | { readonly type: "FAILURE"; readonly error: E }

function reducer<E, A>(_state: TaskState<E, A>, action: Action<E, A>): TaskState<E, A> {
  if (action.type === "PENDING") return { _tag: "Pending" }
  if (action.type === "SUCCESS") return { _tag: "Success", value: action.value }
  return { _tag: "Failure", error: action.error }
}

export type UseTaskResult<E, A> = TaskState<E, A> & {
  readonly isIdle: boolean
  readonly isPending: boolean
  readonly isSuccess: boolean
  readonly isFailure: boolean
  refetch: () => void
}

/**
 * Run an async operation tied to a React component's lifecycle.
 *
 * - Returns a discriminated `TaskState<Throwable, A>` plus boolean flags and
 *   a `refetch` trigger.
 * - The `task` callback receives an `AbortSignal` wired to a cancellation
 *   token that fires when the component unmounts or `deps` change. Pass the
 *   signal to `fetch` (or any abortable API) to cancel in-flight work.
 * - StrictMode-safe: the cleanup fn cancels the token and discards any
 *   late-arriving result.
 */
export function useTask<A>(
  task: (signal: AbortSignal) => Promise<A> | A,
  deps: ReadonlyArray<unknown>,
): UseTaskResult<Throwable, A> {
  const [state, dispatch] = useReducer(reducer<Throwable, A>, { _tag: "Idle" })
  const [refetchTick, forceRefetch] = useReducer((n: number) => n + 1, 0)
  const taskRef = useRef(task)
  taskRef.current = task

  useEffect(() => {
    const cancelled = { value: false }
    const tokenSource = createCancellationTokenSource()
    dispatch({ type: "PENDING" })

    void Task<A>()
      .Async<A>(() => taskRef.current(tokenSource.token.signal) as Promise<A>, undefined, undefined, tokenSource.token)
      .then((outcome) => {
        if (cancelled.value) return
        if (outcome.isOk()) {
          dispatch({ type: "SUCCESS", value: outcome.value as A })
        } else {
          dispatch({ type: "FAILURE", error: outcome.error as Throwable })
        }
      })

    return () => {
      cancelled.value = true
      tokenSource.cancel()
    }
  }, [...deps, refetchTick])

  const refetch = useCallback(() => forceRefetch(), [])

  return {
    ...state,
    isIdle: state._tag === "Idle",
    isPending: state._tag === "Pending",
    isSuccess: state._tag === "Success",
    isFailure: state._tag === "Failure",
    refetch,
  }
}
