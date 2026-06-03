import { describe, expect, it, vi } from "vitest"

import { Decoder } from "@/decoder"
import { Right } from "@/either/Either"
import { Http } from "@/fetch/Http"
import { HttpError } from "@/fetch/HttpError"
import { IO } from "@/io"

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

const calledUrl = (fetch: ReturnType<typeof mockFetch>): string => {
  const call = fetch.mock.calls[0]
  if (!call) throw new Error("fetch was not called")
  return String(call[0])
}

describe("Http — query params", () => {
  it("appends simple scalar params as a query string", async () => {
    const fetch = mockFetch({ status: 200, statusText: "OK", body: {} })
    const http = Http.client({ fetch: fetch as unknown as typeof globalThis.fetch })
    await http.get("https://api.test/search", { params: { a: 1, b: "hello", active: true } }).runOrThrow()

    const url = calledUrl(fetch)
    expect(url.startsWith("https://api.test/search?")).toBe(true)
    const search = new URL(url).searchParams
    expect(search.get("a")).toBe("1")
    expect(search.get("b")).toBe("hello")
    expect(search.get("active")).toBe("true")
  })

  it("repeats the key for array values", async () => {
    const fetch = mockFetch({ status: 200, statusText: "OK", body: {} })
    const http = Http.client({ fetch: fetch as unknown as typeof globalThis.fetch })
    await http.get("https://api.test/items", { params: { tag: ["x", "y", "z"] } }).runOrThrow()

    const search = new URL(calledUrl(fetch)).searchParams
    expect(search.getAll("tag")).toEqual(["x", "y", "z"])
  })

  it("drops undefined and null values", async () => {
    const fetch = mockFetch({ status: 200, statusText: "OK", body: {} })
    const http = Http.client({ fetch: fetch as unknown as typeof globalThis.fetch })
    await http.get("https://api.test/search", { params: { keep: "yes", missing: undefined, gone: null } }).runOrThrow()

    const search = new URL(calledUrl(fetch)).searchParams
    expect(search.get("keep")).toBe("yes")
    expect(search.has("missing")).toBe(false)
    expect(search.has("gone")).toBe(false)
  })

  it("percent-encodes special characters", async () => {
    const fetch = mockFetch({ status: 200, statusText: "OK", body: {} })
    const http = Http.client({ fetch: fetch as unknown as typeof globalThis.fetch })
    await http.get("https://api.test/search", { params: { q: "a b&c" } }).runOrThrow()

    const url = calledUrl(fetch)
    expect(url).toContain("q=a+b%26c")
    expect(new URL(url).searchParams.get("q")).toBe("a b&c")
  })

  it("merges with an existing query string in the URL", async () => {
    const fetch = mockFetch({ status: 200, statusText: "OK", body: {} })
    const http = Http.client({ fetch: fetch as unknown as typeof globalThis.fetch })
    await http.get("https://api.test/search?existing=1", { params: { added: "2" } }).runOrThrow()

    const search = new URL(calledUrl(fetch)).searchParams
    expect(search.get("existing")).toBe("1")
    expect(search.get("added")).toBe("2")
  })

  it("composes with baseUrl from the client config", async () => {
    const fetch = mockFetch({ status: 200, statusText: "OK", body: {} })
    const http = Http.client({
      baseUrl: "https://api.test",
      fetch: fetch as unknown as typeof globalThis.fetch,
    })
    await http.get("/users", { params: { page: 2 } }).runOrThrow()

    const url = calledUrl(fetch)
    expect(url).toBe("https://api.test/users?page=2")
  })
})

