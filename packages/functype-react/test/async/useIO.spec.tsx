import { act, render, renderHook, waitFor } from "@testing-library/react"
import { IO } from "functype/io"
import { Component, type ReactNode } from "react"
import { describe, expect, it } from "vitest"

import { useIO } from "../../src/async/useIO"

const tick = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms))

describe("useIO", () => {
  it("transitions Idle → Pending → Success", async () => {
    const { result } = renderHook(() => useIO(() => IO.succeed("ok"), []))

    expect(result.current.isPending || result.current.isIdle).toBe(true)
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    if (result.current._tag === "Success") {
      expect(result.current.value).toBe("ok")
    }
  })

  it("a typed failure becomes Failure carrying E", async () => {
    const { result } = renderHook(() => useIO(() => IO.fail({ _tag: "NotFound" as const }), []))
    await waitFor(() => expect(result.current.isFailure).toBe(true))
    if (result.current._tag === "Failure") {
      expect(result.current.error._tag).toBe("NotFound")
    }
  })

  it("aborts the signal on unmount", async () => {
    const seen = { aborted: false }
    const { unmount } = renderHook(() =>
      useIO((signal) => {
        signal.addEventListener("abort", () => {
          seen.aborted = true
        })
        return IO.sleep(200)
      }, []),
    )
    unmount()
    await waitFor(() => expect(seen.aborted).toBe(true))
  })

  it("unmounting stops the effect: a counting loop doesn't move afterwards", async () => {
    const counter = { n: 0 }
    const loop = IO.iterate(
      0,
      (i: number) =>
        IO.sleep(1).map(() => {
          counter.n += 1
          return i + 1
        }),
      () => false,
      { max: 1_000_000 },
    )
    const { unmount } = renderHook(() => useIO(() => loop, []))

    await tick(20)
    unmount()
    await tick(10)
    const snapshot = counter.n
    expect(snapshot).toBeGreaterThan(0)
    await tick(100)
    expect(counter.n).toBe(snapshot)
  })

  it("refetch triggers a re-run", async () => {
    const runs = { n: 0 }
    const { result } = renderHook(() =>
      useIO(
        () =>
          IO.sync(() => {
            runs.n += 1
            return runs.n
          }),
        [],
      ),
    )
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    act(() => result.current.refetch())
    await waitFor(() => {
      expect(result.current._tag === "Success" && result.current.value).toBe(2)
    })
  })

  it("a defect is rethrown to the nearest error boundary", async () => {
    class Boundary extends Component<{ readonly children: ReactNode }, { readonly error?: unknown }> {
      override state: { readonly error?: unknown } = {}
      static getDerivedStateFromError(error: unknown): { readonly error: unknown } {
        return { error }
      }
      override render(): ReactNode {
        return this.state.error instanceof Error ? (
          <span data-testid="caught">{this.state.error.message}</span>
        ) : (
          this.props.children
        )
      }
    }
    const Crashing = (): ReactNode => {
      useIO(
        () =>
          IO.sync(() => {
            throw new TypeError("bug")
          }),
        [],
      )
      return <span>never</span>
    }

    const silence = console.error
    console.error = () => undefined
    const { findByTestId } = render(
      <Boundary>
        <Crashing />
      </Boundary>,
    )
    expect((await findByTestId("caught")).textContent).toBe("bug")
    console.error = silence
  })
})
