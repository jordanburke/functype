import type { IO } from "@/io/IO"
import { Tag } from "@/io/Tag"

import type { HttpError } from "./HttpError"
import type { HttpRequestView, HttpResponse } from "./HttpRequest"

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

  /**
   * Effectful transformer that runs after the response is parsed (and the
   * decoder, if any, succeeds) but before the IO resolves to the caller.
   * Returning a failed IO surfaces the error in place of the response.
   *
   * **Only runs on the success path.** `HttpStatusError` (non-2xx),
   * `DecodeError` (validation failure), and `NetworkError` (fetch / abort)
   * skip this hook and surface directly. For *error*-side observability and
   * recovery (refresh-on-401, error logging), use `.catchTag(...)` /
   * `.tapError(...)` at the call site.
   *
   * The hook receives `HttpResponse<unknown>` — body shape is opaque here
   * because hooks are response-shape-agnostic. The per-call decoder narrows
   * `data` to the typed value before the response reaches the caller, but
   * the hook itself sees `unknown`.
   *
   * @example
   * ```ts
   * const api = Http.client({
   *   baseUrl: "https://api.example.com",
   *   afterResponse: (response) =>
   *     IO.succeed(response)
   *       .tap((r) => logger.info("response", { status: r.status }))
   *       .map((r) => ({ ...r, headers: redactSensitiveHeaders(r.headers) })),
   * })
   *
   * // Refresh-on-401 is a .catchTag pattern, NOT an afterResponse pattern:
   * api.get("/me", { decode })
   *   .catchTag("HttpStatusError", (e) =>
   *     e.status === 401 ? refreshToken().flatMap(() => api.get("/me", { decode })) : IO.fail(e),
   *   )
   * ```
   */
  readonly afterResponse?: (response: HttpResponse<unknown>) => IO<never, HttpError, HttpResponse<unknown>>
}

export const HttpClient = Tag<HttpClientConfig>("HttpClient")

export const defaultHttpClientConfig: HttpClientConfig = {}
