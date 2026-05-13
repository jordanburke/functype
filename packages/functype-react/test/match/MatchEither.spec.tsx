import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { Left, Right } from "functype/either"

import { MatchEither } from "../../src/match/MatchEither"

describe("MatchEither", () => {
  it("renders Right branch", () => {
    render(
      <MatchEither<string, number>
        value={Right<string, number>(7)}
        Left={(e) => <span data-testid="out">{e}</span>}
        Right={(r) => <span data-testid="out">{r}</span>}
      />,
    )
    expect(screen.getByTestId("out").textContent).toBe("7")
  })

  it("renders Left branch", () => {
    render(
      <MatchEither<string, number>
        value={Left<string, number>("oops")}
        Left={(e) => <span data-testid="out">{e}</span>}
        Right={(r) => <span data-testid="out">{r}</span>}
      />,
    )
    expect(screen.getByTestId("out").textContent).toBe("oops")
  })
})
