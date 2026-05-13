"use client"

import { List, type List as ListT } from "functype/list"
import { useCallback, useMemo, useState } from "react"

/**
 * Stateful immutable List container. All mutators return new state.
 */
export function useList<A>(initial?: readonly A[]): {
  readonly value: ListT<A>
  add: (a: A) => void
  remove: (a: A) => void
  removeAt: (index: number) => void
  clear: () => void
  map: <B>(f: (a: A) => B) => ListT<B>
  filter: (p: (a: A) => boolean) => ListT<A>
} {
  const [value, setValue] = useState<ListT<A>>(() => List<A>(initial ?? []))

  const add = useCallback((a: A) => setValue((prev) => prev.add(a) as ListT<A>), [])
  const remove = useCallback((a: A) => setValue((prev) => prev.remove(a)), [])
  const removeAt = useCallback((index: number) => setValue((prev) => prev.removeAt(index)), [])
  const clear = useCallback(() => setValue(List.empty<A>()), [])

  const map = useCallback(<B>(f: (a: A) => B) => value.map(f), [value])
  const filter = useCallback((p: (a: A) => boolean) => value.filter(p), [value])

  return useMemo(
    () => ({ value, add, remove, removeAt, clear, map, filter }),
    [value, add, remove, removeAt, clear, map, filter],
  )
}
