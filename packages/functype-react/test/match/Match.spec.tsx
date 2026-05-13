import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { Match } from "../../src/match/Match"

type State =
  | { readonly _tag: "Loading" }
  | { readonly _tag: "Success"; readonly data: string }
  | { readonly _tag: "Failure"; readonly error: Error }

// Indirection prevents TS from narrowing the inferred type at the call site.
const asState = (s: State): State => s

describe("Match", () => {
  it("renders the handler keyed by _tag", () => {
    const value = asState({ _tag: "Success", data: "hello" })
    render(
      <Match value={value}>
        {{
          Loading: () => <p data-testid="out">loading</p>,
          Success: ({ data }) => <p data-testid="out">{data}</p>,
          Failure: ({ error }) => <p data-testid="out">{error.message}</p>,
        }}
      </Match>,
    )
    expect(screen.getByTestId("out").textContent).toBe("hello")
  })

  it("narrows the variant in each handler", () => {
    const value = asState({ _tag: "Failure", error: new Error("boom") })
    render(
      <Match value={value}>
        {{
          Loading: () => <p data-testid="out">loading</p>,
          Success: ({ data }) => <p data-testid="out">{data}</p>,
          Failure: ({ error }) => <p data-testid="out">{error.message}</p>,
        }}
      </Match>,
    )
    expect(screen.getByTestId("out").textContent).toBe("boom")
  })
})
