/* eslint-disable @typescript-eslint/no-unused-vars -- type-level assertions only */
import { describe, expectTypeOf, it } from "vitest"

import type { MatchCases } from "../../src/match/Match"

type Loading = { readonly _tag: "Loading" }
type Success = { readonly _tag: "Success"; readonly data: string }
type Failure = { readonly _tag: "Failure"; readonly error: Error }
type State = Loading | Success | Failure

describe("MatchCases type", () => {
  it("requires every _tag as a key", () => {
    expectTypeOf<MatchCases<State>>().toHaveProperty("Loading")
    expectTypeOf<MatchCases<State>>().toHaveProperty("Success")
    expectTypeOf<MatchCases<State>>().toHaveProperty("Failure")
  })

  it("narrows each handler's argument to the matching variant", () => {
    type SuccessHandler = MatchCases<State>["Success"]
    expectTypeOf<SuccessHandler>().parameter(0).toEqualTypeOf<Success>()

    type FailureHandler = MatchCases<State>["Failure"]
    expectTypeOf<FailureHandler>().parameter(0).toEqualTypeOf<Failure>()
  })
})
