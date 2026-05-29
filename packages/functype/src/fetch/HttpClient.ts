import type { IO } from "@/io/IO"
import { Tag } from "@/io/Tag"

import type { HttpError } from "./HttpError"
import type { HttpRequestView } from "./HttpRequest"

export interface HttpClientConfig {
  readonly baseUrl?: string
  readonly defaultHeaders?: Record<string, string>
  readonly fetch?: typeof globalThis.fetch
  /**
   * Effectful transformer that runs after `defaultHeaders` and per-call headers
   * are merged, but before the request is sent. Returning a failed IO short-
   * circuits the call with the produced `HttpError`. Compose multiple concerns
   * (request IDs, auth refresh, logging) with standard IO operators — the
   * request side becomes symmetric with the response chain (`.tap`, `.map`,
   * `.flatMap`, `.catchTag`).
   *
   * @example
   * ```ts
   * const addRequestId = (r: HttpRequestView): HttpRequestView => ({
   *   ...r,
   *   headers: { ...r.headers, "x-request-id": crypto.randomUUID() },
   * })
   *
   * const addBearer = (getToken: () => Promise<string>) =>
   *   (r: HttpRequestView): IO<never, HttpError, HttpRequestView> =>
   *     IO.tryPromise({
   *       try: () => getToken(),
   *       catch: (e) => HttpError.networkError(r.url, r.method, e),
   *     }).map((token) => ({
   *       ...r,
   *       headers: { ...r.headers, Authorization: `Bearer ${token}` },
   *     }))
   *
   * const api = Http.client({
   *   baseUrl: "https://api.example.com",
   *   beforeRequest: (r) =>
   *     IO.succeed(r)
   *       .map(addRequestId)
   *       .flatMap(addBearer(getToken))
   *       .tap((req) => logger.info(req.method, req.url)),
   * })
   * ```
   */
  readonly beforeRequest?: (request: HttpRequestView) => IO<never, HttpError, HttpRequestView>
}

export const HttpClient = Tag<HttpClientConfig>("HttpClient")

export const defaultHttpClientConfig: HttpClientConfig = {}
