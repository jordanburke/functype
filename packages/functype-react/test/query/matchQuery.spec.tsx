import { render, screen, waitFor } from "@testing-library/react"
import { IO } from "functype/io"
import { describe, expect, it } from "vitest"

import { Match } from "../../src/match/Match"
import { toQueryState } from "../../src/query/queryState"
import { useIOQuery } from "../../src/query/useIOQuery"
import { createWrapper } from "./harness"

type StatusError = { readonly _tag: "HttpStatusError"; readonly status: number }

type User = { readonly name: string }

/**
 * The package thesis, exercised end to end: every lifecycle case is handled, the
 * Success branch receives a defined `User` (no `!`, no `| undefined`), and omitting
 * a case would not compile.
 */
function UserPanel({ shouldFail }: { shouldFail: boolean }) {
  const query = useIOQuery<User, StatusError>(["user", String(shouldFail)], () =>
    shouldFail ? IO.fail({ _tag: "HttpStatusError", status: 403 }) : IO.succeed({ name: "ada" }),
  )

  return (
    <Match value={toQueryState(query)}>
      {{
        Idle: () => <p>idle</p>,
        Pending: () => <p>loading</p>,
        Failure: ({ error }) => <p>failed {error.error.status}</p>,
        Success: ({ value }) => <p>hello {value.name}</p>,
      }}
    </Match>
  )
}

describe("Match over a projected query", () => {
  it("renders the Pending branch, then Success with a defined value", async () => {
    const Wrapper = createWrapper()
    render(
      <Wrapper>
        <UserPanel shouldFail={false} />
      </Wrapper>,
    )

    expect(screen.getByText("loading")).toBeInTheDocument()
    await waitFor(() => expect(screen.getByText("hello ada")).toBeInTheDocument())
  })

  it("renders the Failure branch with the discriminable error", async () => {
    const Wrapper = createWrapper()
    render(
      <Wrapper>
        <UserPanel shouldFail={true} />
      </Wrapper>,
    )

    await waitFor(() => expect(screen.getByText("failed 403")).toBeInTheDocument())
  })
})
