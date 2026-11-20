/**
 * `take(NaN)` and `takeRight(NaN)` keep nothing on every sequence, the way `take(0)` does.
 * `takeRight(NaN)` used to return every element, and `LazyList.take(NaN)` did too.
 */
import { describe, expect, it } from "vitest"

import { LazyList, List, Set } from "@/index"

describe.each([
  ["List", () => List([1, 2, 3])],
  ["Set", () => Set([1, 2, 3])],
  ["LazyList", () => LazyList([1, 2, 3])],
] as const)("%s", (_, make) => {
  it("take(NaN) and takeRight(NaN) keep nothing", () => {
    expect(make().take(NaN).toArray()).toEqual([])
    expect(make().takeRight(NaN).toArray()).toEqual([])
  })

  it("take and takeRight still keep everything for Infinity", () => {
    expect(make().take(Infinity).toArray()).toEqual([1, 2, 3])
    expect(make().takeRight(Infinity).toArray()).toEqual([1, 2, 3])
  })
})
