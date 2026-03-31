# Http

Typed HTTP fetch wrapper returning `IO<never, HttpError, HttpResponse<T>>` effects.

## Overview

`Http` wraps the global `fetch` API with full IO integration:

- Returns `IO<never, HttpError, HttpResponse<T>>` — every request is a lazy, composable effect
- Three typed error variants: `NetworkError`, `HttpStatusError`, `DecodeError`
- Zero dependencies — uses `globalThis.fetch` (browsers, Node 18+, Bun, Deno)
- Auto content-type detection from response headers (JSON, text, raw)
- Body serialization — objects are automatically JSON-serialized with `Content-Type: application/json`
- Configurable clients with base URLs and default headers

Nothing runs until you call `.run()` or `.runOrThrow()`.

## Basic Usage

```typescript
import { Http } from "functype/fetch"

// GET request — infer response type with generic
const effect = Http.get<User>("/api/users/1")
const result = await effect.run() // Either<HttpError, HttpResponse<User>>

// POST with body — auto-serialized as JSON
const create = Http.post<User>("/api/users", {
  body: { name: "Alice", email: "alice@example.com" },
})

// PUT, PATCH, DELETE
Http.put<User>("/api/users/1", { body: { name: "Alice Updated" } })
Http.patch<User>("/api/users/1", { body: { name: "Alice" } })
Http.delete<void>("/api/users/1")

// HEAD and OPTIONS (return HttpResponse<void>)
Http.head("/api/users")
Http.options("/api/users")

// Low-level request with full control
Http.request<User>({
  url: "/api/users/1",
  method: "GET",
  headers: { "X-Request-Id": "abc123" },
})
```

## HttpResponse\<T\>

Every successful request resolves to `HttpResponse<T>`:

```typescript
type HttpResponse<T> = {
  readonly data: T // Parsed response body
  readonly status: number // HTTP status code (e.g. 200)
  readonly statusText: string // HTTP status text (e.g. "OK")
  readonly headers: Headers // Response headers (standard Web API)
}

// Accessing response fields
const effect = Http.get<User[]>("/api/users")
const either = await effect.run()

if (either._tag === "Right") {
  const { data, status, headers } = either.value
  console.log(status) // 200
  console.log(data[0].name) // "Alice"
  console.log(headers.get("x-total-count"))
}
```

## Error Handling

All HTTP errors are typed as `HttpError`, a union of three variants:

```typescript
type NetworkError = {
  _tag: "NetworkError"
  url: string
  method: HttpMethod
  cause: unknown // The underlying fetch error
}

type HttpStatusError = {
  _tag: "HttpStatusError"
  url: string
  method: HttpMethod
  status: number // e.g. 404, 500
  statusText: string
  body: string // Raw response body text
}

type DecodeError = {
  _tag: "DecodeError"
  url: string
  method: HttpMethod
  body: string // The text that failed to parse
  cause: unknown
}
```

### Pattern Matching with HttpError.match

```typescript
import { Http, HttpError } from "functype/fetch"

const effect = Http.get<User>("/api/users/1")

const result = await effect
  .mapError((err) =>
    HttpError.match(err, {
      NetworkError: (e) => `Network failure: ${String(e.cause)}`,
      HttpStatusError: (e) => `HTTP ${e.status}: ${e.statusText}`,
      DecodeError: (e) => `Parse failed: ${e.body}`,
    }),
  )
  .run()
```

### Catching Specific Error Tags

```typescript
// Recover from 404 with a default value
const user = Http.get<User>("/api/users/99").catchTag("HttpStatusError", (e) =>
  e.status === 404
    ? IO.succeed({ data: null, status: 404, statusText: "Not Found", headers: new Headers() })
    : IO.fail(e),
)

// Handle network errors separately
const resilient = Http.get<Data>("/api/data").catchTag("NetworkError", () => Http.get<Data>("/api/data/fallback"))
```

### Type Guards

```typescript
import { HttpError } from "functype/fetch"

const either = await Http.get<User>("/api/users/1").run()

if (either._tag === "Left") {
  const err = either.value

  if (HttpError.isHttpStatusError(err)) {
    console.log(err.status, err.body) // typed as HttpStatusError
  } else if (HttpError.isNetworkError(err)) {
    console.log(err.cause) // typed as NetworkError
  } else if (HttpError.isDecodeError(err)) {
    console.log(err.body) // typed as DecodeError
  }
}
```

