import { act, renderHook, waitFor } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { useTask } from "../../src/async/useTask"

describe("useTask", () => {
  it("transitions Idle → Pending → Success", async () => {
    const { result } = renderHook(() => useTask(async () => "ok", []))

    expect(result.current.isPending || result.current.isIdle).toBe(true)
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    if (result.current._tag === "Success") {
      expect(result.current.value).toBe("ok")
    }
  })

  it("transitions to Failure when the task throws", async () => {
    const { result } = renderHook(() =>
      useTask(async () => {
        throw new Error("boom")
      }, []),
    )
    await waitFor(() => expect(result.current.isFailure).toBe(true))
    if (result.current._tag === "Failure") {
      expect(result.current.error.message).toBe("boom")
    }
  })

  it("cancels the AbortSignal on unmount", async () => {
    let aborted = false
    const { unmount } = renderHook(() =>
      useTask((signal) => {
        signal.addEventListener("abort", () => {
          aborted = true
        })
        return new Promise<string>((resolve) => setTimeout(() => resolve("done"), 200))
      }, []),
    )
    unmount()
    await waitFor(() => expect(aborted).toBe(true))
  })

  it("refetch triggers a re-run", async () => {
    let n = 0
    const { result } = renderHook(() =>
      useTask(async () => {
        n += 1
        return n
      }, []),
    )
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    act(() => result.current.refetch())
    await waitFor(() => {
      if (result.current._tag !== "Success") return
      expect(result.current.value).toBe(2)
    })
  })
})
