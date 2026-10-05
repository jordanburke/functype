"use client"

import { InterruptedError, type IO } from "functype/io"
import { use } from "react"

import { useIOPromise } from "./useIOPromise"

/**
 * Suspense-aware variant of `useIO` for React 19+. Suspends while the effect is pending and
 * returns its value. On failure it throws the typed error; on a defect, the defect; on an
 * interruption, an `InterruptedError`. All three reach `<AsyncBoundary>` (or a hand-rolled
 * Suspense + ErrorBoundary pair).
 *
 * Invariants enforced by React 19:
 * 1. The promise must be stable across renders. `useIOPromise` memoizes by `deps`, so
 *    passing the same deps yields the same promise.
 * 2. An ErrorBoundary must wrap the Suspense, never the reverse — otherwise Suspense will
 *    catch the thrown error instead of the boundary.
 * 3. Do not call this on the server. Build the `IO` in a Client Component and call
 *    `useIOValue` there.
 *
 * @interop React's `use()` reaches the nearest ErrorBoundary only through a throw, not an Either return.
 *
 * Testing note: React 19's `use()` does not unsuspend reliably under jsdom +
 * @testing-library/react. End-to-end tests of `useIOValue` + `<AsyncBoundary>` require a
 * real browser scheduler (Playwright); unit tests of `useIO` and `useIOPromise` cover the
 * plumbing.
 */
export function useIOValue<E, A>(io: (signal: AbortSignal) => IO<never, E, A>, deps: ReadonlyArray<unknown>): A {
  const exit = use(useIOPromise(io, deps))
  if (exit.isSuccess()) return exit.orThrow()
  if (exit.isFailure()) throw exit.toValue().error
  if (exit.isDie()) throw exit.toValue().defect
  throw new InterruptedError()
}
