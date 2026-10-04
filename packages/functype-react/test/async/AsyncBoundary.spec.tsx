import { render } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { AsyncBoundary } from "../../src/async/AsyncBoundary"

// React 19's `use()` hook does not unsuspend reliably under jsdom +
// @testing-library/react; the scheduler that drives post-Suspense re-renders
// behaves differently from a real browser. Full integration tests for
// `useIOValue` + `<AsyncBoundary>` will land in v0.2 alongside Playwright
// browser-based testing.
//
// In the meantime, the smoke test below confirms AsyncBoundary mounts and
// passes children through without throwing.

describe("AsyncBoundary", () => {
  it("renders its children when no error or suspension occurs", () => {
    const { getByTestId } = render(
      <AsyncBoundary
        pending={<span data-testid="pending">loading</span>}
        fallback={() => <span data-testid="err">err</span>}
      >
        <span data-testid="child">child</span>
      </AsyncBoundary>,
    )
    expect(getByTestId("child").textContent).toBe("child")
  })
})
