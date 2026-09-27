"use client"

import { type DependencyList, useMemo, useRef } from "react"

import { type Eq, referenceEq } from "./eq"

/**
 * Like `useMemo`, but recomputes only when *some* dep has changed under the
 * supplied (or default) comparator. The `eqs` array is aligned positionally
 * with `deps`; missing entries fall back to `referenceEq`.
 */
export function useStableMemo<A>(
  factory: () => A,
  deps: DependencyList,
  // eslint-disable-next-line functype/prefer-option -- an `undefined` slot means "default equality for this dep"; replacing it with Eq.default is a 1.x-breaking API change, deferred to 2.0.
  eqs?: ReadonlyArray<Eq<unknown> | undefined>,
): A {
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

  return useMemo(factory, [tick.current])
}
