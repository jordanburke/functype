import { describe, expect, it } from "vitest"

import { formatIOError, IOQueryError, isIOQueryError } from "../../src/query/IOQueryError"

type NetworkError = { readonly _tag: "NetworkError"; readonly url: string; readonly cause: unknown }
type StatusError = {
  readonly _tag: "HttpStatusError"
  readonly url: string
  readonly status: number
  readonly statusText: string
}

describe("formatIOError", () => {
  it("uses the message of a real Error", () => {
    expect(formatIOError(new Error("boom"))).toBe("boom")
  })

  it("renders a status-shaped tagged error as an HTTP line", () => {
    const error: StatusError = {
      _tag: "HttpStatusError",
      url: "/api/limits",
      status: 403,
      statusText: "Forbidden",
    }
    expect(formatIOError(error)).toBe("HTTP 403 Forbidden — /api/limits")
  })

  it("omits an empty statusText", () => {
    expect(formatIOError({ _tag: "HttpStatusError", url: "/api/x", status: 500, statusText: "" })).toBe(
      "HTTP 500 — /api/x",
    )
  })

  it("renders a non-status tagged error as tag plus url", () => {
    const error: NetworkError = { _tag: "NetworkError", url: "/api/limits", cause: new Error("offline") }
    expect(formatIOError(error)).toBe("NetworkError — /api/limits")
  })

  it("renders a tagged error with no url as the bare tag", () => {
    expect(formatIOError({ _tag: "DecodeError" })).toBe("DecodeError")
  })

  it("falls back to String() for untagged primitives", () => {
    expect(formatIOError("plain string")).toBe("plain string")
    expect(formatIOError(42)).toBe("42")
    expect(formatIOError(null)).toBe("null")
  })

  it("renders an untagged plain object as JSON rather than [object Object]", () => {
    expect(formatIOError({ code: "E_LIMIT", retryable: false })).toBe('{"code":"E_LIMIT","retryable":false}')
  })

  it("falls back to String() when JSON serialization fails", () => {
    const cyclic: { self?: unknown } = {}
    cyclic.self = cyclic

    expect(formatIOError(cyclic)).toBe("[object Object]")
  })
})

describe("IOQueryError", () => {
  const error: StatusError = {
    _tag: "HttpStatusError",
    url: "/api/limits",
    status: 403,
    statusText: "Forbidden",
  }

  it("is a real Error instance — the footgun this whole module exists to fix", () => {
    const boxed = new IOQueryError(error)
    expect(boxed instanceof Error).toBe(true)
    expect(boxed.name).toBe("IOQueryError")
  })

  it("round-trips the raw typed error on .error", () => {
    const boxed = new IOQueryError(error)
    expect(boxed.error).toBe(error)
    expect(boxed.error._tag).toBe("HttpStatusError")
    expect(boxed.error.status).toBe(403)
  })

  it("derives a message from the boxed error by default", () => {
    expect(new IOQueryError(error).message).toBe("HTTP 403 Forbidden — /api/limits")
  })

  it("prefers an explicit message over the derived one", () => {
    expect(new IOQueryError(error, "you have hit your tier cap").message).toBe("you have hit your tier cap")
  })

  it("exposes the raw error as the native Error cause", () => {
    expect(new IOQueryError(error).cause).toBe(error)
  })

  it("defaults to defect: false, and records a defect when told to", () => {
    expect(new IOQueryError(error).defect).toBe(false)
    expect(new IOQueryError(new Error("boom"), undefined, true).defect).toBe(true)
  })
})

describe("isIOQueryError", () => {
  it("accepts boxed errors and rejects everything else", () => {
    expect(isIOQueryError(new IOQueryError({ _tag: "DecodeError" }))).toBe(true)
    expect(isIOQueryError(new Error("plain"))).toBe(false)
    expect(isIOQueryError({ _tag: "DecodeError" })).toBe(false)
    expect(isIOQueryError(undefined)).toBe(false)
  })
})
