"use client"

import { Try, type Try as TryT } from "functype/try"
import { useCallback, useMemo, useState } from "react"

/**
 * Stateful Try container. Defaults to Failure(new Error("uninitialized")) when no initial.
 */
export function useTry<A>(initial?: TryT<A>): {
  readonly value: TryT<A>
  setSuccess: (a: A) => void
  setFailure: (e: Error) => void
  fold: <R>(onFailure: (e: Error) => R, onSuccess: (a: A) => R) => R
} {
  const [value, setValue] = useState<TryT<A>>(() => initial ?? Try.failure<A>(new Error("uninitialized")))

  const setSuccess = useCallback((a: A) => setValue(Try.success(a)), [])
  const setFailure = useCallback((e: Error) => setValue(Try.failure<A>(e)), [])

  const fold = useCallback(
    <R>(onFailure: (e: Error) => R, onSuccess: (a: A) => R) => value.fold(onFailure, onSuccess),
    [value],
  )

  return useMemo(() => ({ value, setSuccess, setFailure, fold }), [value, setSuccess, setFailure, fold])
}