describe("Http — afterResponse hook", () => {
  it("runs on 2xx response and sees the parsed body", async () => {
    const fetch = mockFetch({ status: 200, statusText: "OK", body: { id: 1, name: "Alice" } })
    const seen: unknown[] = []
    const http = Http.client({
      fetch: fetch as unknown as typeof globalThis.fetch,
      afterResponse: (response) =>
        IO.sync(() => {
          seen.push(response.data)
          return response
        }),
    })

    const result = await http.get("https://api.test/users/1").runOrThrow()
    expect(seen).toEqual([{ id: 1, name: "Alice" }])
    expect(result.data).toEqual({ id: 1, name: "Alice" })
  })

  it("can transform the response (e.g. add a trace header marker on data)", async () => {
    const fetch = mockFetch({ status: 200, statusText: "OK", body: { value: 1 } })
    const http = Http.client({
      fetch: fetch as unknown as typeof globalThis.fetch,
      afterResponse: (response) =>
        IO.succeed({
          ...response,
          data: { ...(response.data as Record<string, unknown>), traced: true },
        }),
    })

    const result = await http.get("https://api.test/x").runOrThrow()
    expect(result.data).toEqual({ value: 1, traced: true })
  })

  it("short-circuits the call when the hook returns IO.fail", async () => {
    const fetch = mockFetch({ status: 200, statusText: "OK", body: { ok: true } })
    const http = Http.client({
      fetch: fetch as unknown as typeof globalThis.fetch,
      afterResponse: () => IO.fail(HttpError.networkError("https://api.test/x", "GET", new Error("rejected by hook"))),
    })

    await expect(http.get("https://api.test/x").runOrThrow()).rejects.toMatchObject({ _tag: "NetworkError" })
  })

  it("is skipped on HttpStatusError (4xx/5xx)", async () => {
    const fetch = mockFetch({ status: 404, statusText: "Not Found", body: { error: "missing" } })
    const hookSpy = vi.fn((response: unknown) => IO.succeed(response))
    const http = Http.client({
      fetch: fetch as unknown as typeof globalThis.fetch,
      afterResponse: hookSpy as never,
    })

    await expect(http.get("https://api.test/missing").runOrThrow()).rejects.toMatchObject({
      _tag: "HttpStatusError",
      status: 404,
    })
    expect(hookSpy).not.toHaveBeenCalled()
  })

  it("is skipped on DecodeError", async () => {
    const fetch = mockFetch({ status: 200, statusText: "OK", body: { id: "not-a-number" } })
    const hookSpy = vi.fn((response: unknown) => IO.succeed(response))
    const http = Http.client({
      fetch: fetch as unknown as typeof globalThis.fetch,
      afterResponse: hookSpy as never,
    })

    await expect(
      http
        .get("https://api.test/users/1", {
          decode: Decoder.object({ id: Decoder.number }),
        })
        .runOrThrow(),
    ).rejects.toMatchObject({ _tag: "DecodeError" })
    expect(hookSpy).not.toHaveBeenCalled()
  })

  it("supports the documented refresh-on-401 pattern via catchTag (not afterResponse)", async () => {
    let attempt = 0
    const fetch = vi.fn<typeof globalThis.fetch>().mockImplementation(async (input) => {
      attempt++
      const headers = new Headers({ "content-type": "application/json" })
      if (attempt === 1) {
        return new Response(JSON.stringify({ error: "unauthorized" }), {
          status: 401,
          statusText: "Unauthorized",
          headers,
        })
      }
      return new Response(JSON.stringify({ id: 1, token: input.toString() }), {
        status: 200,
        statusText: "OK",
        headers,
      })
    })

    const http = Http.client({ fetch: fetch as unknown as typeof globalThis.fetch })
    const refreshToken = (): IO<never, never, string> => IO.succeed("refreshed-token")

    const result = await http
      .get("https://api.test/me", { decode: (raw) => Right(raw as { id: number }) })
      .catchTag("HttpStatusError", (e) =>
        e.status === 401 ? refreshToken().flatMap(() => http.get("https://api.test/me")) : IO.fail(e),
      )
      .runOrThrow()

    expect(attempt).toBe(2)
    expect((result.data as { id: number }).id).toBe(1)
  })
})

