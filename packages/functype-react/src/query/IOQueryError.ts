/**
 * Error boxing for the React Query bridge.
 *
 * `IO`'s own terminals don't fit React Query's contract: `.run()` returns
 * `Promise<Either<E, A>>` and never throws (so RQ never sees a failure), while
 * `.runOrThrow()` throws the *raw* tagged error object — `{ _tag: "NetworkError", ... }`
 * is not an `Error` instance, so the ubiquitous
 * `error instanceof Error ? error.message : fallback` handler silently degrades.
 *
 * `IOQueryError` boxes the typed error so both worlds work: `instanceof Error` and
 * `.message` behave as any React Query consumer expects, while `.error` preserves the
 * fully discriminable functype `E`.
 */

/** Structural view of a tagged functype error (e.g. any `HttpError` variant). */
type TaggedError = {
  readonly _tag: string
  readonly url?: unknown
  readonly status?: unknown
  readonly statusText?: unknown
}

const isTaggedError = (e: unknown): e is TaggedError =>
  typeof e === "object" && e !== null && "_tag" in e && typeof (e as { _tag: unknown })._tag === "string"

/**
 * Derives a human-readable message from an arbitrary error channel value.
 *
 * Deliberately *structural* — this module does not import `functype/fetch`, so the
 * query bridge stays generic over any `IO<never, E, A>` rather than being HTTP-specific.
 * An `HttpStatusError` is recognized by its shape, not its type.
 *
 * Pass `formatError` to any of the query entry points to override this entirely.
 */
export const formatIOError = (error: unknown): string => {
  if (error instanceof Error) {
    return error.message
  }

  if (isTaggedError(error)) {
    const where = typeof error.url === "string" ? ` — ${error.url}` : ""

    if (typeof error.status === "number") {
      const statusText =
        typeof error.statusText === "string" && error.statusText.length > 0 ? ` ${error.statusText}` : ""
      return `HTTP ${error.status}${statusText}${where}`
    }

    return `${error._tag}${where}`
  }

  return String(error)
}

/**
 * An `Error` subclass carrying the typed functype error channel.
 *
 * ```ts
 * const { error } = useIOQuery(["limits", userId], ({ signal }) => Http.get(url, { signal }))
 *
 * error instanceof Error // true
 * error.message          // "HTTP 403 Forbidden — /api/limits"
 *
 * HttpErrors.match(error.error, {
 *   NetworkError: (e) => retryBanner(e),
 *   HttpStatusError: (e) => (e.status === 403 ? upgradePrompt() : genericFailure(e)),
 *   DecodeError: (e) => reportSchemaDrift(e),
 * })
 * ```
 */
export class IOQueryError<E> extends Error {
  /** The raw functype error channel value — discriminable via its own `_tag`. */
  readonly error: E

  constructor(error: E, message?: string) {
    super(message ?? formatIOError(error), { cause: error })
    this.name = "IOQueryError"
    this.error = error
  }
}

/** Runtime guard for {@link IOQueryError}. */
export const isIOQueryError = <E = unknown>(error: unknown): error is IOQueryError<E> => error instanceof IOQueryError
