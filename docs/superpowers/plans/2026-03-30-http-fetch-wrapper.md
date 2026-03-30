# Http Fetch Wrapper Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an `Http` module to functype that wraps the global `fetch` API, returning `IO<never, HttpError, HttpResponse<T>>` with typed errors, auto content-type detection, and optional DI for base config.

**Architecture:** New `src/fetch/` module with four files: HttpError ADT, request/response types, Http companion object, and HttpClient DI tag. Built on `IO.tryAsync` for lazy execution with AbortSignal support. Uses Companion pattern for `Http.get/post/put/patch/delete/request` API.

**Tech Stack:** TypeScript, functype IO, Vitest

---

### Task 1: HttpError ADT

**Files:**

- Create: `src/fetch/HttpError.ts`
- Test: `test/fetch/http-error.spec.ts`

- [ ] **Step 1: Write failing tests for HttpError constructors and type guards**

```typescript
// test/fetch/http-error.spec.ts
import { describe, expect, it } from "vitest"

import { HttpError } from "@/fetch/HttpError"

describe("HttpError", () => {
  describe("constructors", () => {
    it("should create a NetworkError", () => {
      const error = HttpError.networkError("https://api.test/users", "GET", new Error("DNS failure"))
      expect(error._tag).toBe("NetworkError")
      expect(error.url).toBe("https://api.test/users")
      expect(error.method).toBe("GET")
      expect(error.cause).toBeInstanceOf(Error)
    })

    it("should create an HttpStatusError", () => {
      const error = HttpError.httpStatusError("https://api.test/users", "POST", 404, "Not Found", '{"error":"missing"}')
      expect(error._tag).toBe("HttpStatusError")
      expect(error.status).toBe(404)
      expect(error.statusText).toBe("Not Found")
      expect(error.body).toBe('{"error":"missing"}')
    })

    it("should create a DecodeError", () => {
      const error = HttpError.decodeError(
        "https://api.test/users",
        "GET",
        "not json",
        new SyntaxError("Unexpected token"),
      )
      expect(error._tag).toBe("DecodeError")
      expect(error.body).toBe("not json")
      expect(error.cause).toBeInstanceOf(SyntaxError)
    })
  })

  describe("type guards", () => {
    it("isNetworkError should narrow type", () => {
      const error: HttpError = HttpError.networkError("https://api.test", "GET", new Error("fail"))
      expect(HttpError.isNetworkError(error)).toBe(true)
      expect(HttpError.isHttpStatusError(error)).toBe(false)
      expect(HttpError.isDecodeError(error)).toBe(false)
    })

    it("isHttpStatusError should narrow type", () => {
      const error: HttpError = HttpError.httpStatusError("https://api.test", "GET", 500, "Internal", "")
      expect(HttpError.isHttpStatusError(error)).toBe(true)
      expect(HttpError.isNetworkError(error)).toBe(false)
    })

    it("isDecodeError should narrow type", () => {
      const error: HttpError = HttpError.decodeError("https://api.test", "GET", "bad", new Error("parse"))
      expect(HttpError.isDecodeError(error)).toBe(true)
      expect(HttpError.isNetworkError(error)).toBe(false)
    })
  })

  describe("match", () => {
    it("should exhaustively match NetworkError", () => {
      const error: HttpError = HttpError.networkError("https://api.test", "GET", new Error("offline"))
      const result = HttpError.match(error, {
        NetworkError: (e) => `network: ${(e.cause as Error).message}`,
        HttpStatusError: (e) => `status: ${e.status}`,
        DecodeError: (e) => `decode: ${e.body}`,
      })
      expect(result).toBe("network: offline")
    })

    it("should exhaustively match HttpStatusError", () => {
      const error: HttpError = HttpError.httpStatusError("https://api.test", "POST", 401, "Unauthorized", "")
      const result = HttpError.match(error, {
        NetworkError: () => "network",
        HttpStatusError: (e) => `status: ${e.status}`,
        DecodeError: () => "decode",
      })
      expect(result).toBe("status: 401")
    })

    it("should exhaustively match DecodeError", () => {
      const error: HttpError = HttpError.decodeError("https://api.test", "GET", "<html>", new Error("not json"))
      const result = HttpError.match(error, {
        NetworkError: () => "network",
        HttpStatusError: () => "status",
        DecodeError: (e) => `decode: ${e.body}`,
      })
      expect(result).toBe("decode: <html>")
    })
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm vitest run test/fetch/http-error.spec.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Implement HttpError ADT**

```typescript
// src/fetch/HttpError.ts
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
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm vitest run test/fetch/http-error.spec.ts`
Expected: PASS — all 8 tests green

- [ ] **Step 5: Commit**

```bash
git add src/fetch/HttpError.ts test/fetch/http-error.spec.ts
git commit -m "feat(fetch): add HttpError ADT with constructors, type guards, and match"
```

---

### Task 2: Request/Response Types + HttpClient Tag

**Files:**

- Create: `src/fetch/HttpRequest.ts`
- Create: `src/fetch/HttpClient.ts`

- [ ] **Step 1: Create HttpRequest types**

```typescript
// src/fetch/HttpRequest.ts
import type { HttpMethod } from "./HttpError"

