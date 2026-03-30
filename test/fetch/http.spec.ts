import { describe, expect, it, vi } from "vitest"

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
})
