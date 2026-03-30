import { describe, expect, it, vi } from "vitest"

import { Http } from "@/fetch/Http"
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

describe("Http", () => {
  describe("Http.get", () => {
    it("should GET and parse JSON response", async () => {
      const fetch = mockFetch({ status: 200, statusText: "OK", body: { id: 1, name: "Alice" } })
      const http = Http.client({ fetch: fetch as unknown as typeof globalThis.fetch })
      const result = await http.get<{ id: number; name: string }>("https://api.test/users/1").runOrThrow()

      expect(result.data).toEqual({ id: 1, name: "Alice" })
      expect(result.status).toBe(200)
      expect(result.statusText).toBe("OK")
      expect(fetch).toHaveBeenCalledWith("https://api.test/users/1", expect.objectContaining({ method: "GET" }))
    })
  })

  describe("Http.post", () => {
    it("should POST with JSON body", async () => {
      const fetch = mockFetch({ status: 201, statusText: "Created", body: { id: 42 } })
      const http = Http.client({ fetch: fetch as unknown as typeof globalThis.fetch })
      const result = await http.post<{ id: number }>("https://api.test/users", { body: { name: "Bob" } }).runOrThrow()

      expect(result.data).toEqual({ id: 42 })
      expect(result.status).toBe(201)
      expect(result.statusText).toBe("Created")
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
      const http = Http.client({ fetch: fetch as unknown as typeof globalThis.fetch })
      const result = await http
        .put<{ id: number; name: string }>("https://api.test/users/1", { body: { name: "Updated" } })
        .runOrThrow()

      expect(result.data).toEqual({ id: 1, name: "Updated" })
      expect(result.status).toBe(200)
      expect(fetch).toHaveBeenCalledWith(
        "https://api.test/users/1",
        expect.objectContaining({
          method: "PUT",
          body: JSON.stringify({ name: "Updated" }),
        }),
      )
    })
  })

  describe("Http.patch", () => {
    it("should PATCH with partial body", async () => {
      const fetch = mockFetch({ status: 200, statusText: "OK", body: { id: 1, name: "Patched" } })
      const http = Http.client({ fetch: fetch as unknown as typeof globalThis.fetch })
      const result = await http
        .patch<{ id: number; name: string }>("https://api.test/users/1", { body: { name: "Patched" } })
        .runOrThrow()

      expect(result.data).toEqual({ id: 1, name: "Patched" })
      expect(fetch).toHaveBeenCalledWith(
        "https://api.test/users/1",
        expect.objectContaining({
          method: "PATCH",
          body: JSON.stringify({ name: "Patched" }),
        }),
      )
    })
  })

  describe("Http.delete", () => {
    it("should DELETE a resource", async () => {
      const fetch = mockFetch({ status: 200, statusText: "OK", body: { deleted: true } })
      const http = Http.client({ fetch: fetch as unknown as typeof globalThis.fetch })
      const result = await http.delete<{ deleted: boolean }>("https://api.test/users/1").runOrThrow()

      expect(result.data).toEqual({ deleted: true })
      expect(fetch).toHaveBeenCalledWith("https://api.test/users/1", expect.objectContaining({ method: "DELETE" }))
    })
  })

  describe("Error handling", () => {
    it("should return HttpStatusError for non-2xx status via run()", async () => {
      const mockFn = vi.fn<typeof globalThis.fetch>().mockResolvedValue(
        new Response("not found", {
          status: 404,
          statusText: "Not Found",
          headers: { "content-type": "application/json" },
        }),
      )
      const http = Http.client({ fetch: mockFn as unknown as typeof globalThis.fetch })
      const result = await http.get("https://api.test/missing").run()

      expect(result.isLeft()).toBe(true)
      result.fold(
        (error) => {
          expect(error._tag).toBe("HttpStatusError")
          if (error._tag === "HttpStatusError") {
            expect(error.status).toBe(404)
            expect(error.statusText).toBe("Not Found")
          }
        },
        () => {
          throw new Error("Expected Left")
        },
      )
    })

    it("should return NetworkError when fetch rejects", async () => {
      const mockFn = vi.fn<typeof globalThis.fetch>().mockRejectedValue(new TypeError("Failed to fetch"))
      const http = Http.client({ fetch: mockFn as unknown as typeof globalThis.fetch })
      const result = await http.get("https://api.test/down").run()

      expect(result.isLeft()).toBe(true)
      result.fold(
        (error) => {
          expect(error._tag).toBe("NetworkError")
          if (error._tag === "NetworkError") {
            expect(error.cause).toBeInstanceOf(TypeError)
          }
        },
        () => {
          throw new Error("Expected Left")
        },
      )
    })

    it("should return DecodeError for invalid JSON with application/json content-type", async () => {
      const mockFn = vi.fn<typeof globalThis.fetch>().mockResolvedValue(
        new Response("this is not json{{{", {
          status: 200,
          statusText: "OK",
          headers: { "content-type": "application/json" },
        }),
      )
      const http = Http.client({ fetch: mockFn as unknown as typeof globalThis.fetch })
      const result = await http.get("https://api.test/bad-json").run()

      expect(result.isLeft()).toBe(true)
      result.fold(
        (error) => {
          expect(error._tag).toBe("DecodeError")
          if (error._tag === "DecodeError") {
            expect(error.body).toBe("this is not json{{{")
          }
        },
        () => {
          throw new Error("Expected Left")
        },
      )
    })

    it("should support catchTag for selective error recovery", async () => {
      const mockFn = vi.fn<typeof globalThis.fetch>().mockResolvedValue(
        new Response("not found", {
          status: 404,
          statusText: "Not Found",
          headers: { "content-type": "application/json" },
        }),
      )
      const http = Http.client({ fetch: mockFn as unknown as typeof globalThis.fetch })
      const result = await http
        .get<string>("https://api.test/missing")
        .catchTag("HttpStatusError", (e) =>
          IO.succeed({ data: "recovered", status: e.status, statusText: e.statusText, headers: new Headers() }),
        )
        .runOrThrow()

      expect(result.data).toBe("recovered")
      expect(result.status).toBe(404)
    })
  })

  describe("Content-type detection", () => {
    it("should parse text/* content-type as text", async () => {
      const mockFn = vi.fn<typeof globalThis.fetch>().mockResolvedValue(
        new Response("Hello, World!", {
          status: 200,
          statusText: "OK",
          headers: { "content-type": "text/plain" },
        }),
      )
      const http = Http.client({ fetch: mockFn as unknown as typeof globalThis.fetch })
      const result = await http.get<string>("https://api.test/text").runOrThrow()

      expect(result.data).toBe("Hello, World!")
    })

    it("should respect parseAs override", async () => {
      const mockFn = vi.fn<typeof globalThis.fetch>().mockResolvedValue(
        new Response(JSON.stringify({ key: "value" }), {
          status: 200,
          statusText: "OK",
          headers: { "content-type": "application/json" },
        }),
      )
      const http = Http.client({ fetch: mockFn as unknown as typeof globalThis.fetch })
      const result = await http.get<string>("https://api.test/json-as-text", { parseAs: "text" }).runOrThrow()

      // With parseAs: "text", it should return raw text even though content-type is JSON
      expect(result.data).toBe(JSON.stringify({ key: "value" }))
    })
  })

  describe("Http.client() DI", () => {
    it("should prepend baseUrl to relative URLs", async () => {
      const fetch = mockFetch({ status: 200, statusText: "OK", body: { ok: true } })
      const http = Http.client({ fetch: fetch as unknown as typeof globalThis.fetch, baseUrl: "https://api.test" })
      await http.get("/users").runOrThrow()

      expect(fetch).toHaveBeenCalledWith("https://api.test/users", expect.anything())
    })

    it("should merge defaultHeaders with per-request headers", async () => {
      const fetch = mockFetch({ status: 200, statusText: "OK", body: {} })
      const http = Http.client({
        fetch: fetch as unknown as typeof globalThis.fetch,
        defaultHeaders: { Authorization: "Bearer token123" },
      })
      await http.get("/data", { headers: { "X-Custom": "value" } }).runOrThrow()

      expect(fetch).toHaveBeenCalledWith(
        "/data",
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
      const http = Http.client({ fetch: fetch as unknown as typeof globalThis.fetch, baseUrl: "https://api.test" })
      await http.get("https://other.api/resource").runOrThrow()

      expect(fetch).toHaveBeenCalledWith("https://other.api/resource", expect.anything())
    })
  })

  describe("Body serialization", () => {
    it("should JSON.stringify object body and set Content-Type", async () => {
      const fetch = mockFetch({ status: 200, statusText: "OK", body: {} })
      const http = Http.client({ fetch: fetch as unknown as typeof globalThis.fetch })
      await http.post("/data", { body: { key: "value" } }).runOrThrow()

      expect(fetch).toHaveBeenCalledWith(
        "/data",
        expect.objectContaining({
          body: JSON.stringify({ key: "value" }),
          headers: expect.objectContaining({ "Content-Type": "application/json" }),
        }),
      )
    })

    it("should pass string body through without serialization", async () => {
      const fetch = mockFetch({ status: 200, statusText: "OK", body: {} })
      const http = Http.client({ fetch: fetch as unknown as typeof globalThis.fetch })
      await http.post("/data", { body: "raw string body" }).runOrThrow()

      expect(fetch).toHaveBeenCalledWith(
        "/data",
        expect.objectContaining({
          body: "raw string body",
        }),
      )
      // String body should not set Content-Type automatically
      const callHeaders = (fetch as ReturnType<typeof vi.fn>).mock.calls[0]?.[1]?.headers as Record<string, string>
      expect(callHeaders["Content-Type"]).toBeUndefined()
    })
  })

  describe("IO composition", () => {
    it("should support .map() on the response", async () => {
      const fetch = mockFetch({ status: 200, statusText: "OK", body: [1, 2, 3, 4, 5] })
      const http = Http.client({ fetch: fetch as unknown as typeof globalThis.fetch })
      const length = await http
        .get<number[]>("https://api.test/items")
        .map((response) => response.data.length)
        .runOrThrow()

      expect(length).toBe(5)
    })
  })
})