export type ParseMode = "json" | "text" | "blob" | "arrayBuffer" | "raw"

export interface HttpRequestOptions {
  readonly url: string
  readonly method: HttpMethod
  readonly headers?: Record<string, string>
  readonly body?: unknown
  readonly signal?: AbortSignal
  readonly parseAs?: ParseMode
}

export interface HttpMethodOptions {
  readonly headers?: Record<string, string>
  readonly body?: unknown
  readonly signal?: AbortSignal
  readonly parseAs?: ParseMode
}

export interface HttpResponse<T> {
  readonly data: T
  readonly status: number
  readonly statusText: string
  readonly headers: Headers
}
```

- [ ] **Step 2: Create HttpClient tag**

```typescript
// src/fetch/HttpClient.ts
import { Tag } from "@/io/Tag"

export interface HttpClientConfig {
  readonly baseUrl?: string
  readonly defaultHeaders?: Record<string, string>
  readonly fetch?: typeof globalThis.fetch
}

export const HttpClient = Tag<HttpClientConfig>("HttpClient")

export const defaultHttpClientConfig: HttpClientConfig = {}
```

- [ ] **Step 3: Compile check**

Run: `pnpm compile`
Expected: No type errors

- [ ] **Step 4: Commit**

```bash
git add src/fetch/HttpRequest.ts src/fetch/HttpClient.ts
git commit -m "feat(fetch): add request/response types and HttpClient DI tag"
```

---

### Task 3: Http Companion — Core Implementation

**Files:**

- Create: `src/fetch/Http.ts`
- Test: `test/fetch/http.spec.ts`

- [ ] **Step 1: Write failing test for Http.get with JSON response**

```typescript
// test/fetch/http.spec.ts
import { describe, expect, it, vi } from "vitest"

import { HttpClient } from "@/fetch/HttpClient"
import { Http } from "@/fetch/Http"

const mockFetch = (response: {
  status: number
  statusText: string
  headers?: Record<string, string>
  body?: unknown
}) =>
  vi.fn<typeof globalThis.fetch>().mockResolvedValue(
    new Response(typeof response.body === "string" ? response.body : JSON.stringify(response.body), {
      status: response.status,
      statusText: response.statusText,
      headers: { "content-type": "application/json", ...response.headers },
    }),
  )

const withMockFetch =
  (fetch: ReturnType<typeof mockFetch>) =>
  <R, E, A>(io: ReturnType<typeof Http.get<A>>) =>
    io.provideService(HttpClient, { fetch: fetch as unknown as typeof globalThis.fetch })

