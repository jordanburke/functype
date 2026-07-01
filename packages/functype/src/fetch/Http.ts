import { Companion } from "@/companion/Companion"
import type { Decoder } from "@/decoder/Decoder"
import type { DecoderError } from "@/decoder/DecoderError"
import { IO } from "@/io"

import type { HttpClientConfig } from "./HttpClient"
import { defaultHttpClientConfig } from "./HttpClient"
import type { HttpError, HttpMethod } from "./HttpError"
import { HttpError as HttpErrorCompanion } from "./HttpError"
import type {
  HttpMethodOptions,
  HttpQueryParams,
  HttpRequestOptions,
  HttpRequestView,
  HttpResponse,
  ParseMode,
} from "./HttpRequest"

const resolveUrl = (baseUrl: string | undefined, url: string): string => {
  if (!baseUrl) return url
  if (url.startsWith("http://") || url.startsWith("https://")) return url
  const base = baseUrl.endsWith("/") ? baseUrl.slice(0, -1) : baseUrl
  const path = url.startsWith("/") ? url : `/${url}`
  return `${base}${path}`
}

const appendParams = (url: string, params: HttpQueryParams): string => {
  const search = new URLSearchParams()
  for (const key of Object.keys(params)) {
    const value = params[key]
    if (value === undefined || value === null) continue
    if (Array.isArray(value)) {
      for (const v of value) search.append(key, String(v))
    } else {
      search.append(key, String(value))
    }
  }
  const query = search.toString()
  if (!query) return url
  const separator = url.includes("?") ? "&" : "?"
  return `${url}${separator}${query}`
}

const buildUrl = (baseUrl: string | undefined, url: string, params: HttpQueryParams | undefined): string => {
  const resolved = resolveUrl(baseUrl, url)
  return params ? appendParams(resolved, params) : resolved
}

const hasToStringTag = (value: object, tag: string): boolean =>
  (value as { [Symbol.toStringTag]?: string })[Symbol.toStringTag] === tag

type BodyMode = "primitive" | "tagged"

/**
 * Walk a request body and normalize functype ADTs for JSON serialization.
 *
 * - `mode === "primitive"` (the default, `flatten: true`): strip ADTs to JSON-friendly
 *   primitives — Option → nullable, Either → right-value (Left throws), Try → success-value
 *   (Failure throws), List → array, Map (string-keyed) → record. Matches what external
 *   JSON APIs expect.
 * - `mode === "tagged"` (`flatten: false`): emit each ADT as its canonical `{_tag, value}`
 *   shape via `toValue()`, recursing into the value. Round-trips with `Decoder.tagged.*`
 *   on the response side. Used for functype-to-functype services.
 *
 * Plain objects/arrays recurse in both modes; primitives, Dates, RegExp, Buffer pass through.
 */
