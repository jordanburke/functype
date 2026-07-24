import { renderHook, waitFor } from "@testing-library/react"
import { Http, type HttpError, HttpErrors } from "functype/fetch"
import { IO } from "functype/io"
import { describe, expect, it, vi } from "vitest"

import { IOQueryError } from "../../src/query/IOQueryError"
import { useIOQuery } from "../../src/query/useIOQuery"
import { createWrapper } from "./harness"

type StatusError = {
  readonly _tag: "HttpStatusError"
  readonly url: string
  readonly status: number
  readonly statusText: string
}

const forbidden: StatusError = {
  _tag: "HttpStatusError",
  url: "/api/limits",
  status: 403,
  statusText: "Forbidden",
}

describe("useIOQuery", () => {
  it("populates data from a succeeding effect", async () => {
    const { result } = renderHook(() => useIOQuery(["limits"], () => IO.succeed({ seats: 5 })), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toEqual({ seats: 5 })
    expect(result.current.error).toBeNull()
  })

  it("populates error as a boxed, discriminable IOQueryError", async () => {
    const { result } = renderHook(
      () => useIOQuery<{ seats: number }, StatusError>(["limits"], () => IO.fail(forbidden)),
      { wrapper: createWrapper() },
    )

    await waitFor(() => expect(result.current.isError).toBe(true))

    const error = result.current.error
    expect(error).toBeInstanceOf(IOQueryError)
    expect(error).toBeInstanceOf(Error)
    expect(error?.error._tag).toBe("HttpStatusError")
    expect(error?.error.status).toBe(403)
  })

  it("honours a formatError override", async () => {
    const { result } = renderHook(
      () =>
        useIOQuery<number, StatusError>(["limits"], () => IO.fail(forbidden), {
          formatError: (e) => `tier cap (${e.status})`,
        }),
      { wrapper: createWrapper() },
    )

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(result.current.error?.message).toBe("tier cap (403)")
  })

  it("passes through enabled: false and never runs the effect", async () => {
    const effect = vi.fn(() => IO.succeed(1))

    const { result } = renderHook(() => useIOQuery(["limits", "off"], effect, { enabled: false }), {
      wrapper: createWrapper(),
    })

    expect(result.current.fetchStatus).toBe("idle")
    expect(effect).not.toHaveBeenCalled()
  })

  it("passes through select", async () => {
    const { result } = renderHook(
      () => useIOQuery(["limits", "select"], () => IO.succeed({ seats: 5 }), { select: (d) => d.seats }),
      { wrapper: createWrapper() },
    )

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toBe(5)
  })

  it("hands the query's AbortSignal to the effect factory", async () => {
    let seen: AbortSignal | undefined

    const { result } = renderHook(
      () =>
        useIOQuery(["limits", "signal"], ({ signal }) => {
          seen = signal
          return IO.succeed("ok")
        }),
      { wrapper: createWrapper() },
    )

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(seen).toBeInstanceOf(AbortSignal)
  })

  // The scenario from issue #239: an Http 403 must arrive as something a generic
  // `error instanceof Error ? error.message : fallback` handler can read, while the
  // 403 branch stays discriminable.
  it("end-to-end: a 403 from Http is both a real Error and a tagged HttpStatusError", async () => {
    const api = Http.client({
      baseUrl: "https://api.example.com",
      fetch: () =>
        Promise.resolve(
          new Response(JSON.stringify({ message: "tier cap" }), { status: 403, statusText: "Forbidden" }),
        ),
    })

    const { result } = renderHook(
      () => useIOQuery<unknown, HttpError>(["limits", "403"], ({ signal }) => api.get("/limits", { signal })),
      { wrapper: createWrapper() },
    )

    await waitFor(() => expect(result.current.isError).toBe(true))

    const error = result.current.error
    expect(error instanceof Error).toBe(true)
    expect(error?.message.length).toBeGreaterThan(0)

    const branch = HttpErrors.match(error!.error, {
      NetworkError: () => "network",
      HttpStatusError: (e) => (e.status === 403 ? "tier-cap" : `status-${e.status}`),
      DecodeError: () => "decode",
    })
    expect(branch).toBe("tier-cap")
  })
})
