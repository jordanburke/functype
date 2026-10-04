/**
 * Bounded-concurrency traversal shared by the async collection methods and `Either.traverseAsync`.
 */

/**
 * How many calls may run at once: a positive integer, or `"unbounded"` to start them all together.
 * `1` runs them one after another, in input order.
 */
export type Concurrency = number | "unbounded"

export type ConcurrencyOptions = {
  readonly concurrency?: Concurrency
}

const workerCount = (concurrency: Concurrency, itemCount: number): number => {
  if (concurrency === "unbounded") return itemCount
  if (!Number.isInteger(concurrency) || concurrency < 1) {
    throw new RangeError(`concurrency must be a positive integer or "unbounded", got ${String(concurrency)}`)
  }
  return Math.min(concurrency, itemCount)
}

/**
 * Runs `f` over `items` with at most `concurrency` calls in flight and returns the results in input order.
 *
 * Once `stop(result)` holds, or a call rejects, no further calls start. Calls already running finish.
 * Items that never started are left out of the result. A rejection rejects the returned promise.
 */
export const traverseWithConcurrency = async <A, B>(
  items: Iterable<A>,
  f: (a: A) => PromiseLike<B>,
  concurrency: Concurrency,
  stop: (b: B) => boolean = () => false,
): Promise<B[]> => {
  const input = Array.from(items)
  const results: { value: B }[] = []
  const state = { next: 0, stopped: false }

  const worker = async (): Promise<void> => {
    if (state.stopped || state.next >= input.length) return
    const index = state.next
    state.next = index + 1
    try {
      const value = await f(input[index] as A)
      results[index] = { value }
      if (stop(value)) state.stopped = true
    } catch (error) {
      state.stopped = true
      throw error
    }
    return worker()
  }

  await Promise.all(Array.from({ length: workerCount(concurrency, input.length) }, worker))
  // `results` is sparse when a stop skipped items; flatMap skips the holes and returns a dense array.
  return results.flatMap((slot) => [slot.value])
}
