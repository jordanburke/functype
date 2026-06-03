import type { Decoder } from "@/decoder/Decoder"

import type { HttpMethod } from "./HttpError"

export type ParseMode = "json" | "text" | "blob" | "arrayBuffer" | "raw"

/**
 * Typed query-parameter record. Scalar values (string | number | boolean) are
 * `String()`-coerced; arrays repeat the key (`{ tag: ["a", "b"] }` → `tag=a&tag=b`);
 * `undefined` and `null` values are dropped (so callers can write
 * `{ foo: maybe.toNullable() }` without conditionals); special characters are
 * percent-encoded via `URLSearchParams`.
 *
 * Nested objects are not supported (the type prevents them at compile time).
 */
export type HttpQueryParams = Readonly<
  Record<string, string | number | boolean | readonly (string | number | boolean)[] | undefined | null>
>

export interface HttpRequestOptions<T = unknown> {
  readonly url: string
  readonly method: HttpMethod
  readonly headers?: Record<string, string>
  readonly body?: unknown
  readonly signal?: AbortSignal
  readonly parseAs?: ParseMode
  /**
   * Query-string parameters appended to the URL. Merges with any query string
   * already present in `url`. See {@link HttpQueryParams} for encoding rules.
   */
  readonly params?: HttpQueryParams
  /**
   * Either-returning response decoder. Returns `Left(DecoderError)` on
   * failure; the framework maps that to `HttpError.DecodeError(cause: DecoderError)`.
   * The recursive `DecoderError` tree preserves structural failure info
   * (paths, child errors) for diagnosis and rendering.
   *
   * For adapters whose primary API throws (e.g. Zod's `.parse`), use an
   * adapter package (e.g. `functype-zod`'s `Decoder.fromZod(schema)`) or
   * wrap the throwing function in a tiny custom decoder. The deprecated
   * `validate` field is also still accepted for back-compat.
   */
  readonly decode?: Decoder<T>
  /**
   * @deprecated Use `decode` (Either-returning). For throw-pattern adapters
   *   like Zod's `.parse`, prefer an adapter package (`functype-zod`'s
   *   `Decoder.fromZod`). `validate` is kept for back-compat with the 1.0.x
   *   API and will be removed in a future major release. Throwing maps to
   *   `HttpError.DecodeError(cause: Error)`.
   */
  readonly validate?: (data: unknown) => T
  /**
   * Whether to flatten functype ADTs in the request body to their primitive
   * projections (Option → nullable, Either → right-value-or-throw-on-Left,
   * List → array, Try → success-value-or-throw, Map → record) before serializing.
   * Default `true` — matches the wire shape external JSON APIs expect.
   *
   * Set to `false` to emit each ADT's canonical `{_tag, value}` form via
   * `toValue()` for functype-to-functype services where both ends round-trip
   * the tagged shape via `Decoder.tagged.*`.
   */
  readonly flatten?: boolean
}

export interface HttpMethodOptions<T = unknown> {
  readonly headers?: Record<string, string>
  readonly body?: unknown
  readonly signal?: AbortSignal
  readonly parseAs?: ParseMode
  readonly decode?: Decoder<T>
  /** @deprecated Use `decode` (Either-returning) or an adapter package for throw-pattern validators. */
  readonly validate?: (data: unknown) => T
  readonly flatten?: boolean
  /**
   * Query-string parameters appended to the URL. See {@link HttpQueryParams}.
   */
  readonly params?: HttpQueryParams
}

export interface HttpResponse<T> {
  readonly data: T
  readonly status: number
  readonly statusText: string
  readonly headers: Headers
}

/**
 * The assembled, pre-wire view of a request that `HttpClientConfig.beforeRequest`
 * receives and may return a transformed copy of. URL is resolved against
 * `baseUrl`; headers reflect the `defaultHeaders` + per-call merge. The
 * response-side decoders (`decode` / `validate`) are intentionally not
 * exposed here — they aren't part of the wire request and apply to the
 * response. The `flatten` flag IS exposed because it affects how `body`
 * is serialized.
 */
export interface HttpRequestView {
  readonly url: string
  readonly method: HttpMethod
  readonly headers?: Record<string, string>
  readonly body?: unknown
  readonly signal?: AbortSignal
  readonly parseAs?: ParseMode
  readonly flatten?: boolean
}
