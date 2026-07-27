import { act, renderHook, waitFor } from "@testing-library/react"
import { IO } from "functype/io"
import { describe, expect, it } from "vitest"

import { toMutationState, toQueryState } from "../../src/query/queryState"
import { useIOMutation } from "../../src/query/useIOMutation"
import { useIOQuery } from "../../src/query/useIOQuery"
import { createWrapper } from "./harness"

type StatusError = { readonly _tag: "HttpStatusError"; readonly status: number }

const forbidden: StatusError = { _tag: "HttpStatusError", status: 403 }

describe("toQueryState", () => {
  it("maps a disabled, never-fetched query to Idle", () => {
    expect(toQueryState({ status: "pending", fetchStatus: "idle" })).toEqual({ _tag: "Idle" })
  })

  it("maps an in-flight or paused query to Pending", () => {
    expect(toQueryState({ status: "pending", fetchStatus: "fetching" })).toEqual({ _tag: "Pending" })
    expect(toQueryState({ status: "pending", fetchStatus: "paused" })).toEqual({ _tag: "Pending" })
  })

  it("maps success to Success carrying a defined value", () => {
    expect(toQueryState({ status: "success", data: { seats: 5 } })).toEqual({
      _tag: "Success",
      value: { seats: 5 },
    })
  })

  it("maps error to Failure carrying the typed error", () => {
    expect(toQueryState<StatusError, never>({ status: "error", error: forbidden })).toEqual({
      _tag: "Failure",
      error: forbidden,
    })
  })
})

describe("toMutationState", () => {
  it("maps React Query's four mutation statuses onto TaskState", () => {
    expect(toMutationState({ status: "idle" })).toEqual({ _tag: "Idle" })
    expect(toMutationState({ status: "pending" })).toEqual({ _tag: "Pending" })
    expect(toMutationState({ status: "success", data: 7 })).toEqual({ _tag: "Success", value: 7 })
    expect(toMutationState<StatusError, never>({ status: "error", error: forbidden })).toEqual({
      _tag: "Failure",
      error: forbidden,
    })
  })
})

// The projection is only useful if a *real* hook result satisfies QueryResultView.
// These guard the structural assignability that makes that true.
describe("projection over live hook results", () => {
  it("projects a real useIOQuery result through its lifecycle", async () => {
    const { result } = renderHook(() => useIOQuery(["state", "ok"], () => IO.succeed({ seats: 5 })), {
      wrapper: createWrapper(),
    })

    expect(toQueryState(result.current)._tag).toBe("Pending")

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(toQueryState(result.current)).toEqual({ _tag: "Success", value: { seats: 5 } })
  })

  it("projects a disabled useIOQuery result to Idle", () => {
    const { result } = renderHook(() => useIOQuery(["state", "off"], () => IO.succeed(1), { enabled: false }), {
      wrapper: createWrapper(),
    })

    expect(toQueryState(result.current)).toEqual({ _tag: "Idle" })
  })

  it("projects a failing useIOQuery result to Failure with the boxed error", async () => {
    const { result } = renderHook(() => useIOQuery<number, StatusError>(["state", "fail"], () => IO.fail(forbidden)), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.isError).toBe(true))

    const state = toQueryState(result.current)
    expect(state._tag).toBe("Failure")
    if (state._tag === "Failure") {
      expect(state.error.error).toBe(forbidden)
    }
  })

  // Pins the documented squash: React Query holds the last successful data while
  // reporting status "error" after a failed background refetch, and TaskState has no
  // variant for "loaded but stale", so it projects to Failure. Change this test
  // deliberately if that default is ever revisited.
  it("projects a failed refetch to Failure even though data is still held", async () => {
    let attempt = 0
    const { result } = renderHook(
      () =>
        useIOQuery<{ seats: number }, StatusError>(["state", "refetch-fail"], () => {
          attempt += 1
          return attempt === 1 ? IO.succeed({ seats: 5 }) : IO.fail(forbidden)
        }),
      { wrapper: createWrapper() },
    )

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(toQueryState(result.current)).toEqual({ _tag: "Success", value: { seats: 5 } })

    await act(() => result.current.refetch().then(() => undefined))
    await waitFor(() => expect(result.current.status).toBe("error"))

    expect(result.current.data).toEqual({ seats: 5 })
    expect(toQueryState(result.current)._tag).toBe("Failure")
  })

  it("projects a real useIOMutation result, starting at Idle", async () => {
    const { result } = renderHook(() => useIOMutation((n: number) => IO.succeed(n * 2)), {
      wrapper: createWrapper(),
    })

    expect(toMutationState(result.current)).toEqual({ _tag: "Idle" })

    await result.current.mutateAsync(21)
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(toMutationState(result.current)).toEqual({ _tag: "Success", value: 42 })
  })
})
