"use client"

import type { Exit, IO } from "functype/io"
import { useMemo, useRef } from "react"

/**
 * Starts an `IO<never, E, A>` and returns a `Promise<Exit<E, A>>` that is stable across
 * renders with the same `deps`. Intended for React 19's `use()`: a new promise on each
 * render would suspend forever.
 *
 * `Exit` keeps a typed failure, a defect and an interruption apart, so a consumer can tell
 * them apart; `useIOValue` does that for you.
 *
 * The factory is read through a ref, so the latest closure runs even if it isn't in `deps`.
 * Put in `deps` whatever changes the result. The factory receives an `AbortSignal` for
 * `Http` / `IO.tryAsync`; `useMemo` has no cleanup, so nothing aborts it on unmount.
 */
export function useIOPromise<E, A>(
  io: (signal: AbortSignal) => IO<never, E, A>,
  deps: ReadonlyArray<unknown>,
): Promise<Exit<E, A>> {
  const ioRef = useRef(io)
  ioRef.current = io

  return useMemo(() => {
    const controller = new AbortController()
    return ioRef.current(controller.signal).runExit({ signal: controller.signal })
  }, deps)
}
