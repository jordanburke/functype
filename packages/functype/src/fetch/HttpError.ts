import { Companion } from "@/companion/Companion"

export type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE" | "HEAD" | "OPTIONS"

export type NetworkError = {
  readonly _tag: "NetworkError"
  readonly url: string
  readonly method: HttpMethod
  readonly cause: unknown
}

export type HttpStatusError = {
  readonly _tag: "HttpStatusError"
  readonly url: string
  readonly method: HttpMethod
  readonly status: number
  readonly statusText: string
  readonly body: string
}

/**
 * Raised when a successful HTTP response could not be decoded into the
 * caller's expected shape — JSON parse failure, a `decode: Decoder<T>` that
 * returned `Left(DecoderError)` (including a throw inside `Decoder.fromThrowing`).
 * In practice `cause` is a `DecoderError` (when produced by `decode`) or the
 * `JSON.parse` error (when the body isn't JSON), so the field is typed `unknown`.
 */
export type DecodeError = {
  readonly _tag: "DecodeError"
  readonly url: string
  readonly method: HttpMethod
  readonly body: string
  readonly cause: unknown
}

/**
 * More descriptive alias for `DecodeError` — clarifies that this is the
 * HTTP-level wrapper for response decoding failures, distinct from the
 * structural `DecoderError` tree it usually carries in `cause`. Both names
 * refer to the same `_tag: "DecodeError"` variant.
 */
export type ResponseDecodeError = DecodeError

export type HttpError = NetworkError | HttpStatusError | DecodeError

const networkError = (url: string, method: HttpMethod, cause: unknown): NetworkError => ({
  _tag: "NetworkError",
  url,
  method,
  cause,
})

const httpStatusError = (
  url: string,
  method: HttpMethod,
  status: number,
  statusText: string,
  body: string,
): HttpStatusError => ({
  _tag: "HttpStatusError",
  url,
  method,
  status,
  statusText,
  body,
})

const decodeError = (url: string, method: HttpMethod, body: string, cause: unknown): DecodeError => ({
  _tag: "DecodeError",
  url,
  method,
  body,
  cause,
})

const isNetworkError = (error: HttpError): error is NetworkError => error._tag === "NetworkError"

const isHttpStatusError = (error: HttpError): error is HttpStatusError => error._tag === "HttpStatusError"

const isDecodeError = (error: HttpError): error is DecodeError => error._tag === "DecodeError"

const match = <T>(
  error: HttpError,
  patterns: {
    readonly NetworkError: (e: NetworkError) => T
    readonly HttpStatusError: (e: HttpStatusError) => T
    readonly DecodeError: (e: DecodeError) => T
  },
): T => {
  switch (error._tag) {
    case "NetworkError":
      return patterns.NetworkError(error)
    case "HttpStatusError":
      return patterns.HttpStatusError(error)
    case "DecodeError":
      return patterns.DecodeError(error)
  }
}

const HttpErrorCompanion = {
  networkError,
  httpStatusError,
  decodeError,
  isNetworkError,
  isHttpStatusError,
  isDecodeError,
  match,
}

export const HttpError = Companion({ _tag: "HttpError" } as const, HttpErrorCompanion)
