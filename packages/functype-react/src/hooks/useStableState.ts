"use client"

import { useCallback, useRef, useState } from "react"

import { type Eq, referenceEq } from "./eq"

/**
 * Drop-in replacement for `useState` that no-ops when the next value is equal
 * to the current under `eq`. Defaults to `Object.is` (React's built-in), so the
 * behavior is identical to `useState` unless an `eq` is supplied.
 *
 * @param initial - Initial value or a lazy producer (called once)
 * @param eq - Comparator used to decide whether to skip the update
 */
export function useStableState<A>(
  initial: A | (() => A),
  eq: Eq<A> = referenceEq as Eq<A>,
): readonly [A, (next: A | ((prev: A) => A)) => void] {
  const [value, setValue] = useState<A>(initial)
  const ref = useRef<A>(value)
  ref.current = value

  const setStable = useCallback(
    (next: A | ((prev: A) => A)) => {
      const resolved = typeof next === "function" ? (next as (prev: A) => A)(ref.current) : next
      if (!eq(ref.current, resolved)) {
        setValue(resolved)
      }
    },
    [eq],
  )

  return [value, setStable] as const
}
