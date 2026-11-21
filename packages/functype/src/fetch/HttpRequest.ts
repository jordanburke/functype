import type { Decoder } from "@/decoder/Decoder"
import type { Encoder } from "@/decoder/Encoder"

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

export interface HttpRequestOptions<T = unknown, TReq = unknown> {
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
   * For a parser that throws (Zod's `.parse`, an inline check), wrap it in
   * `Decoder.fromThrowing(parse)`: a throw becomes a `DecoderError` leaf whose
   * `cause` is the thrown value.
   */
  readonly decode?: Decoder<T>
  /**
   * Whether to flatten functype ADTs in the request body to their primitive
   * projections (Option → nullable, Either → right-value-or-throw-on-Left,
   * List → array, Try → success-value-or-throw, Map → record) before serializing.
   * Default `true` — matches the wire shape external JSON APIs expect.
   *
   * Set to `false` to emit each ADT's canonical `{_tag, value}` form via
   * `toValue()` for functype-to-functype services where both ends round-trip
   * the tagged shape via `Decoder.tagged.*`.
   *
   * Ignored when `encode` is set.
   */
  readonly flatten?: boolean
  /**
   * Request-side encoder. When set, the body goes on the wire as `JSON.stringify(encode(body))`
   * with `Content-Type: application/json`, and `flatten` is ignored. Use it when `flatten` can't
   * express the wire shape: custom date formats, snake_case keys, stripping fields. A throw inside
   * `encode` fails the request with `HttpError.NetworkError`, like any body that can't be serialized.
   *
   * It applies to the body after `beforeRequest` runs, so a hook that swaps the body must keep it
   * a `TReq`.
   *
   * `TReq` is inferred from `encode`. If you pass the response type explicitly
   * (`Http.post<User>(…)`), pass the request type too (`Http.post<User, NewUser>(…)`):
   * TypeScript defaults the rest to `unknown`, and an `Encoder<NewUser>` won't fit `Encoder<unknown>`.
   */
  readonly encode?: Encoder<TReq>
}

export interface HttpMethodOptions<T = unknown, TReq = unknown> {
  readonly headers?: Record<string, string>
  readonly body?: unknown
  readonly signal?: AbortSignal
  readonly parseAs?: ParseMode
  /** Either-returning response decoder. See {@link HttpRequestOptions.decode}. */
  readonly decode?: Decoder<T>
  readonly flatten?: boolean
  /** Request-side encoder; overrides `flatten`. See {@link HttpRequestOptions.encode}. */
  readonly encode?: Encoder<TReq>
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
 * response decoder (`decode`) is intentionally not exposed here — it isn't
 * part of the wire request and applies to the response. The `flatten` flag IS exposed because it affects how `body`
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
