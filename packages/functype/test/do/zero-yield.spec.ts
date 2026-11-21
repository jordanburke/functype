/**
 * A Do block that yields nothing has no monad to follow, so it returns a List. It used to be typed
 * `Option`, because a generator that yields nothing yields `never`, which matched the Option overload.
 */
import { describe, expect, expectTypeOf, it } from "vitest"

import { $, Do, DoAsync } from "@/do"
import { type List, Option } from "@/index"

describe("Do with no yield", () => {
  it("is typed as the List it returns", () => {
    // eslint-disable-next-line require-yield -- a block with no yield is the case under test
    const result = Do(function* () {
      return 5
    })
    expectTypeOf(result).toEqualTypeOf<List<number>>()
    expect(result.toArray()).toEqual([5])
  })

  it("DoAsync too", async () => {
    // eslint-disable-next-line require-yield -- a block with no yield is the case under test
    const result = await DoAsync(async function* () {
      return await Promise.resolve("a")
    })
    expectTypeOf(result).toEqualTypeOf<List<string>>()
    expect(result.toArray()).toEqual(["a"])
  })

  it("leaves a block that yields an Option typed as Option", () => {
    const result = Do(function* () {
      const x = yield* $(Option(2))
      return x + 1
    })
    expectTypeOf(result).toEqualTypeOf<Option<number>>()
    expect(result.getOrElse(() => 0)).toBe(3)
  })
})
