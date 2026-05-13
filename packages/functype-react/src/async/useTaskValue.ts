"use client"
/* eslint-disable functype/prefer-either -- the throw is the contract: React's `use()` semantics require errors to propagate to the nearest ErrorBoundary via throw, not via an Either return. */

import { use } from "react"

import { useTaskPromise } from "./useTaskPromise"

/**
 * Suspense-aware variant of `useTask` for React 19+. Suspends the component
 * while the task is pending and throws on failure — both behaviors integrate
 * with `<TaskBoundary>` (or a hand-rolled Suspense + ErrorBoundary pair).
 *
 * Invariants enforced by React 19:
 * 1. The promise must be stable across renders. `useTaskPromise` memoizes by
 *    `deps`, so passing the same deps yields the same promise.
 * 2. An ErrorBoundary must wrap the Suspense, never the reverse — otherwise
 *    Suspense will catch the thrown error instead of the boundary.
 * 3. Do not call this on the server. Pass the underlying `Task` (or its
 *    promise) into a Client Component and call `useTaskValue` there.
 *
 * Testing note: React 19's `use()` does not unsuspend reliably under jsdom +
 * @testing-library/react. End-to-end tests of `useTaskValue` + `<TaskBoundary>`
 * require a real browser scheduler (Playwright); unit tests of `useTask` and
 * `useTaskPromise` cover the Task plumbing.
 */
export function useTaskValue<A>(task: (signal: AbortSignal) => Promise<A> | A, deps: ReadonlyArray<unknown>): A {
  const outcome = use(useTaskPromise(task, deps))
  if (outcome.isErr()) {
    throw outcome.error
  }
  return outcome.value as A
}
