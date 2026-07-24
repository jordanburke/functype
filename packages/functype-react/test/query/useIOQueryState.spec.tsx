import { act, render, renderHook, screen, waitFor } from "@testing-library/react"
import { IO } from "functype/io"
import { describe, expect, it } from "vitest"

import { Match } from "../../src/match/Match"
import { useIOMutationState } from "../../src/query/useIOMutationState"
import { useIOQueryState } from "../../src/query/useIOQueryState"
import { createWrapper } from "./harness"

type StatusError = { readonly _tag: "HttpStatusError"; readonly status: number }

const forbidden: StatusError = { _tag: "HttpStatusError", status: 403 }

describe("useIOQueryState", () => {
  it("returns the ADT directly, transitioning Pending → Success", async () => {
    const { result } = renderHook(() => useIOQueryState(["qs", "ok"], () => IO.succeed({ seats: 5 })), {
      wrapper: createWrapper(),
    })

    expect(result.current._tag).toBe("Pending")
    expect(result.current.isPending).toBe(true)

    await waitFor(() => expect(result.current._tag).toBe("Success"))
    expect(result.current.isSuccess).toBe(true)
    if (result.current._tag === "Success") {
      expect(result.current.value).toEqual({ seats: 5 })
    }
  })

  it("returns Idle for a disabled query", () => {
    const { result } = renderHook(() => useIOQueryState(["qs", "off"], () => IO.succeed(1), { enabled: false }), {
      wrapper: createWrapper(),
    })

    expect(result.current._tag).toBe("Idle")
    expect(result.current.isIdle).toBe(true)
  })

  it("returns Failure carrying the boxed, discriminable error", async () => {
    const { result } = renderHook(
      () => useIOQueryState<number, StatusError>(["qs", "fail"], () => IO.fail(forbidden)),
      { wrapper: createWrapper() },
    )

    await waitFor(() => expect(result.current._tag).toBe("Failure"))
    expect(result.current.isFailure).toBe(true)
    if (result.current._tag === "Failure") {
      expect(result.current.error).toBeInstanceOf(Error)
      expect(result.current.error.error).toBe(forbidden)
    }
  })

  it("exposes a working refetch", async () => {
    let runs = 0
    const { result } = renderHook(
      () =>
        useIOQueryState(["qs", "refetch"], () => {
          runs += 1
          return IO.succeed(runs)
        }),
      { wrapper: createWrapper() },
    )

    await waitFor(() => expect(result.current._tag).toBe("Success"))
    expect(runs).toBe(1)

    await act(() => result.current.refetch().then(() => undefined))
    await waitFor(() => expect(runs).toBe(2))
  })

  it("is matchable with no projection call", async () => {
    function Panel() {
      const user = useIOQueryState(["qs", "match"], () => IO.succeed({ name: "ada" }))

      return (
        <Match value={user}>
          {{
            Idle: () => <p>idle</p>,
            Pending: () => <p>loading</p>,
            Failure: ({ error }) => <p>failed {error.message}</p>,
            Success: ({ value }) => <p>hello {value.name}</p>,
          }}
        </Match>
      )
    }

    const Wrapper = createWrapper()
    render(
      <Wrapper>
        <Panel />
      </Wrapper>,
    )

    expect(screen.getByText("loading")).toBeInTheDocument()
    await waitFor(() => expect(screen.getByText("hello ada")).toBeInTheDocument())
  })
})

describe("useIOMutationState", () => {
  it("starts Idle and reaches Success, keeping the trigger usable", async () => {
    const { result } = renderHook(() => useIOMutationState((n: number) => IO.succeed(n * 2)), {
      wrapper: createWrapper(),
    })

    expect(result.current._tag).toBe("Idle")
    expect(result.current.isIdle).toBe(true)

    await act(() => result.current.mutateAsync(21).then(() => undefined))

    await waitFor(() => expect(result.current._tag).toBe("Success"))
    if (result.current._tag === "Success") {
      expect(result.current.value).toBe(42)
    }
  })

  it("reaches Failure with the boxed error, and reset returns to Idle", async () => {
    const { result } = renderHook(() => useIOMutationState<number, StatusError>(() => IO.fail(forbidden)), {
      wrapper: createWrapper(),
    })

    act(() => result.current.mutate())
    await waitFor(() => expect(result.current._tag).toBe("Failure"))
    if (result.current._tag === "Failure") {
      expect(result.current.error.error).toBe(forbidden)
    }

    act(() => result.current.reset())
    await waitFor(() => expect(result.current._tag).toBe("Idle"))
  })
})
