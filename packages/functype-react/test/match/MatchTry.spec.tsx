import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { Try } from "functype/try"

import { MatchTry } from "../../src/match/MatchTry"

describe("MatchTry", () => {
  it("renders Success branch", () => {
    render(
      <MatchTry<number>
        value={Try.success(5)}
        Success={(a) => <span data-testid="out">{a}</span>}
        Failure={(e) => <span data-testid="out">{e.message}</span>}
      />,
    )
    expect(screen.getByTestId("out").textContent).toBe("5")
  })

  it("renders Failure branch carrying the error", () => {
    render(
      <MatchTry<number>
        value={Try.failure<number>(new Error("kaboom"))}
        Success={(a) => <span data-testid="out">{a}</span>}
        Failure={(e) => <span data-testid="out">{e.message}</span>}
      />,
    )
    expect(screen.getByTestId("out").textContent).toBe("kaboom")
  })
})
