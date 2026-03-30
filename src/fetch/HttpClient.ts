import { Tag } from "@/io/Tag"

export interface HttpClientConfig {
  readonly baseUrl?: string
  readonly defaultHeaders?: Record<string, string>
  readonly fetch?: typeof globalThis.fetch
}

export const HttpClient = Tag<HttpClientConfig>("HttpClient")

export const defaultHttpClientConfig: HttpClientConfig = {}
