# Http

HTTP fetch wrapper returning `IO<never, HttpError, HttpResponse<unknown>>` effects by default. Provide a `validate` function to get typed responses.

## Overview

`Http` wraps the global `fetch` API with full IO integration:

- Returns `IO<never, HttpError, HttpResponse<unknown>>` by default — every request is a lazy, composable effect
- **BYOV (Bring Your Own Validator)**: Pass a `validate: (data: unknown) => T` function to get `HttpResponse<T>`
- Works with any validation library: Zod, TypeBox, Valibot, or manual validators
- Three typed error variants: `NetworkError`, `HttpStatusError`, `DecodeError`
- Zero dependencies — uses `globalThis.fetch` (browsers, Node 18+, Bun, Deno)
- Auto content-type detection from response headers (JSON, text, raw)
- Body serialization — objects are automatically JSON-serialized with `Content-Type: application/json`
- Configurable clients with base URLs and default headers

Nothing runs until you call `.run()` or `.runOrThrow()`.

## Basic Usage

```typescript
import { Http } from "functype/fetch"

// Without validator — data is unknown
const effect = Http.get("/api/users/1")
const result = await effect.run() // Either<HttpError, HttpResponse<unknown>>

// With validator — T inferred from validate return type
const typedEffect = Http.get("/api/users/1", {
  validate: (data) => UserSchema.parse(data),
})
const typedResult = await typedEffect.run() // Either<HttpError, HttpResponse<User>>

// POST with body — auto-serialized as JSON
const create = Http.post("/api/users", {
  body: { name: "Alice", email: "alice@example.com" },
  validate: (data) => UserSchema.parse(data),
})

// PUT, PATCH, DELETE
Http.put("/api/users/1", { body: { name: "Alice Updated" }, validate: (data) => UserSchema.parse(data) })
Http.patch("/api/users/1", { body: { name: "Alice" }, validate: (data) => UserSchema.parse(data) })
Http.delete("/api/users/1")

// HEAD and OPTIONS (return HttpResponse<void>)
Http.head("/api/users")
Http.options("/api/users")

// Low-level request with full control
Http.request({
  url: "/api/users/1",
  method: "GET",
  headers: { "X-Request-Id": "abc123" },
  validate: (data) => UserSchema.parse(data),
})
```

## Validation

Without a `validate` function, response data is `unknown`. This is intentional — it prevents unsafe type casts and encourages runtime validation.

```typescript
// Without validate — data is unknown, you must narrow it yourself
const effect = Http.get("/api/users")
// effect: IO<never, HttpError, HttpResponse<unknown>>

// With validate — T is inferred from the validator's return type
const typedEffect = Http.get("/api/users", {
  validate: (data) => z.array(UserSchema).parse(data),
})
// typedEffect: IO<never, HttpError, HttpResponse<User[]>>
```

### Using Different Validators

```typescript
// Zod
Http.get("/api/users", { validate: (data) => z.array(UserSchema).parse(data) })

// TypeBox
Http.get("/api/users", { validate: (data) => Value.Decode(UserSchema, data) })

// Valibot
Http.get("/api/users", { validate: (data) => parse(UserSchema, data) })

// Manual validation
Http.get("/api/users", {
  validate: (data) => {
    if (!Array.isArray(data)) throw new Error("Expected array")
    return data as User[]
  },
})
```

## HttpResponse\<T\>

Every successful request resolves to `HttpResponse<T>` (where `T` is `unknown` without a validator):

```typescript
type HttpResponse<T> = {
  readonly data: T // Parsed response body (unknown without validate)
  readonly status: number // HTTP status code (e.g. 200)
  readonly statusText: string // HTTP status text (e.g. "OK")
  readonly headers: Headers // Response headers (standard Web API)
}

// Accessing response fields with a validator
const effect = Http.get("/api/users", {
  validate: (data) => z.array(UserSchema).parse(data),
})
const either = await effect.run()

if (either._tag === "Right") {
  const { data, status, headers } = either.value
  console.log(status) // 200
  console.log(data[0].name) // "Alice" — data is User[], not unknown
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

const effect = Http.get("/api/users/1", { validate: (data) => UserSchema.parse(data) })

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
const user = Http.get("/api/users/99", { validate: (data) => UserSchema.parse(data) }).catchTag("HttpStatusError", (e) =>
  e.status === 404
    ? IO.succeed({ data: null, status: 404, statusText: "Not Found", headers: new Headers() })
    : IO.fail(e),
)

// Handle network errors separately
const resilient = Http.get("/api/data").catchTag("NetworkError", () => Http.get("/api/data/fallback"))
```

### Type Guards

```typescript
import { HttpError } from "functype/fetch"

const either = await Http.get("/api/users/1", { validate: (data) => UserSchema.parse(data) }).run()

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
const users = api.get("/users", { validate: (data) => z.array(UserSchema).parse(data) }) // → https://api.example.com/v1/users
const user = api.get("/users/1", { validate: (data) => UserSchema.parse(data) }) // → https://api.example.com/v1/users/1

// Absolute URLs bypass baseUrl
const ext = api.get("https://other.com/data") // → https://other.com/data (data is unknown)

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
Http.get("/api/config", { parseAs: "json", validate: (data) => ConfigSchema.parse(data) })

// Get raw Blob for file downloads
Http.get("/api/export/report.pdf", { parseAs: "blob" })

// Get ArrayBuffer for binary data
Http.get("/api/binary", { parseAs: "arrayBuffer" })

// Get the raw Response object
Http.get("/api/stream", { parseAs: "raw" })
```

## IO Composition

Because `Http` returns `IO` effects, the full IO operator set is available:

```typescript
import { Http } from "functype/fetch"

// Retry on failure
Http.get("/api/data").retry(3)

// Retry with delay between attempts (ms)
Http.get("/api/data").retryWithDelay(3, 1000)

// Timeout after N milliseconds
Http.get("/api/data").timeout(5000)

// Transform the response data (with validator for typed access)
Http.get("/api/users/1", { validate: (data) => UserSchema.parse(data) }).map((res) => res.data.name)

// Chain requests — use result of first to drive second
Http.get("/api/users/1", { validate: (data) => UserSchema.parse(data) }).flatMap((res) =>
  Http.get(`/api/users/${res.data.id}/posts`, { validate: (data) => z.array(PostSchema).parse(data) }),
)

// Parallel requests
import { IO } from "functype/io"

const [users, posts] = await IO.all([
  Http.get("/api/users", { validate: (data) => z.array(UserSchema).parse(data) }),
  Http.get("/api/posts", { validate: (data) => z.array(PostSchema).parse(data) }),
]).run()

// Map over errors
Http.get("/api/data").mapError((err) => new AppError(err))
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
Http.post("/api/orders", {
  body: { productId: 42, quantity: 3 },
  validate: (data) => OrderSchema.parse(data),
  // Content-Type: application/json is added automatically
})

// String body → sent as-is, no Content-Type added
Http.post("/api/graphql", {
  body: '{"query":"{ users { id name } }"}',
  headers: { "Content-Type": "application/json" },
  validate: (data) => GraphQLResultSchema.parse(data),
})

// FormData or URLSearchParams — pass as string or handle manually
Http.post("/api/form", {
  body: new URLSearchParams({ key: "value" }).toString(),
  headers: { "Content-Type": "application/x-www-form-urlencoded" },
})
```

## API Reference

See full API documentation at [functype API docs](https://jordanburke.github.io/functype/modules/fetch.html)
