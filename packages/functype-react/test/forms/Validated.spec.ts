import { describe, expect, it } from "vitest"

import { invalid, valid } from "../../src/forms/Validated"

describe("Validated helpers", () => {
  it("valid wraps a value in Right", () => {
    const v = valid(42)
    expect(v.isRight()).toBe(true)
    expect(
      v.fold(
        () => -1,
        (a) => a,
      ),
    ).toBe(42)
  })

  it("invalid wraps an array of errors in Left<List<E>>", () => {
    const v = invalid<string>(["nope", "still nope"])
    expect(v.isLeft()).toBe(true)
    const errs = v.fold(
      (e) => e.toArray(),
      () => [],
    )
    expect(errs).toEqual(["nope", "still nope"])
  })
})
