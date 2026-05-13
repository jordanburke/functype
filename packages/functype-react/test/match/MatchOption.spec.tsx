import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { Option } from "functype/option"

import { MatchOption } from "../../src/match/MatchOption"

describe("MatchOption", () => {
  it("renders Some branch when value is Some", () => {
    render(
      <MatchOption
        value={Option(42)}
        Some={(a) => <span data-testid="out">{a}</span>}
        None={() => <span data-testid="out">none</span>}
      />,
    )
    expect(screen.getByTestId("out").textContent).toBe("42")
  })

  it("renders None branch when value is None", () => {
    render(
      <MatchOption
        value={Option<number>(undefined)}
        Some={(a) => <span data-testid="out">{a}</span>}
        None={() => <span data-testid="out">none</span>}
      />,
    )
    expect(screen.getByTestId("out").textContent).toBe("none")
  })
})
