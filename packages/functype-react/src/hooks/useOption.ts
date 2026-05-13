"use client"
/* eslint-disable functype/prefer-option -- this hook's job is to convert nullable JS values into Option, so its inputs must be nullable. */

import { Option, type Option as OptionT } from "functype/option"
import { useCallback, useMemo, useState } from "react"

/**
 * Stateful Option container. `set(null | undefined)` clears to None.
 */
export function useOption<A>(initial?: A): {
  readonly value: OptionT<A>
  set: (a: A | null | undefined) => void
  clear: () => void
  map: <B>(f: (a: A) => B) => OptionT<B>
  fold: <R>(onNone: () => R, onSome: (a: A) => R) => R
} {
  const [value, setValue] = useState<OptionT<A>>(() => Option<A>(initial))

  const set = useCallback((a: A | null | undefined) => setValue(Option<A>(a)), [])
  const clear = useCallback(() => setValue(Option.none<A>()), [])

  const map = useCallback(<B>(f: (a: A) => B) => value.map(f), [value])
  const fold = useCallback(<R>(onNone: () => R, onSome: (a: A) => R) => value.fold(onNone, onSome), [value])

  return useMemo(() => ({ value, set, clear, map, fold }), [value, set, clear, map, fold])
}
