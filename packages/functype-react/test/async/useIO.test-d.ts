/* eslint-disable @typescript-eslint/no-unused-vars -- type-level assertions only */
import type { HttpError } from "functype/fetch"
import { describe, expectTypeOf, it } from "vitest"

import type { UseIOResult } from "../../src/async/useIO"

describe("useIO types", () => {
  it("narrows by flag the way it narrows by _tag (#633)", () => {
    const read = (state: UseIOResult<HttpError, { id: string }>): void => {
      if (state.isFailure) expectTypeOf(state.error).toEqualTypeOf<HttpError>()
      if (state.isSuccess) expectTypeOf(state.value).toEqualTypeOf<{ id: string }>()
      if (state.isPending) expectTypeOf(state._tag).toEqualTypeOf<"Pending">()
      if (state.isIdle) expectTypeOf(state._tag).toEqualTypeOf<"Idle">()
    }
    void read
  })

  it("types each flag as a literal on its own case", () => {
    type Failure = Extract<UseIOResult<HttpError, number>, { _tag: "Failure" }>

    expectTypeOf<Failure["isFailure"]>().toEqualTypeOf<true>()
    expectTypeOf<Failure["isSuccess"]>().toEqualTypeOf<false>()
  })
})