const normalizeBody = (value: unknown, mode: BodyMode): unknown => {
  if (value === null || value === undefined) return value
  if (typeof value !== "object") return value
  if (value instanceof Date) return value
  if (value instanceof RegExp) return value
  if (typeof Buffer !== "undefined" && value instanceof Buffer) return value

  // Option
  if (hasToStringTag(value, "Option")) {
    const opt = value as { _tag: "Some" | "None"; value: unknown }
    if (mode === "tagged") {
      return opt._tag === "None"
        ? { _tag: "None", value: null }
        : { _tag: "Some", value: normalizeBody(opt.value, mode) }
    }
    if (opt._tag === "None") return null
    return normalizeBody(opt.value, mode)
  }

  // Either
  if (hasToStringTag(value, "Either")) {
    const either = value as { _tag: "Left" | "Right"; value: unknown }
    if (mode === "tagged") {
      return { _tag: either._tag, value: normalizeBody(either.value, mode) }
    }
    if (either._tag === "Left") {
      throw new Error(
        `Cannot serialize a Left in a request body — Either's failure path should not cross the wire as data. ` +
          `Resolve the Left before sending, or omit the field. (Left value: ${JSON.stringify(either.value)})`,
      )
    }
    return normalizeBody(either.value, mode)
  }

  // Try
  if (hasToStringTag(value, "Try")) {
    const t = value as { _tag: "Success" | "Failure"; value?: unknown; error?: Error }
    if (mode === "tagged") {
      if (t._tag === "Failure") {
        const err = t.error ?? new Error("unknown")
        return { _tag: "Failure", error: err.message, stack: err.stack }
      }
      return { _tag: "Success", value: normalizeBody(t.value, mode) }
    }
    if (t._tag === "Failure") {
      throw t.error ?? new Error("Cannot serialize a Try Failure in a request body")
    }
    return normalizeBody(t.value, mode)
  }

  // List
  if (hasToStringTag(value, "List")) {
    const arr = (value as { toArray: () => unknown[] }).toArray()
    const normalized = arr.map((v) => normalizeBody(v, mode))
    return mode === "tagged" ? { _tag: "List", value: normalized } : normalized
  }

  // functype Map (Symbol.toStringTag is "FunctypeMap" to avoid colliding with native Map)
  if (hasToStringTag(value, "FunctypeMap")) {
    const m = value as { toValue: () => { value: Array<[unknown, unknown]> } }
    const entries = m.toValue().value
    if (mode === "tagged") {
      const taggedEntries = entries.map(([k, v]) => [k, normalizeBody(v, mode)] as [unknown, unknown])
      return { _tag: "Map", value: taggedEntries }
    }
    const out: Record<string, unknown> = {}
    for (const [k, v] of entries) {
      if (typeof k !== "string") {
        throw new Error(`Cannot serialize Map with non-string keys to JSON (key: ${String(k)})`)
      }
      out[k] = normalizeBody(v, mode)
    }
    return out
  }

  if (Array.isArray(value)) return value.map((v) => normalizeBody(v, mode))

  const out: Record<string, unknown> = {}
  for (const k of Object.keys(value)) {
    out[k] = normalizeBody((value as Record<string, unknown>)[k], mode)
  }
  return out
}

