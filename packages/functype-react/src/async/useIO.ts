"use client"

import { Try } from "functype"
import type { Exit, IO } from "functype/io"
import { useCallback, useEffect, useReducer, useRef, useState } from "react"

import type { AsyncState } from "./AsyncState"

type Action<E, A> =
  | { readonly type: "PENDING" }
  | { readonly type: "SUCCESS"; readonly value: A }
  | { readonly type: "FAILURE"; readonly error: E }

function reducer<E, A>(_state: AsyncState<E, A>, action: Action<E, A>): AsyncState<E, A> {
  if (action.type === "PENDING") return { _tag: "Pending" }
  if (action.type === "SUCCESS") return { _tag: "Success", value: action.value }
  return { _tag: "Failure", error: action.error }
}

export type UseIOResult<E, A> = AsyncState<E, A> & {
  readonly isIdle: boolean
  readonly isPending: boolean
  readonly isSuccess: boolean
  readonly isFailure: boolean
  refetch: () => void
}

/**
 * Runs an `IO<never, E, A>` tied to a component's lifecycle and returns its `AsyncState`,
 * plus boolean flags and a `refetch` trigger.
 *
 * - The factory receives an `AbortSignal` that aborts on unmount or when `deps` change.
 *   The effect is cancelled with it: no further step runs once it fires. Also pass it to
 *   `Http` / `IO.tryAsync` so an in-flight request aborts too.
 * - A cancelled run's result is discarded, so it never shows up as `Failure`.
 * - A typed failure becomes `Failure` with the effect's `E`.
 * - A defect (a bug: a throw inside the effect, or the factory throwing while building it)
 *   is rethrown during render, so the nearest error boundary catches it, the way a bug in
 *   any other component would surface.
 * - StrictMode-safe: the cleanup aborts the signal and discards any late result.
 *
 * @interop React reaches an error boundary only through a throw during render, so a defect is rethrown there.
 */
export function useIO<E, A>(
  io: (signal: AbortSignal) => IO<never, E, A>,
  deps: ReadonlyArray<unknown>,
): UseIOResult<E, A> {
  const [state, dispatch] = useReducer(reducer<E, A>, { _tag: "Idle" })
  const [defect, setDefect] = useState<{ readonly value: unknown } | undefined>(undefined)
  const [refetchTick, forceRefetch] = useReducer((n: number) => n + 1, 0)
  const ioRef = useRef(io)
  ioRef.current = io

  useEffect(() => {
    const controller = new AbortController()
    dispatch({ type: "PENDING" })

    const settle = (exit: Exit<E, A>): void => {
      if (controller.signal.aborted) return
      exit.fold(
        (error) => dispatch({ type: "FAILURE", error }),
        (value) => dispatch({ type: "SUCCESS", value }),
        // Interrupted without an abort means the effect interrupted itself (IO.interrupt()):
        // there is no value and no E, so it is reported like a defect.
        () => setDefect({ value: new Error("useIO: the effect interrupted itself") }),
        (defect) => setDefect({ value: defect }),
      )
    }

    // The factory is user code and can throw while building the effect; that's a defect too.
    Try(() => ioRef.current(controller.signal)).fold(
      (thrown) => setDefect({ value: thrown }),
      (effect) => void effect.runExit({ signal: controller.signal }).then(settle),
    )

    return () => controller.abort()
  }, [...deps, refetchTick])

  const refetch = useCallback(() => forceRefetch(), [])

  if (defect) throw defect.value

  return {
    ...state,
    isIdle: state._tag === "Idle",
    isPending: state._tag === "Pending",
    isSuccess: state._tag === "Success",
    isFailure: state._tag === "Failure",
    refetch,
  }
}
