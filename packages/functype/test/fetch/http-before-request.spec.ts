import { describe, expect, it, vi } from "vitest"

import { Http } from "@/fetch/Http"
import { HttpError } from "@/fetch/HttpError"
import type { HttpRequestView } from "@/fetch/HttpRequest"
import { IO } from "@/io"

/**
 * Tests for the `beforeRequest` transformer on `HttpClientConfig` — the
 * effectful request-side hook that closes the symmetry with the response
 * chain (`.tap`/`.map`/`.catchTag`) noted in issue #154.
 */

const mockFetch = (response: { status: number; statusText: string; body: unknown }) =>
  vi.fn<typeof globalThis.fetch>().mockResolvedValue(
    new Response(JSON.stringify(response.body), {
      status: response.status,
      statusText: response.statusText,
      headers: { "content-type": "application/json" },
    }),
  )

const addRequestId =
  (id: string) =>
  (r: HttpRequestView): HttpRequestView => ({
    ...r,
    headers: { ...r.headers, "x-request-id": id },
  })

describe("Http.client beforeRequest", () => {
  it("transforms headers via a sync IO.map step", async () => {
    const fetch = mockFetch({ status: 200, statusText: "OK", body: { ok: true } })
    const http = Http.client({
      fetch: fetch as unknown as typeof globalThis.fetch,
      beforeRequest: (r) => IO.succeed(r).map(addRequestId("rid-123")),
    })

    await http.get("https://api.test/x").runOrThrow()

    expect(fetch).toHaveBeenCalledWith(
      "https://api.test/x",
      expect.objectContaining({
        headers: expect.objectContaining({ "x-request-id": "rid-123" }),
      }),
    )
  })

  it("supports async transforms via IO.tryPromise (bearer-refresh shape)", async () => {
    const fetch = mockFetch({ status: 200, statusText: "OK", body: {} })
    const getToken = vi.fn().mockResolvedValue("token-abc")

    const http = Http.client({
      fetch: fetch as unknown as typeof globalThis.fetch,
      beforeRequest: (r) =>
        IO.tryPromise({
          try: () => getToken(),
          catch: (e) => HttpError.networkError(r.url, r.method, e),
        }).map((token) => ({
          ...r,
          headers: { ...r.headers, Authorization: `Bearer ${token}` },
        })),
    })

    await http.get("https://api.test/x").runOrThrow()

    expect(getToken).toHaveBeenCalledOnce()
    expect(fetch).toHaveBeenCalledWith(
      "https://api.test/x",
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: "Bearer token-abc" }),
      }),
    )
  })

  it("short-circuits the request when the transformer fails", async () => {
    const fetch = vi.fn<typeof globalThis.fetch>()
    const http = Http.client({
      fetch: fetch as unknown as typeof globalThis.fetch,
      beforeRequest: (r) => IO.fail(HttpError.networkError(r.url, r.method, new Error("no token"))),
    })

    const exit = await http.get("https://api.test/x").runExit()

    expect(fetch).not.toHaveBeenCalled()
    expect(exit.isFailure()).toBe(true)
    const either = exit.toEither()
    expect(either.isLeft()).toBe(true)
    either.fold(
      (err) => expect(HttpError.isNetworkError(err)).toBe(true),
      () => {
        throw new Error("expected Left")
      },
    )
  })

  it("sees the assembled headers (defaultHeaders + per-call merge already applied)", async () => {
    const fetch = mockFetch({ status: 200, statusText: "OK", body: {} })
    const observed: HttpRequestView[] = []

    const http = Http.client({
      fetch: fetch as unknown as typeof globalThis.fetch,
      defaultHeaders: { "x-app": "civala", "x-default": "stays" },
      beforeRequest: (r) => {
        observed.push(r)
        return IO.succeed(r)
      },
    })

    await http.get("https://api.test/x", { headers: { "x-per-call": "yes", "x-default": "overridden" } }).runOrThrow()

    expect(observed).toHaveLength(1)
    expect(observed[0]?.headers).toEqual({
      "x-app": "civala",
      "x-default": "overridden",
      "x-per-call": "yes",
    })
  })

  it("composes multiple concerns via chained IO operators", async () => {
    const fetch = mockFetch({ status: 200, statusText: "OK", body: {} })
    const logged: string[] = []

    const http = Http.client({
      fetch: fetch as unknown as typeof globalThis.fetch,
      beforeRequest: (r) =>
        IO.succeed(r)
          .map(addRequestId("rid-1"))
          .map((req) => ({ ...req, headers: { ...req.headers, "x-extra": "yes" } }))
          .tap((req) => logged.push(`${req.method} ${req.url}`)),
    })

    await http.get("https://api.test/x").runOrThrow()

    expect(logged).toEqual(["GET https://api.test/x"])
    expect(fetch).toHaveBeenCalledWith(
      "https://api.test/x",
      expect.objectContaining({
        headers: expect.objectContaining({ "x-request-id": "rid-1", "x-extra": "yes" }),
      }),
    )
  })

  it("is a no-op when not configured", async () => {
    const fetch = mockFetch({ status: 200, statusText: "OK", body: { ok: true } })
    const http = Http.client({ fetch: fetch as unknown as typeof globalThis.fetch })

    await http.get("https://api.test/x").runOrThrow()

    expect(fetch).toHaveBeenCalledWith("https://api.test/x", expect.objectContaining({ method: "GET" }))
  })

  it("preserves Content-Type for serialized JSON bodies after the hook runs", async () => {
    const fetch = mockFetch({ status: 200, statusText: "OK", body: {} })
    const http = Http.client({
      fetch: fetch as unknown as typeof globalThis.fetch,
      beforeRequest: (r) => IO.succeed(addRequestId("rid")(r)),
    })

    await http.post("https://api.test/x", { body: { hello: "world" } }).runOrThrow()

    expect(fetch).toHaveBeenCalledWith(
      "https://api.test/x",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ hello: "world" }),
        headers: expect.objectContaining({
          "Content-Type": "application/json",
          "x-request-id": "rid",
        }),
      }),
    )
  })

  it("re-serializes when the hook swaps the body", async () => {
    const fetch = mockFetch({ status: 200, statusText: "OK", body: {} })
    const http = Http.client({
      fetch: fetch as unknown as typeof globalThis.fetch,
      beforeRequest: (r) =>
        IO.succeed({
          ...r,
          body: { wrapped: r.body },
        }),
    })

    await http.post("https://api.test/x", { body: { id: 1 } }).runOrThrow()

    expect(fetch).toHaveBeenCalledWith(
      "https://api.test/x",
      expect.objectContaining({
        body: JSON.stringify({ wrapped: { id: 1 } }),
      }),
    )
  })

  it("recalculates Content-Type when the hook swaps an object body for another object body", async () => {
    const fetch = mockFetch({ status: 200, statusText: "OK", body: {} })
    const http = Http.client({
      fetch: fetch as unknown as typeof globalThis.fetch,
      beforeRequest: (r) =>
        IO.succeed({
          ...r,
          body: { swapped: true },
        }),
    })

    await http.post("https://api.test/x", { body: { id: 1 } }).runOrThrow()

    expect(fetch).toHaveBeenCalledWith(
      "https://api.test/x",
      expect.objectContaining({
        body: JSON.stringify({ swapped: true }),
        headers: expect.objectContaining({ "Content-Type": "application/json" }),
      }),
    )
  })

  it("does not set Content-Type when the hook swaps an object body for a string body", async () => {
    const fetch = mockFetch({ status: 200, statusText: "OK", body: {} })
    const http = Http.client({
      fetch: fetch as unknown as typeof globalThis.fetch,
      beforeRequest: (r) =>
        IO.succeed({
          ...r,
          body: "raw=string&body=true",
        }),
    })

    await http.post("https://api.test/x", { body: { id: 1 } }).runOrThrow()

    const call = fetch.mock.calls[0]!
    const init = call[1] as RequestInit
    expect(init.body).toBe("raw=string&body=true")
    const headers = init.headers as Record<string, string>
    expect(headers["Content-Type"]).toBeUndefined()
  })
})