/** Serialize a request body, returning the serialized form and an optional Content-Type header. */
const serializeBody = (
  body: unknown,
  flatten: boolean,
): { serialized: NonNullable<RequestInit["body"]> | undefined; contentType: string | undefined } => {
  if (body === undefined || body === null) return { serialized: undefined, contentType: undefined }
  if (typeof body === "string") return { serialized: body, contentType: undefined }
  if (typeof body === "object" || Array.isArray(body)) {
    const normalized = normalizeBody(body, flatten ? "primitive" : "tagged")
    return { serialized: JSON.stringify(normalized), contentType: "application/json" }
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
  decode: Decoder<T> | undefined,
  validate: ((data: unknown) => T) | undefined,
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

  let data: T
  if (decode) {
    const result = decode(raw)
    if (result.isLeft()) {
      const body = rawText.value ?? (typeof raw === "string" ? raw : JSON.stringify(raw))
      throw HttpErrorCompanion.decodeError(url, method, body, result.value as unknown as DecoderError)
    }
    data = result.value as T
  } else if (validate) {
    // Back-compat for the 1.0.x `validate` field (deprecated; prefer decode).
    try {
      data = validate(raw)
    } catch (cause) {
      const body = rawText.value ?? (typeof raw === "string" ? raw : JSON.stringify(raw))
      throw HttpErrorCompanion.decodeError(url, method, body, cause)
    }
  } else {
    data = raw as T
  }

  return { data, status: response.status, statusText: response.statusText, headers: response.headers }
}

const doRequest = <T>(
  config: HttpClientConfig,
  options: HttpRequestOptions<T>,
): IO<never, HttpError, HttpResponse<T>> => {
  // Assemble the pre-wire view: URL resolved against baseUrl, headers merged
  // from defaultHeaders + per-call headers. Body is left raw — Content-Type
  // is decided after beforeRequest runs (in case the hook swapped the body).
  const assembled: HttpRequestView = {
    url: buildUrl(config.baseUrl, options.url, options.params),
    method: options.method,
    headers: { ...config.defaultHeaders, ...options.headers },
    body: options.body,
    signal: options.signal,
    parseAs: options.parseAs,
    flatten: options.flatten,
  }

  const prepared: IO<never, HttpError, HttpRequestView> = config.beforeRequest
    ? config.beforeRequest(assembled)
    : IO.succeed(assembled)

  return prepared.flatMap((request) => {
    const flatten = request.flatten ?? true
    const serializeResult = (():
      { ok: true; value: ReturnType<typeof serializeBody> } | { ok: false; cause: unknown } => {
      try {
        return { ok: true, value: serializeBody(request.body, flatten) }
      } catch (cause) {
        return { ok: false, cause }
      }
    })()
    if (!serializeResult.ok) {
      // Body serialization failed (e.g. Left/Failure in body, non-string Map key).
      // Surface as a NetworkError so the caller's existing HttpError handling catches it.
      return IO.fail(HttpErrorCompanion.networkError(request.url, request.method, serializeResult.cause))
    }
    const { serialized, contentType } = serializeResult.value
    const headers: Record<string, string> = {
      ...request.headers,
      ...(contentType ? { "Content-Type": contentType } : {}),
    }

    const responseIO = IO.tryAsync<HttpResponse<T>, HttpError>(
      (signal) =>
        (config.fetch ?? globalThis.fetch)(request.url, {
          method: request.method,
          headers,
          body: serialized,
          signal: request.signal ?? signal,
        }).then(async (response) => {
          if (!response.ok) {
            const body = await response.text().catch(() => "")
            throw HttpErrorCompanion.httpStatusError(
              request.url,
              request.method,
              response.status,
              response.statusText,
              body,
            )
          }
          // Response-side decoders (`decode` / `validate`) are taken from the
          // original typed options — the request hook can't touch them.
          return parseResponse<T>(
            response,
            request.parseAs,
            request.url,
            request.method,
            options.decode,
            options.validate,
          )
        }),
      (error) => {
        if (typeof error === "object" && error !== null && "_tag" in error) {
          return error as HttpError
        }
        return HttpErrorCompanion.networkError(request.url, request.method, error)
      },
    )

    // afterResponse runs only on the success path. Errors (HttpStatusError,
    // DecodeError, NetworkError) skip the hook and propagate.
    return config.afterResponse
      ? responseIO.flatMap((response) =>
          config.afterResponse!(response as HttpResponse<unknown>).map((transformed) => transformed as HttpResponse<T>),
        )
      : responseIO
  })
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

const head = (url: string, options?: HttpMethodOptions<void>): IO<never, HttpError, HttpResponse<void>> =>
  request<void>({ ...options, url, method: "HEAD", parseAs: "raw" })

const optionsMethod = (url: string, options?: HttpMethodOptions<void>): IO<never, HttpError, HttpResponse<void>> =>
  request<void>({ ...options, url, method: "OPTIONS", parseAs: "raw" })

type HttpMethods = {
  readonly request: <T = unknown>(options: HttpRequestOptions<T>) => IO<never, HttpError, HttpResponse<T>>
  readonly get: <T = unknown>(url: string, options?: HttpMethodOptions<T>) => IO<never, HttpError, HttpResponse<T>>
  readonly post: <T = unknown>(url: string, options?: HttpMethodOptions<T>) => IO<never, HttpError, HttpResponse<T>>
  readonly put: <T = unknown>(url: string, options?: HttpMethodOptions<T>) => IO<never, HttpError, HttpResponse<T>>
  readonly patch: <T = unknown>(url: string, options?: HttpMethodOptions<T>) => IO<never, HttpError, HttpResponse<T>>
  readonly delete: <T = unknown>(url: string, options?: HttpMethodOptions<T>) => IO<never, HttpError, HttpResponse<T>>
  readonly head: (url: string, options?: HttpMethodOptions<void>) => IO<never, HttpError, HttpResponse<void>>
  readonly options: (url: string, options?: HttpMethodOptions<void>) => IO<never, HttpError, HttpResponse<void>>
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
  head: (url: string, options?: HttpMethodOptions<void>) =>
    doRequest<void>(config, { ...options, url, method: "HEAD", parseAs: "raw" }),
  options: (url: string, options?: HttpMethodOptions<void>) =>
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
