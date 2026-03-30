import { Companion } from "@/companion/Companion"
import { IO } from "@/io"

import type { HttpClientConfig } from "./HttpClient"
import { defaultHttpClientConfig } from "./HttpClient"
import type { HttpError, HttpMethod } from "./HttpError"
import { HttpError as HttpErrorCompanion } from "./HttpError"
import type { HttpMethodOptions, HttpRequestOptions, HttpResponse, ParseMode } from "./HttpRequest"

const resolveUrl = (baseUrl: string | undefined, url: string): string => {
  if (!baseUrl) return url
  if (url.startsWith("http://") || url.startsWith("https://")) return url
  const base = baseUrl.endsWith("/") ? baseUrl.slice(0, -1) : baseUrl
  const path = url.startsWith("/") ? url : `/${url}`
  return `${base}${path}`
}

/** Serialize a request body, returning the serialized form and an optional Content-Type header. */
const serializeBody = (
  body: unknown,
): { serialized: NonNullable<RequestInit["body"]> | undefined; contentType: string | undefined } => {
  if (body === undefined || body === null) return { serialized: undefined, contentType: undefined }
  if (typeof body === "string") return { serialized: body, contentType: undefined }
  // For objects/arrays, serialize as JSON
  if (typeof body === "object" || Array.isArray(body)) {
    return { serialized: JSON.stringify(body), contentType: "application/json" }
  }
  return { serialized: String(body), contentType: undefined }
}

const detectParseMode = (headers: Headers): ParseMode => {
  const contentType = headers.get("content-type") ?? ""
  if (contentType.includes("application/json")) return "json"
  if (contentType.startsWith("text/")) return "text"
  return "raw"
}

const parseResponse = async <T>(
  response: Response,
  parseAs: ParseMode | undefined,
  url: string,
  method: HttpMethod,
): Promise<HttpResponse<T>> => {
  const mode = parseAs ?? detectParseMode(response.headers)
  let data: T
  switch (mode) {
    case "json": {
      const text = await response.text()
      try {
        data = JSON.parse(text) as T
      } catch (cause) {
        throw HttpErrorCompanion.decodeError(url, method, text, cause)
      }
      break
    }
    case "text":
      data = (await response.text()) as T
      break
    case "blob":
      data = (await response.blob()) as T
      break
    case "arrayBuffer":
      data = (await response.arrayBuffer()) as T
      break
    case "raw":
      data = response as unknown as T
      break
  }
  return { data, status: response.status, statusText: response.statusText, headers: response.headers }
}

const doRequest = <T>(config: HttpClientConfig, options: HttpRequestOptions): IO<never, HttpError, HttpResponse<T>> => {
  const url = resolveUrl(config.baseUrl, options.url)
  const { serialized, contentType } = serializeBody(options.body)
  const headers: Record<string, string> = {
    ...config.defaultHeaders,
    ...options.headers,
    ...(contentType ? { "Content-Type": contentType } : {}),
  }

  return IO.tryAsync<HttpResponse<T>, HttpError>(
    (signal) =>
      (config.fetch ?? globalThis.fetch)(url, {
        method: options.method,
        headers,
        body: serialized,
        signal: options.signal ?? signal,
      }).then(async (response) => {
        if (!response.ok) {
          const body = await response.text().catch(() => "")
          throw HttpErrorCompanion.httpStatusError(url, options.method, response.status, response.statusText, body)
        }
        return parseResponse<T>(response, options.parseAs, url, options.method)
      }),
    (error) => {
      if (typeof error === "object" && error !== null && "_tag" in error) {
        return error as HttpError
      }
      return HttpErrorCompanion.networkError(url, options.method, error)
    },
  )
}

const request = <T>(options: HttpRequestOptions): IO<never, HttpError, HttpResponse<T>> =>
  doRequest<T>(defaultHttpClientConfig, options)

const get = <T>(url: string, options?: HttpMethodOptions): IO<never, HttpError, HttpResponse<T>> =>
  request<T>({ ...options, url, method: "GET" })

const post = <T>(url: string, options?: HttpMethodOptions): IO<never, HttpError, HttpResponse<T>> =>
  request<T>({ ...options, url, method: "POST" })

const put = <T>(url: string, options?: HttpMethodOptions): IO<never, HttpError, HttpResponse<T>> =>
  request<T>({ ...options, url, method: "PUT" })

const patch = <T>(url: string, options?: HttpMethodOptions): IO<never, HttpError, HttpResponse<T>> =>
  request<T>({ ...options, url, method: "PATCH" })

const del = <T>(url: string, options?: HttpMethodOptions): IO<never, HttpError, HttpResponse<T>> =>
  request<T>({ ...options, url, method: "DELETE" })

const head = (url: string, options?: HttpMethodOptions): IO<never, HttpError, HttpResponse<void>> =>
  request<void>({ ...options, url, method: "HEAD", parseAs: "raw" })

const optionsMethod = (url: string, options?: HttpMethodOptions): IO<never, HttpError, HttpResponse<void>> =>
  request<void>({ ...options, url, method: "OPTIONS", parseAs: "raw" })

type HttpMethods = {
  readonly request: <T>(options: HttpRequestOptions) => IO<never, HttpError, HttpResponse<T>>
  readonly get: <T>(url: string, options?: HttpMethodOptions) => IO<never, HttpError, HttpResponse<T>>
  readonly post: <T>(url: string, options?: HttpMethodOptions) => IO<never, HttpError, HttpResponse<T>>
  readonly put: <T>(url: string, options?: HttpMethodOptions) => IO<never, HttpError, HttpResponse<T>>
  readonly patch: <T>(url: string, options?: HttpMethodOptions) => IO<never, HttpError, HttpResponse<T>>
  readonly delete: <T>(url: string, options?: HttpMethodOptions) => IO<never, HttpError, HttpResponse<T>>
  readonly head: (url: string, options?: HttpMethodOptions) => IO<never, HttpError, HttpResponse<void>>
  readonly options: (url: string, options?: HttpMethodOptions) => IO<never, HttpError, HttpResponse<void>>
}

/** Create an Http client with a custom configuration (base URL, default headers, custom fetch). */
const client = (config: HttpClientConfig): HttpMethods => ({
  request: <T>(options: HttpRequestOptions) => doRequest<T>(config, options),
  get: <T>(url: string, options?: HttpMethodOptions) => doRequest<T>(config, { ...options, url, method: "GET" }),
  post: <T>(url: string, options?: HttpMethodOptions) => doRequest<T>(config, { ...options, url, method: "POST" }),
  put: <T>(url: string, options?: HttpMethodOptions) => doRequest<T>(config, { ...options, url, method: "PUT" }),
  patch: <T>(url: string, options?: HttpMethodOptions) => doRequest<T>(config, { ...options, url, method: "PATCH" }),
  delete: <T>(url: string, options?: HttpMethodOptions) => doRequest<T>(config, { ...options, url, method: "DELETE" }),
  head: (url: string, options?: HttpMethodOptions) =>
    doRequest<void>(config, { ...options, url, method: "HEAD", parseAs: "raw" }),
  options: (url: string, options?: HttpMethodOptions) =>
    doRequest<void>(config, { ...options, url, method: "OPTIONS", parseAs: "raw" }),
})

const HttpCompanion = {
  request,
  get,
  post,
  put,
  patch,
  delete: del,
  head,
  options: optionsMethod,
  client,
}

export const Http = Companion({} as { readonly _tag: "Http" }, HttpCompanion)
