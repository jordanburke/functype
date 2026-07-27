import { act, renderHook, waitFor } from "@testing-library/react"
import { IO } from "functype/io"
import { describe, expect, it } from "vitest"

import { IOQueryError } from "../../src/query/IOQueryError"
import { useIOMutation } from "../../src/query/useIOMutation"
import { createWrapper } from "./harness"

type StatusError = {
  readonly _tag: "HttpStatusError"
  readonly url: string
  readonly status: number
  readonly statusText: string
}

const forbidden: StatusError = {
  _tag: "HttpStatusError",
  url: "/api/tokens",
  status: 403,
  statusText: "Forbidden",
}

describe("useIOMutation", () => {
  it("mutateAsync resolves with the effect's value", async () => {
    const { result } = renderHook(
      () => useIOMutation((vars: { name: string }) => IO.succeed({ id: 1, name: vars.name })),
      { wrapper: createWrapper() },
    )

    const created = await act(() => result.current.mutateAsync({ name: "ci" }))
    expect(created).toEqual({ id: 1, name: "ci" })
  })

  it("mutateAsync rejects with a boxed IOQueryError", async () => {
    const { result } = renderHook(() => useIOMutation<number, StatusError>(() => IO.fail(forbidden)), {
      wrapper: createWrapper(),
    })

    const error = await act(() => result.current.mutateAsync().catch((e: unknown) => e))

    expect(error).toBeInstanceOf(IOQueryError)
    expect((error as IOQueryError<StatusError>).error.status).toBe(403)
  })

  it("onError receives the boxed error with a discriminable .error", async () => {
    let captured: IOQueryError<StatusError> | undefined

    const { result } = renderHook(
      () =>
        useIOMutation<number, StatusError>(() => IO.fail(forbidden), {
          onError: (e) => {
            captured = e
          },
        }),
      { wrapper: createWrapper() },
    )

    act(() => result.current.mutate())

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(captured).toBeInstanceOf(Error)
    expect(captured?.error._tag).toBe("HttpStatusError")
    expect(captured?.message).toBe("HTTP 403 Forbidden — /api/tokens")
  })
})
