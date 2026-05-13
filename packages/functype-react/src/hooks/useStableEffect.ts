"use client"
/* eslint-disable functype/prefer-option, functype/prefer-fold -- React hooks must accept idiomatic optional params and use ref-init sentinels; wrapping in Option would change the public API shape consumers expect. */

import { type DependencyList, type EffectCallback, useEffect, useRef } from "react"

import { type Eq, referenceEq } from "./eq"

/**
 * Like `useEffect`, but re-runs only when *some* dep has changed under the
 * supplied (or default) comparator. The `eqs` array is aligned positionally
 * with `deps`; missing entries fall back to `referenceEq`.
 *
 * Useful when deps include functype ADTs (`Option`, `Either`, etc.) whose
 * structural identity is what matters, but whose references churn every render.
 */
export function useStableEffect(
  effect: EffectCallback,
  deps: DependencyList,
  eqs?: ReadonlyArray<Eq<unknown> | undefined>,
): void {
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

  useEffect(effect, [tick.current])
}
