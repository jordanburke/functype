"use client"

import { createCancellationTokenSource, Task, type TaskOutcome } from "functype"
import { useMemo, useRef } from "react"

/**
 * Returns a `Promise<TaskOutcome<A>>` that is stable across renders with the
 * same `deps`. Intended for consumers of React 19's `use()` hook — providing
 * a new promise reference on each render would infinite-suspend.
 *
 * The `task` callback is read through a ref, so the latest closure is invoked
 * even if it isn't included in `deps`. Encode in `deps` whatever semantically
 * changes the task's result.
 */
export function useTaskPromise<A>(
  task: (signal: AbortSignal) => Promise<A> | A,
  deps: ReadonlyArray<unknown>,
): Promise<TaskOutcome<A>> {
  const taskRef = useRef(task)
  taskRef.current = task

  return useMemo(() => {
    const tokenSource = createCancellationTokenSource()
    return Task<A>().Async<A>(
      () => taskRef.current(tokenSource.token.signal) as Promise<A>,
      undefined,
      undefined,
      tokenSource.token,
    )
  }, deps)
}
