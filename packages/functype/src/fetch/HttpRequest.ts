import type { HttpMethod } from "./HttpError"

export type ParseMode = "json" | "text" | "blob" | "arrayBuffer" | "raw"

export interface HttpRequestOptions<T = unknown> {
  readonly url: string
  readonly method: HttpMethod
  readonly headers?: Record<string, string>
  readonly body?: unknown
  readonly signal?: AbortSignal
  readonly parseAs?: ParseMode
  readonly validate?: (data: unknown) => T
}

export interface HttpMethodOptions<T = unknown> {
  readonly headers?: Record<string, string>
  readonly body?: unknown
  readonly signal?: AbortSignal
  readonly parseAs?: ParseMode
  readonly validate?: (data: unknown) => T
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
 * response-side `validate` function is intentionally not exposed here — it
 * isn't part of the wire request and applies to the response.
 */
export interface HttpRequestView {
  readonly url: string
  readonly method: HttpMethod
  readonly headers?: Record<string, string>
  readonly body?: unknown
  readonly signal?: AbortSignal
  readonly parseAs?: ParseMode
}
