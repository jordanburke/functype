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
  validate?: (data: unknown) => T,
): Promise<HttpResponse<T>> => {
  const mode = parseAs ?? detectParseMode(response.headers)
  let raw: unknown
  const rawText: { value?: string } = {}
  switch (mode) {
    case "json": {
      const text = await response.text()
      rawText.value = text
      try {
        raw = JSON.parse(text)
      } catch (cause) {
        throw HttpErrorCompanion.decodeError(url, method, text, cause)
      }
      break
    }
    case "text":
      raw = await response.text()
      rawText.value = raw as string
      break
    case "blob":
      raw = await response.blob()
      break
    case "arrayBuffer":
      raw = await response.arrayBuffer()
      break
    case "raw":
      raw = response
      break
  }

  const data: T = validate
    ? (() => {
        try {
          return validate(raw)
        } catch (cause) {
          const body = rawText.value ?? (typeof raw === "string" ? raw : JSON.stringify(raw))
          throw HttpErrorCompanion.decodeError(url, method, body, cause)
        }
      })()
    : (raw as T)

  return { data, status: response.status, statusText: response.statusText, headers: response.headers }
}

const doRequest = <T>(
  config: HttpClientConfig,
  options: HttpRequestOptions<T>,
): IO<never, HttpError, HttpResponse<T>> => {
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
        return parseResponse<T>(response, options.parseAs, url, options.method, options.validate)
      }),
    (error) => {
      if (typeof error === "object" && error !== null && "_tag" in error) {
        return error as HttpError
      }
      return HttpErrorCompanion.networkError(url, options.method, error)
    },
  )
}

const request = <T = unknown>(options: HttpRequestOptions<T>): IO<never, HttpError, HttpResponse<T>> =>
  doRequest<T>(defaultHttpClientConfig, options)

const get = <T = unknown>(url: string, options?: HttpMethodOptions<T>): IO<never, HttpError, HttpResponse<T>> =>
  request<T>({ ...options, url, method: "GET" })

const post = <T = unknown>(url: string, options?: HttpMethodOptions<T>): IO<never, HttpError, HttpResponse<T>> =>
  request<T>({ ...options, url, method: "POST" })

const put = <T = unknown>(url: string, options?: HttpMethodOptions<T>): IO<never, HttpError, HttpResponse<T>> =>
  request<T>({ ...options, url, method: "PUT" })

const patch = <T = unknown>(url: string, options?: HttpMethodOptions<T>): IO<never, HttpError, HttpResponse<T>> =>
  request<T>({ ...options, url, method: "PATCH" })

const del = <T = unknown>(url: string, options?: HttpMethodOptions<T>): IO<never, HttpError, HttpResponse<T>> =>
  request<T>({ ...options, url, method: "DELETE" })

const head = (url: string, options?: HttpMethodOptions): IO<never, HttpError, HttpResponse<void>> =>
  request<void>({ ...options, url, method: "HEAD", parseAs: "raw" })

const optionsMethod = (url: string, options?: HttpMethodOptions): IO<never, HttpError, HttpResponse<void>> =>
  request<void>({ ...options, url, method: "OPTIONS", parseAs: "raw" })

type HttpMethods = {
  readonly request: <T = unknown>(options: HttpRequestOptions<T>) => IO<never, HttpError, HttpResponse<T>>
  readonly get: <T = unknown>(url: string, options?: HttpMethodOptions<T>) => IO<never, HttpError, HttpResponse<T>>
  readonly post: <T = unknown>(url: string, options?: HttpMethodOptions<T>) => IO<never, HttpError, HttpResponse<T>>
  readonly put: <T = unknown>(url: string, options?: HttpMethodOptions<T>) => IO<never, HttpError, HttpResponse<T>>
  readonly patch: <T = unknown>(url: string, options?: HttpMethodOptions<T>) => IO<never, HttpError, HttpResponse<T>>
  readonly delete: <T = unknown>(url: string, options?: HttpMethodOptions<T>) => IO<never, HttpError, HttpResponse<T>>
  readonly head: (url: string, options?: HttpMethodOptions) => IO<never, HttpError, HttpResponse<void>>
  readonly options: (url: string, options?: HttpMethodOptions) => IO<never, HttpError, HttpResponse<void>>
}

/** Create an Http client with a custom configuration (base URL, default headers, custom fetch). */
const client = (config: HttpClientConfig): HttpMethods => ({
  request: <T = unknown>(options: HttpRequestOptions<T>) => doRequest<T>(config, options),
  get: <T = unknown>(url: string, options?: HttpMethodOptions<T>) =>
    doRequest<T>(config, { ...options, url, method: "GET" }),
  post: <T = unknown>(url: string, options?: HttpMethodOptions<T>) =>
    doRequest<T>(config, { ...options, url, method: "POST" }),
  put: <T = unknown>(url: string, options?: HttpMethodOptions<T>) =>
    doRequest<T>(config, { ...options, url, method: "PUT" }),
  patch: <T = unknown>(url: string, options?: HttpMethodOptions<T>) =>
    doRequest<T>(config, { ...options, url, method: "PATCH" }),
  delete: <T = unknown>(url: string, options?: HttpMethodOptions<T>) =>
    doRequest<T>(config, { ...options, url, method: "DELETE" }),
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
