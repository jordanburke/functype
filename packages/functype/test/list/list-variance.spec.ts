import { describe, expect, expectTypeOf, it } from "vitest"

import { List } from "@/list/List"
import { None, Option, Some } from "@/option/Option"

/**
 * Guards List<out A> covariance (landed in 0.58.x).
 *
 * After Scala-aligned refactor:
 *   - List.remove / indexOf / contains accept `unknown`
 *   - List.add / prepend / concat widen via `<B>(B) => List<A | B>`
 *   - List.reduce / reduceRight take a wider accumulator with default `B = A`
 *
 * These let TS accept `List<NarrowA>` where `List<WideA>` is expected, and let
 * sum types keep `toList(): List<T>` without poisoning their own <out T> variance.
 */

type DogV1 = { readonly _tag: "DogV1"; readonly name: string }
type DogV2 = DogV1 & { readonly bark: string }

describe("List covariance", () => {
  it("assigns List<Narrow> to List<Wide>", () => {
    const narrow: List<DogV2> = List<DogV2>([{ _tag: "DogV1", name: "Rex", bark: "woof" }])
    const wide: List<DogV1> = narrow
    expectTypeOf(wide).toEqualTypeOf<List<DogV1>>()
    expect(wide.toArray().length).toBe(1)
  })

  it("Option.toList preserves Option's covariance (List's covariance unblocks it)", () => {
    const narrow: Option<DogV2> = Some({ _tag: "DogV1", name: "Rex", bark: "woof" })
    const wide: Option<DogV1> = narrow
    const list: List<DogV1> = wide.toList()
    expect(list.toArray()[0]?.name).toBe("Rex")
  })

  it("add widens the element type", () => {
    const nums: List<number> = List([1, 2, 3])
    const mixed = nums.add("hello")
    expectTypeOf(mixed).toEqualTypeOf<List<number | string>>()
    expect(mixed.toArray()).toEqual([1, 2, 3, "hello"])
  })

  it("prepend widens the element type", () => {
    const nums: List<number> = List([1, 2])
    const mixed = nums.prepend("zero")
    expectTypeOf(mixed).toEqualTypeOf<List<number | string>>()
    expect(mixed.toArray()).toEqual(["zero", 1, 2])
  })

  it("concat widens across lists", () => {
    const ns: List<number> = List([1, 2])
    const ss: List<string> = List(["a", "b"])
    const combined = ns.concat(ss)
    expectTypeOf(combined).toEqualTypeOf<List<number | string>>()
    expect(combined.toArray()).toEqual([1, 2, "a", "b"])
  })

  it("remove accepts unknown (no type error for an unrelated value)", () => {
    const nums: List<number> = List([1, 2, 3])
    // Scala: list - "foo" is a no-op
    const result = nums.remove("not-a-number")
    expectTypeOf(result).toEqualTypeOf<List<number>>()
    expect(result.toArray()).toEqual([1, 2, 3])
  })

  it("contains accepts unknown", () => {
    const nums: List<number> = List([1, 2, 3])
    expect(nums.contains(2)).toBe(true)
    // Scala: list.contains("foo") is false, not a type error
    expect(nums.contains("foo")).toBe(false)
  })

  it("indexOf accepts unknown", () => {
    const nums: List<number> = List([10, 20, 30])
    expect(nums.indexOf(20)).toBe(1)
    expect(nums.indexOf("nope")).toBe(-1)
  })

  it("reduce infers B = A by default", () => {
    const nums: List<number> = List([1, 2, 3, 4])
    const sum = nums.reduce((acc, x) => acc + x)
    expectTypeOf(sum).toEqualTypeOf<number>()
    expect(sum).toBe(10)
  })

  it("reduce can widen to a supertype accumulator", () => {
    const nums: List<number> = List([1, 2, 3])
    const asStr = nums.reduce<number | string>((acc, x) => `${acc},${x}`)
    expectTypeOf(asStr).toEqualTypeOf<number | string>()
    expect(asStr).toBe("1,2,3")
  })

  it("None.toList returns empty list assignable to wider List", () => {
    const narrow: Option<DogV2> = None<DogV2>()
    const wide: Option<DogV1> = narrow
    const list: List<DogV1> = wide.toList()
    expect(list.toArray()).toEqual([])
  })
})
