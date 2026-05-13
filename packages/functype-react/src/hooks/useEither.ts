"use client"

import { type Either, Left, Right } from "functype/either"
import { useCallback, useMemo, useState } from "react"

/**
 * Stateful Either container. Defaults to Left(undefined) when no initial.
 */
export function useEither<E, A>(
  initial?: Either<E, A>,
): {
  readonly value: Either<E, A>
  setRight: (a: A) => void
  setLeft: (e: E) => void
  fold: <R>(onLeft: (e: E) => R, onRight: (a: A) => R) => R
} {
  const [value, setValue] = useState<Either<E, A>>(() => initial ?? Left<E, A>(undefined as unknown as E))

  const setRight = useCallback((a: A) => setValue(Right<E, A>(a)), [])
  const setLeft = useCallback((e: E) => setValue(Left<E, A>(e)), [])

  const fold = useCallback(<R>(onLeft: (e: E) => R, onRight: (a: A) => R) => value.fold(onLeft, onRight), [value])

  return useMemo(() => ({ value, setRight, setLeft, fold }), [value, setRight, setLeft, fold])
}
