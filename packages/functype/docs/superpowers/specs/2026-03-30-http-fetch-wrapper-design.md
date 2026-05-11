# Http Fetch Wrapper Design

## Context

functype lacks a built-in way to make HTTP requests that returns functype types. Users currently reach for raw `fetch` and manually wrap results in `IO.tryAsync` or `Try.fromPromise`. An `Http` module that returns `IO<never, HttpError, HttpResponse<T>>` would provide typed errors, composability with retry/timeout/cancellation, and a clean API that fits naturally into the functype ecosystem.

**Scope:** New `src/fetch/` module exported as `functype/fetch`. Zero external dependencies — uses the global `fetch` available in all modern runtimes (browsers, Node 18+, Bun, Deno).

## Error Model: HttpError ADT

Three-variant discriminated union covering all HTTP failure modes:

```typescript
type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE" | "HEAD" | "OPTIONS"

type HttpError = NetworkError | HttpStatusError | DecodeError

type NetworkError = {
  readonly _tag: "NetworkError"
  readonly url: string
  readonly method: HttpMethod
  readonly cause: unknown
}

type HttpStatusError = {
  readonly _tag: "HttpStatusError"
  readonly url: string
  readonly method: HttpMethod
  readonly status: number
  readonly statusText: string
  readonly body: string
}

type DecodeError = {
  readonly _tag: "DecodeError"
  readonly url: string
  readonly method: HttpMethod
  readonly body: string
  readonly cause: unknown
}
```

**Companion utilities:**

- `HttpError.match(error, { NetworkError, HttpStatusError, DecodeError })` — exhaustive pattern matching
- `HttpError.isNetworkError(e)`, `HttpError.isHttpStatusError(e)`, `HttpError.isDecodeError(e)` — type guards

**Rationale:** Standalone ADT rather than reusing TypedError. Keeps the fetch module self-contained with no modifications to existing code. Users who want TypedError integration can `.mapError()`.

## Request/Response Types

```typescript
type ParseMode = "json" | "text" | "blob" | "arrayBuffer" | "raw"

interface HttpRequestOptions {
  readonly url: string
  readonly method: HttpMethod
  readonly headers?: Record<string, string>
  readonly body?: unknown
  readonly signal?: AbortSignal
  readonly parseAs?: ParseMode
}

interface HttpMethodOptions {
  readonly headers?: Record<string, string>
  readonly body?: unknown
  readonly signal?: AbortSignal
  readonly parseAs?: ParseMode
}

interface HttpResponse<T> {
  readonly data: T
  readonly status: number
  readonly statusText: string
  readonly headers: Headers
}
```

**Auto-detection logic (when `parseAs` not set):**

- `application/json` content-type -> parse as JSON
- `text/*` content-type -> parse as text
- Everything else -> return raw `Response`

**Body serialization:**

- Object/array `body` -> `JSON.stringify` + `Content-Type: application/json`
- String, FormData, Blob, etc. -> pass through as-is

## API Surface

```typescript
import { Http, HttpClient } from "functype/fetch"

// Convenience methods — IO<never, HttpError, HttpResponse<T>>
Http.get<User>("/api/users/1")
Http.post<User>("/api/users", { body: { name: "Alice" } })
Http.put<User>("/api/users/1", { body: updated })
Http.patch<User>("/api/users/1", { body: { name: "Bob" } })
Http.delete<void>("/api/users/1")
Http.head("/api/users")
Http.options("/api/users")

// Full control
Http.request<User>({ url: "/api/users", method: "GET" })
```

**Composing with IO:**

```typescript
Http.get<User[]>("/api/users")
  .map((res) => res.data.filter((u) => u.active))
  .retry(3)
  .retryWithDelay(3, 1000)
  .timeout(5000)
  .catchTag("HttpStatusError", (e) => (e.status === 404 ? IO.succeed(emptyResponse) : IO.fail(e)))

await pipeline.runOrThrow()
```

**Error handling:**

```typescript
// catchTag for specific variants
Http.get<User>("/api/users/1")
  .catchTag("HttpStatusError", e => { ... })
  .catchTag("NetworkError", e => { ... })

// Exhaustive match
Http.get<User>("/api/users/1")
  .mapError(e => HttpError.match(e, {
    NetworkError:    e => `Offline: ${e.cause}`,
    HttpStatusError: e => `Server returned ${e.status}`,
    DecodeError:     e => `Bad response: ${e.cause}`,
  }))

// Type guards
if (HttpError.isHttpStatusError(error)) {
  console.log(error.status)
}
```

## Dependency Injection (Optional)

```typescript
interface HttpClientConfig {
  readonly baseUrl?: string
  readonly defaultHeaders?: Record<string, string>
  readonly fetch?: typeof globalThis.fetch
}

const HttpClient: Tag<HttpClientConfig>
```

**Usage:**

```typescript
Http.get<User>("/users/1").provideService(HttpClient, {
  baseUrl: "https://api.example.com",
  defaultHeaders: { Authorization: "Bearer token" },
})
```

DI is optional. Without it, `Http.get` uses the URL as-is and `globalThis.fetch`. The `fetch` override in config enables testing with mock implementations.

## File Organization

```
src/fetch/
  HttpError.ts       -- ADT + constructors + match + type guards
  HttpRequest.ts     -- HttpRequestOptions, HttpMethodOptions, HttpResponse, HttpMethod, ParseMode
  Http.ts            -- Companion object (get/post/put/patch/delete/head/options/request)
  HttpClient.ts      -- HttpClientConfig interface + Tag
  index.ts           -- re-exports
```

## Implementation Notes

- Core implementation wraps `IO.tryAsync(fn, errorMapper)` with content-type detection and status checking
- Body serialization uses `typeof body === "object" && body !== null && !(body instanceof FormData) && !(body instanceof Blob)` to decide auto-JSON
- Uses Companion pattern from `src/companion/Companion.ts`
- HttpClient Tag resolution: `IO.service(HttpClient).recover(defaultConfig).flatMap(config => doRequest(config, opts))`

## Verification

1. `pnpm compile` — TypeScript compilation check
2. `pnpm test` — run all tests including new `test/fetch/http.spec.ts`
3. `pnpm validate` — full format + lint + test + build pipeline
4. Test cases should cover:
   - Successful GET/POST with JSON response
   - Non-2xx status -> HttpStatusError
   - Network failure -> NetworkError
   - Bad JSON -> DecodeError
   - Auto-detect content type (JSON, text, raw)
   - `parseAs` override
   - Body auto-serialization (object -> JSON, string passthrough)
   - AbortSignal cancellation
   - HttpClientConfig with baseUrl and defaultHeaders
   - HttpError.match exhaustiveness
   - Type guard functions
   - Composition with retry/timeout
