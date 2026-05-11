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
