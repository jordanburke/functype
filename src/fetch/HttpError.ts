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

export type DecodeError = {
  readonly _tag: "DecodeError"
  readonly url: string
  readonly method: HttpMethod
  readonly body: string
  readonly cause: unknown
}

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

export const HttpError = Companion({} as { readonly _tag: "HttpError" }, HttpErrorCompanion)
