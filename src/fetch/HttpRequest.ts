import type { HttpMethod } from "./HttpError"

export type ParseMode = "json" | "text" | "blob" | "arrayBuffer" | "raw"

export interface HttpRequestOptions {
  readonly url: string
  readonly method: HttpMethod
  readonly headers?: Record<string, string>
  readonly body?: unknown
  readonly signal?: AbortSignal
  readonly parseAs?: ParseMode
}

export interface HttpMethodOptions {
  readonly headers?: Record<string, string>
  readonly body?: unknown
  readonly signal?: AbortSignal
  readonly parseAs?: ParseMode
}

export interface HttpResponse<T> {
  readonly data: T
  readonly status: number
  readonly statusText: string
  readonly headers: Headers
}
