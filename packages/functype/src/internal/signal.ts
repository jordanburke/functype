/**
 * A signal that aborts when any of `signals` aborts, plus `dispose` to detach it from them.
 *
 * Portable stand-in for `AbortSignal.any`, which older runtimes lack. Call `dispose` once the
 * combined signal is no longer needed, so a long-lived parent doesn't collect a listener per child.
 */
export const anySignal = (
  signals: ReadonlyArray<AbortSignal | undefined>,
): { readonly signal: AbortSignal; readonly dispose: () => void } => {
  const controller = new AbortController()
  const parents = signals.filter((s): s is AbortSignal => s !== undefined)
  const aborted = parents.find((s) => s.aborted)
  if (aborted) {
    controller.abort(aborted.reason)
    return { signal: controller.signal, dispose: () => {} }
  }
  const listeners = parents.map((parent) => {
    const onAbort = (): void => controller.abort(parent.reason)
    parent.addEventListener("abort", onAbort, { once: true })
    return () => parent.removeEventListener("abort", onAbort)
  })
  return { signal: controller.signal, dispose: () => listeners.forEach((remove) => remove()) }
}