## Http.client()

Create a configured client with a base URL, default headers, or a custom fetch implementation:

```typescript
import { Http } from "functype/fetch"

const api = Http.client({
  baseUrl: "https://api.example.com/v1",
  defaultHeaders: {
    Authorization: `Bearer ${token}`,
    "X-App-Version": "2.0.0",
  },
})

// Paths are resolved relative to baseUrl
const users = api.get<User[]>("/users") // → https://api.example.com/v1/users
const user = api.get<User>("/users/1") // → https://api.example.com/v1/users/1

// Absolute URLs bypass baseUrl
const ext = api.get<Data>("https://other.com/data") // → https://other.com/data

// Custom fetch for testing or proxying
const testApi = Http.client({
  baseUrl: "http://localhost:3000",
  fetch: myMockFetch,
})
```

### HttpClientConfig

```typescript
interface HttpClientConfig {
  readonly baseUrl?: string // Base URL prepended to relative paths
  readonly defaultHeaders?: Record<string, string> // Merged with per-request headers
  readonly fetch?: typeof globalThis.fetch // Override the fetch implementation
}
```

Per-request headers always override `defaultHeaders` when keys conflict.

## Content-Type Detection

Response bodies are parsed based on the `Content-Type` response header:

| Content-Type             | Parse Mode | Result type       |
| ------------------------ | ---------- | ----------------- |
| `application/json`       | `json`     | Parsed JS object  |
| `text/*` (any text type) | `text`     | `string`          |
| Anything else            | `raw`      | `Response` object |

Override auto-detection with the `parseAs` option:

```typescript
type ParseMode = "json" | "text" | "blob" | "arrayBuffer" | "raw"

// Force JSON parsing regardless of Content-Type header
Http.get<Config>("/api/config", { parseAs: "json" })

// Get raw Blob for file downloads
Http.get<Blob>("/api/export/report.pdf", { parseAs: "blob" })

// Get ArrayBuffer for binary data
Http.get<ArrayBuffer>("/api/binary", { parseAs: "arrayBuffer" })

// Get the raw Response object
Http.get<Response>("/api/stream", { parseAs: "raw" })
```

## IO Composition

Because `Http` returns `IO` effects, the full IO operator set is available:

```typescript
import { Http } from "functype/fetch"

// Retry on failure
Http.get<Data>("/api/data").retry(3)

// Retry with delay between attempts (ms)
Http.get<Data>("/api/data").retryWithDelay(3, 1000)

// Timeout after N milliseconds
Http.get<Data>("/api/data").timeout(5000)

// Transform the response data
Http.get<User>("/api/users/1").map((res) => res.data.name)

// Chain requests — use result of first to drive second
Http.get<User>("/api/users/1").flatMap((res) => Http.get<Post[]>(`/api/users/${res.data.id}/posts`))

// Parallel requests
import { IO } from "functype/io"

const [users, posts] = await IO.all([Http.get<User[]>("/api/users"), Http.get<Post[]>("/api/posts")]).run()

// Map over errors
Http.get<Data>("/api/data").mapError((err) => new AppError(err))
```

## Body Serialization

Request bodies are serialized based on their JavaScript type:

| Body value           | Serialized as        | Content-Type header added     |
| -------------------- | -------------------- | ----------------------------- |
| `undefined` / `null` | No body sent         | None                          |
| `string`             | Passed through as-is | None (set manually if needed) |
| Object or Array      | `JSON.stringify()`   | `application/json`            |
| Other primitives     | `String(value)`      | None                          |

```typescript
// Object body → JSON serialized automatically
Http.post<Order>("/api/orders", {
  body: { productId: 42, quantity: 3 },
  // Content-Type: application/json is added automatically
})

// String body → sent as-is, no Content-Type added
Http.post<Result>("/api/graphql", {
  body: '{"query":"{ users { id name } }"}',
  headers: { "Content-Type": "application/json" },
})

// FormData or URLSearchParams — pass as string or handle manually
Http.post<Result>("/api/form", {
  body: new URLSearchParams({ key: "value" }).toString(),
  headers: { "Content-Type": "application/x-www-form-urlencoded" },
})
```

## API Reference

See full API documentation at [functype API docs](https://jordanburke.github.io/functype/modules/fetch.html)