describe("Http — AbortSignal cancellation", () => {
  it("surfaces NetworkError when the signal is aborted mid-flight", async () => {
    const fetch = vi.fn<typeof globalThis.fetch>().mockImplementation(
      (_input, init) =>
        new Promise<Response>((_resolve, reject) => {
          const signal = init?.signal
          if (signal) {
            const onAbort = (): void => reject(new DOMException("aborted", "AbortError"))
            if (signal.aborted) onAbort()
            else signal.addEventListener("abort", onAbort, { once: true })
          }
        }),
    )

    const controller = new AbortController()
    const http = Http.client({ fetch: fetch as unknown as typeof globalThis.fetch })
    const promise = http.get("https://api.test/slow", { signal: controller.signal }).runOrThrow()

    // Abort on the next microtask, after fetch has been invoked.
    queueMicrotask(() => controller.abort())

    await expect(promise).rejects.toMatchObject({ _tag: "NetworkError" })
  })

  it("honors a per-call signal alongside the IO-internal signal", async () => {
    const seenSignals: AbortSignal[] = []
    const fetch = vi.fn<typeof globalThis.fetch>().mockImplementation((_input, init) => {
      if (init?.signal) seenSignals.push(init.signal)
      return Promise.resolve(
        new Response("{}", { status: 200, statusText: "OK", headers: { "content-type": "application/json" } }),
      )
    })

    const controller = new AbortController()
    const http = Http.client({ fetch: fetch as unknown as typeof globalThis.fetch })
    await http.get("https://api.test/x", { signal: controller.signal }).runOrThrow()

    expect(seenSignals.length).toBe(1)
    expect(seenSignals[0]).toBe(controller.signal)
  })
})

describe("Http — HttpStatusError classification (4xx vs 5xx)", () => {
  it("surfaces 404 with status:404 and the original statusText", async () => {
    const fetch = mockFetch({
      status: 404,
      statusText: "Not Found",
      body: { error: "missing" },
    })
    const http = Http.client({ fetch: fetch as unknown as typeof globalThis.fetch })

    await expect(http.get("https://api.test/missing").runOrThrow()).rejects.toMatchObject({
      _tag: "HttpStatusError",
      status: 404,
      statusText: "Not Found",
    })
  })

  it("surfaces 503 with status:503 and supports retry-only-on-5xx via catchTag", async () => {
    let attempts = 0
    const fetch = vi.fn<typeof globalThis.fetch>().mockImplementation(() => {
      attempts++
      return Promise.resolve(
        new Response(JSON.stringify({ error: "down" }), {
          status: 503,
          statusText: "Service Unavailable",
          headers: { "content-type": "application/json" },
        }),
      )
    })

    const http = Http.client({ fetch: fetch as unknown as typeof globalThis.fetch })

    await expect(
      http
        .get("https://api.test/x")
        .retryWhile({
          n: 2,
          while: (e) => e._tag === "HttpStatusError" && e.status >= 500,
        })
        .runOrThrow(),
    ).rejects.toMatchObject({ _tag: "HttpStatusError", status: 503 })
    expect(attempts).toBe(3) // 1 initial + 2 retries on 5xx
  })

  it("does NOT retry on 4xx with the same predicate", async () => {
    let attempts = 0
    const fetch = vi.fn<typeof globalThis.fetch>().mockImplementation(() => {
      attempts++
      return Promise.resolve(
        new Response(JSON.stringify({ error: "bad" }), {
          status: 400,
          statusText: "Bad Request",
          headers: { "content-type": "application/json" },
        }),
      )
    })

    const http = Http.client({ fetch: fetch as unknown as typeof globalThis.fetch })

    await expect(
      http
        .get("https://api.test/x")
        .retryWhile({
          n: 2,
          while: (e) => e._tag === "HttpStatusError" && e.status >= 500,
        })
        .runOrThrow(),
    ).rejects.toMatchObject({ _tag: "HttpStatusError", status: 400 })
    expect(attempts).toBe(1)
  })
})
