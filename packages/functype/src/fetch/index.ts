export { Http } from "./Http"
export type { HttpClientConfig } from "./HttpClient"
export { HttpClient } from "./HttpClient"
export type { DecodeError, HttpMethod, HttpStatusError, NetworkError, ResponseDecodeError } from "./HttpError"
// HttpError is both the error union type and its companion (networkError, httpStatusError, decodeError), like Option.
// HttpErrors is the companion's older name, kept as an alias.
export { HttpError, HttpError as HttpErrors } from "./HttpError"
export type {
  HttpMethodOptions,
  HttpQueryParams,
  HttpRequestOptions,
  HttpRequestView,
  HttpResponse,
  ParseMode,
} from "./HttpRequest"
