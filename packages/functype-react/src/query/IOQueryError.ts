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
import { Try } from "functype"

/** Structural view of a tagged functype error (e.g. any `HttpError` variant). */
type TaggedError = {
  readonly _tag: string
  readonly url?: unknown
  readonly status?: unknown
  readonly statusText?: unknown
  readonly message?: unknown
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

    // A tagged error carrying its own `message` is the normal shape for a domain error
    // in the `IO` channel, and that message is what the author wrote for a human to
    // read. Falling back to the bare tag was the one case where information already
    // present got discarded — a raw `Error` gets `.message`, an untagged object gets
    // JSON, but a tagged one got neither. None of functype's own `HttpError` variants
    // carry a `message`, so the HTTP renderings above are unaffected.
    if (typeof error.message === "string" && error.message.length > 0) {
      return error.message
    }

    return `${error._tag}${where}`
  }

  // `String({})` is "[object Object]", which tells a reader nothing. Prefer a JSON
  // rendering for plain objects, falling back to String() for cycles and symbols.
  if (typeof error === "object" && error !== null) {
    return Try(() => JSON.stringify(error)).orElse(String(error))
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
  /**
   * The raw functype error channel value — discriminable via its own `_tag`.
   *
   * When {@link defect} is `true` this is **not** an `E`. Check `defect` before
   * matching on `_tag`.
   */
  readonly error: E

  /**
   * `true` when {@link error} is *not* a value from the effect's typed error channel.
   * Three things set it:
   *
   * - the effect factory threw before an `IO` was ever produced
   * - the effect produced a defect (`Exit.Die`) — a throwing `IO.sync` thunk, a
   *   throwing `map` / `flatMap` / `mapError` callback, or `IO.die`
   * - the effect was interrupted, so `error` is an `InterruptedError`
   *
   * Kept as an explicit flag rather than widening `E` to `unknown`, which would force
   * every consumer to handle a case that should never occur.
   *
   * `defect: false` genuinely means `error` is an `E`. Before 1.8.0 it did not: a
   * defect reached the adapter as an ordinary `Left` and was indistinguishable from a
   * typed failure, so the documented guard didn't guard anything (#259).
   */
  readonly defect: boolean

  constructor(error: E, message?: string, defect = false) {
    super(message ?? formatIOError(error), { cause: error })
    this.name = "IOQueryError"
    this.error = error
    this.defect = defect
  }
}

/** Runtime guard for {@link IOQueryError}. */
export const isIOQueryError = <E = unknown>(error: unknown): error is IOQueryError<E> => error instanceof IOQueryError