describe("Http", () => {
  describe("Http.get", () => {
    it("should GET and parse JSON response", async () => {
      const fetch = mockFetch({ status: 200, statusText: "OK", body: { id: 1, name: "Alice" } })
      const result = await Http.get<{ id: number; name: string }>("https://api.test/users/1")
        .provideService(HttpClient, { fetch: fetch as unknown as typeof globalThis.fetch })
        .runOrThrow()

      expect(result.data).toEqual({ id: 1, name: "Alice" })
      expect(result.status).toBe(200)
      expect(result.statusText).toBe("OK")
      expect(fetch).toHaveBeenCalledWith("https://api.test/users/1", expect.objectContaining({ method: "GET" }))
    })
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run test/fetch/http.spec.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Implement Http companion**

```typescript
// src/fetch/Http.ts
import { Companion } from "@/companion/Companion"
import { IO } from "@/io/IO"

import { defaultHttpClientConfig, HttpClient } from "./HttpClient"
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

const serializeBody = (body: unknown): { serialized: BodyInit | undefined; contentType: string | undefined } => {
  if (body === undefined || body === null) return { serialized: undefined, contentType: undefined }
  if (
    typeof body === "string" ||
    body instanceof FormData ||
    body instanceof Blob ||
    body instanceof ArrayBuffer ||
    body instanceof URLSearchParams
  ) {
    return { serialized: body as BodyInit, contentType: undefined }
  }
  return { serialized: JSON.stringify(body), contentType: "application/json" }
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
        throw { _tag: "DecodeError" as const, url, method, body: text, cause }
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

const request = <T>(options: HttpRequestOptions): IO<never, HttpError, HttpResponse<T>> => {
  return IO.service(HttpClient)
    .recover(defaultHttpClientConfig)
    .flatMap((config) => {
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
    }) as IO<never, HttpError, HttpResponse<T>>
}

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

const HttpCompanion = {
  request,
  get,
  post,
  put,
  patch,
  delete: del,
  head,
  options: optionsMethod,
}

export const Http = Companion({} as { readonly _tag: "Http" }, HttpCompanion)
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm vitest run test/fetch/http.spec.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/fetch/Http.ts test/fetch/http.spec.ts
git commit -m "feat(fetch): implement Http companion with GET and IO integration"
```

---

### Task 4: Full Test Coverage

**Files:**

- Modify: `test/fetch/http.spec.ts`

- [ ] **Step 1: Add tests for POST, PUT, PATCH, DELETE**

Add to `test/fetch/http.spec.ts` inside the `describe("Http", ...)` block:

```typescript
describe("Http.post", () => {
  it("should POST with JSON body", async () => {
    const fetch = mockFetch({ status: 201, statusText: "Created", body: { id: 2, name: "Bob" } })
    const result = await Http.post<{ id: number; name: string }>("https://api.test/users", {
      body: { name: "Bob" },
    })
      .provideService(HttpClient, { fetch: fetch as unknown as typeof globalThis.fetch })
      .runOrThrow()

    expect(result.data).toEqual({ id: 2, name: "Bob" })
    expect(result.status).toBe(201)
    expect(fetch).toHaveBeenCalledWith(
      "https://api.test/users",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ name: "Bob" }),
        headers: expect.objectContaining({ "Content-Type": "application/json" }),
      }),
    )
  })
})

describe("Http.put", () => {
  it("should PUT with JSON body", async () => {
    const fetch = mockFetch({ status: 200, statusText: "OK", body: { id: 1, name: "Updated" } })
    const result = await Http.put<{ id: number; name: string }>("https://api.test/users/1", {
      body: { name: "Updated" },
    })
      .provideService(HttpClient, { fetch: fetch as unknown as typeof globalThis.fetch })
      .runOrThrow()

    expect(result.data).toEqual({ id: 1, name: "Updated" })
    expect(fetch).toHaveBeenCalledWith("https://api.test/users/1", expect.objectContaining({ method: "PUT" }))
  })
})

describe("Http.patch", () => {
  it("should PATCH with partial body", async () => {
    const fetch = mockFetch({ status: 200, statusText: "OK", body: { id: 1, name: "Patched" } })
    const result = await Http.patch<{ id: number; name: string }>("https://api.test/users/1", {
      body: { name: "Patched" },
    })
      .provideService(HttpClient, { fetch: fetch as unknown as typeof globalThis.fetch })
      .runOrThrow()

    expect(result.data).toEqual({ id: 1, name: "Patched" })
    expect(fetch).toHaveBeenCalledWith("https://api.test/users/1", expect.objectContaining({ method: "PATCH" }))
  })
})

describe("Http.delete", () => {
  it("should DELETE", async () => {
    const fetch = mockFetch({
      status: 204,
      statusText: "No Content",
      body: "",
      headers: { "content-type": "text/plain" },
    })
    const result = await Http.delete<string>("https://api.test/users/1")
      .provideService(HttpClient, { fetch: fetch as unknown as typeof globalThis.fetch })
      .runOrThrow()

    expect(result.status).toBe(204)
    expect(fetch).toHaveBeenCalledWith("https://api.test/users/1", expect.objectContaining({ method: "DELETE" }))
  })
})
```

- [ ] **Step 2: Run tests**

Run: `pnpm vitest run test/fetch/http.spec.ts`
Expected: PASS — all method tests green

- [ ] **Step 3: Add error handling tests**

Add to `test/fetch/http.spec.ts`:

```typescript
describe("error handling", () => {
  it("should return HttpStatusError for non-2xx response", async () => {
    const fetch = mockFetch({ status: 404, statusText: "Not Found", body: '{"error":"not found"}' })
    const result = await Http.get("https://api.test/users/999")
      .provideService(HttpClient, { fetch: fetch as unknown as typeof globalThis.fetch })
      .run()

    expect(result.isLeft()).toBe(true)
    const error = result.fold(
      (e) => e,
      () => null,
    )
    expect(error?._tag).toBe("HttpStatusError")
    if (error?._tag === "HttpStatusError") {
      expect(error.status).toBe(404)
      expect(error.statusText).toBe("Not Found")
    }
  })

  it("should return NetworkError for fetch failure", async () => {
    const fetch = vi.fn<typeof globalThis.fetch>().mockRejectedValue(new TypeError("Failed to fetch"))
    const result = await Http.get("https://api.test/down")
      .provideService(HttpClient, { fetch: fetch as unknown as typeof globalThis.fetch })
      .run()

    expect(result.isLeft()).toBe(true)
    const error = result.fold(
      (e) => e,
      () => null,
    )
    expect(error?._tag).toBe("NetworkError")
  })

  it("should return DecodeError for invalid JSON", async () => {
    const fetch = vi.fn<typeof globalThis.fetch>().mockResolvedValue(
      new Response("not valid json", {
        status: 200,
        statusText: "OK",
        headers: { "content-type": "application/json" },
      }),
    )
    const result = await Http.get("https://api.test/bad-json")
      .provideService(HttpClient, { fetch: fetch as unknown as typeof globalThis.fetch })
      .run()

    expect(result.isLeft()).toBe(true)
    const error = result.fold(
      (e) => e,
      () => null,
    )
    expect(error?._tag).toBe("DecodeError")
    if (error?._tag === "DecodeError") {
      expect(error.body).toBe("not valid json")
    }
  })

  it("should work with catchTag for selective error recovery", async () => {
    const fetch = mockFetch({ status: 404, statusText: "Not Found", body: "{}" })
    const result = await Http.get<{ id: number }>("https://api.test/users/999")
      .catchTag("HttpStatusError", (e) =>
        e.status === 404
          ? IO.succeed({ data: { id: 0 }, status: 200, statusText: "OK", headers: new Headers() })
          : IO.fail(e),
      )
      .provideService(HttpClient, { fetch: fetch as unknown as typeof globalThis.fetch })
      .runOrThrow()

    expect(result.data).toEqual({ id: 0 })
  })
})
```

- [ ] **Step 4: Run tests**

Run: `pnpm vitest run test/fetch/http.spec.ts`
Expected: PASS

- [ ] **Step 5: Add content-type detection and DI tests**

Add to `test/fetch/http.spec.ts`:

```typescript
describe("content-type detection", () => {
  it("should parse as text for text/* content type", async () => {
    const fetch = vi.fn<typeof globalThis.fetch>().mockResolvedValue(
      new Response("hello world", {
        status: 200,
        statusText: "OK",
        headers: { "content-type": "text/plain" },
      }),
    )
    const result = await Http.get<string>("https://api.test/text")
      .provideService(HttpClient, { fetch: fetch as unknown as typeof globalThis.fetch })
      .runOrThrow()

    expect(result.data).toBe("hello world")
  })

  it("should respect parseAs override", async () => {
    const fetch = vi.fn<typeof globalThis.fetch>().mockResolvedValue(
      new Response('{"key":"value"}', {
        status: 200,
        statusText: "OK",
        headers: { "content-type": "application/json" },
      }),
    )
    const result = await Http.get<string>("https://api.test/as-text", { parseAs: "text" })
      .provideService(HttpClient, { fetch: fetch as unknown as typeof globalThis.fetch })
      .runOrThrow()

    expect(result.data).toBe('{"key":"value"}')
  })
})

describe("HttpClient DI", () => {
  it("should prepend baseUrl", async () => {
    const fetch = mockFetch({ status: 200, statusText: "OK", body: { ok: true } })
    await Http.get("/users")
      .provideService(HttpClient, {
        baseUrl: "https://api.test",
        fetch: fetch as unknown as typeof globalThis.fetch,
      })
      .runOrThrow()

    expect(fetch).toHaveBeenCalledWith("https://api.test/users", expect.anything())
  })

  it("should merge defaultHeaders", async () => {
    const fetch = mockFetch({ status: 200, statusText: "OK", body: {} })
    await Http.get("/users", { headers: { "X-Custom": "value" } })
      .provideService(HttpClient, {
        defaultHeaders: { Authorization: "Bearer token123" },
        fetch: fetch as unknown as typeof globalThis.fetch,
      })
      .runOrThrow()

    expect(fetch).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: "Bearer token123",
          "X-Custom": "value",
        }),
      }),
    )
  })

  it("should not modify absolute URLs when baseUrl is set", async () => {
    const fetch = mockFetch({ status: 200, statusText: "OK", body: {} })
    await Http.get("https://other.test/data")
      .provideService(HttpClient, {
        baseUrl: "https://api.test",
        fetch: fetch as unknown as typeof globalThis.fetch,
      })
      .runOrThrow()

    expect(fetch).toHaveBeenCalledWith("https://other.test/data", expect.anything())
  })
})

describe("body serialization", () => {
  it("should auto-serialize object body to JSON", async () => {
    const fetch = mockFetch({ status: 200, statusText: "OK", body: {} })
    await Http.post("https://api.test/data", { body: { key: "value" } })
      .provideService(HttpClient, { fetch: fetch as unknown as typeof globalThis.fetch })
      .runOrThrow()

    expect(fetch).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        body: '{"key":"value"}',
        headers: expect.objectContaining({ "Content-Type": "application/json" }),
      }),
    )
  })

  it("should pass string body through without serialization", async () => {
    const fetch = mockFetch({ status: 200, statusText: "OK", body: {}, headers: { "content-type": "text/plain" } })
    await Http.post("https://api.test/data", { body: "raw string" })
      .provideService(HttpClient, { fetch: fetch as unknown as typeof globalThis.fetch })
      .runOrThrow()

    expect(fetch).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ body: "raw string" }))
  })
})

describe("IO composition", () => {
  it("should compose with map", async () => {
    const fetch = mockFetch({ status: 200, statusText: "OK", body: [{ id: 1 }, { id: 2 }] })
    const result = await Http.get<Array<{ id: number }>>("https://api.test/users")
      .map((res) => res.data.length)
      .provideService(HttpClient, { fetch: fetch as unknown as typeof globalThis.fetch })
      .runOrThrow()

    expect(result).toBe(2)
  })
})
```

- [ ] **Step 6: Run tests**

Run: `pnpm vitest run test/fetch/http.spec.ts`
Expected: PASS — all tests green

- [ ] **Step 7: Commit**

```bash
git add test/fetch/http.spec.ts
git commit -m "test(fetch): add comprehensive tests for Http methods, errors, DI, and parsing"
```

---

### Task 5: Module Exports and Package Integration

**Files:**

- Create: `src/fetch/index.ts`
- Modify: `src/index.ts`
- Modify: `package.json`

- [ ] **Step 1: Create fetch index.ts**

```typescript
// src/fetch/index.ts
export type { HttpClientConfig } from "./HttpClient"
export { HttpClient } from "./HttpClient"
export { Http } from "./Http"
export type { HttpError, HttpMethod, HttpStatusError, NetworkError, DecodeError } from "./HttpError"
export { HttpError as HttpErrors } from "./HttpError"
export type { HttpMethodOptions, HttpRequestOptions, HttpResponse, ParseMode } from "./HttpRequest"
```

- [ ] **Step 2: Add export to src/index.ts**

Add to the end of `src/index.ts`:

```typescript
export * from "@/fetch"
```

- [ ] **Step 3: Add package.json export**

Add to the `exports` field in `package.json` (after the `"./util"` entry):

```json
    "./fetch": {
      "types": "./dist/fetch/index.d.ts",
      "import": "./dist/fetch/index.js",
      "default": "./dist/fetch/index.js"
    }
```

- [ ] **Step 4: Run full validation**

Run: `pnpm validate`
Expected: PASS — format, lint, all tests, and build succeed

- [ ] **Step 5: Commit**

```bash
git add src/fetch/index.ts src/index.ts package.json
git commit -m "feat(fetch): add module exports and package integration"
```

---

### Task 6: Final Validation

- [ ] **Step 1: Run full validation**

Run: `pnpm validate`
Expected: PASS — all checks green

- [ ] **Step 2: Run compile check**

Run: `pnpm compile`
Expected: No type errors

- [ ] **Step 3: Run all tests with coverage**

Run: `pnpm test:coverage`
Expected: fetch module tests pass with good coverage

- [ ] **Step 4: Verify import paths work**

Create a temporary test to verify the package export:

Run: `pnpm vitest run test/fetch/`
Expected: All fetch tests pass
