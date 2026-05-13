"use client"
/* eslint-disable functype/prefer-option, functype/prefer-fold -- React hooks must accept idiomatic optional params and use ref-init sentinels; wrapping in Option would change the public API shape consumers expect. */

import { type DependencyList, useCallback, useRef } from "react"

import { type Eq, referenceEq } from "./eq"

/**
 * Like `useCallback`, but only returns a new function when *some* dep has
 * changed under the supplied (or default) comparator.
 */
export function useStableCallback<F extends (...args: never[]) => unknown>(
  callback: F,
  deps: DependencyList,
  eqs?: ReadonlyArray<Eq<unknown> | undefined>,
): F {
  const prev = useRef<DependencyList | null>(null)
  const tick = useRef(0)

  if (prev.current === null) {
    prev.current = deps
    tick.current += 1
  } else {
    const stale = prev.current
    const changed = deps.some((d, i) => {
      const cmp = eqs?.[i] ?? referenceEq
      return !cmp(stale[i], d)
    })
    if (changed) {
      prev.current = deps
      tick.current += 1
    }
  }

  return useCallback(callback, [tick.current]) as F
}
