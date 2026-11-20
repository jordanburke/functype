import { Exit, IO, Left, None, Right, Some, Try } from "functype"
import { describe, expect, it } from "vitest"

import { referenceEq, structuralEq, tagEq } from "../../src/hooks/eq"

describe("referenceEq", () => {
  it("is Object.is", () => {
    expect(referenceEq(1, 1)).toBe(true)
    expect(referenceEq(NaN, NaN)).toBe(true)
    expect(referenceEq({}, {})).toBe(false)
  })
})

describe("tagEq", () => {
  it("compares _tag of tagged objects", () => {
    expect(tagEq({ _tag: "Some", value: 1 }, { _tag: "Some", value: 2 })).toBe(true)
    expect(tagEq({ _tag: "Some" }, { _tag: "None" })).toBe(false)
  })

  it("returns false for non-tagged values", () => {
    expect(tagEq({}, {})).toBe(false)
    expect(tagEq(null, null)).toBe(true)
    expect(tagEq(1, 1)).toBe(true)
  })
})

describe("structuralEq", () => {
  it("compares primitives", () => {
    expect(structuralEq(1, 1)).toBe(true)
    expect(structuralEq("a", "a")).toBe(true)
    expect(structuralEq(1, 2)).toBe(false)
  })

  it("compares arrays element-wise", () => {
    expect(structuralEq([1, 2, 3], [1, 2, 3])).toBe(true)
    expect(structuralEq([1, 2], [1, 2, 3])).toBe(false)
    expect(structuralEq([{ a: 1 }], [{ a: 1 }])).toBe(true)
  })

  it("compares plain objects key-by-key", () => {
    expect(structuralEq({ a: 1, b: 2 }, { a: 1, b: 2 })).toBe(true)
    expect(structuralEq({ a: 1 }, { a: 1, b: 2 })).toBe(false)
    expect(structuralEq({ a: { b: { c: 1 } } }, { a: { b: { c: 1 } } })).toBe(true)
  })

  it("distinguishes arrays from objects", () => {
    expect(structuralEq([], {})).toBe(false)
  })

  it("handles null vs object correctly", () => {
    expect(structuralEq(null, null)).toBe(true)
    expect(structuralEq(null, {})).toBe(false)
    expect(structuralEq({}, null)).toBe(false)
  })
})

describe("structuralEq with functype values, whose methods live on a shared prototype", () => {
  it("compares their data", () => {
    expect(structuralEq(Some(1), Some(1))).toBe(true)
    expect(structuralEq(Some(1), Some(2))).toBe(false)
    expect(structuralEq(Some(1), None())).toBe(false)
    expect(structuralEq(Right(1), Left(1))).toBe(false)
  })

  it("tells apart values holding different Errors or Dates", () => {
    expect(structuralEq(Left(new Error("a")), Left(new Error("b")))).toBe(false)
    expect(structuralEq(Left(new Error("a")), Left(new Error("a")))).toBe(true)
    expect(structuralEq(Left(new TypeError("a")), Left(new Error("a")))).toBe(false)
    expect(structuralEq(new Error("a", { cause: 1 }), new Error("a", { cause: 2 }))).toBe(false)
    const fail = (message: string) =>
      Try(() => {
        throw new Error(message)
      })
    expect(structuralEq(fail("a"), fail("b"))).toBe(false)
    expect(structuralEq(Some(new Date(0)), Some(new Date(1e12)))).toBe(false)
    expect(structuralEq(Some(new Date(5)), Some(new Date(5)))).toBe(true)
  })

  it("tells apart values holding different Maps, Sets, RegExps or URLs", () => {
    expect(structuralEq(Some(new Map([[1, 2]])), Some(new Map()))).toBe(false)
    expect(structuralEq(Some(new Map([[1, 2]])), Some(new Map([[1, 3]])))).toBe(false)
    expect(structuralEq(Some(new Map([[1, 2]])), Some(new Map([[1, 2]])))).toBe(true)
    expect(structuralEq(Right(new Set([1])), Right(new Set([2])))).toBe(false)
    expect(structuralEq(Right(new Set([1, 2])), Right(new Set([2, 1])))).toBe(true)
    expect(structuralEq(Some(/a/), Some(/b/))).toBe(false)
    expect(structuralEq(Some(/a/g), Some(/a/g))).toBe(true)
    expect(structuralEq(Some(new URL("https://a.test")), Some(new URL("https://b.test")))).toBe(false)
  })

  it("compares Exits and IOs by data", () => {
    expect(structuralEq(Exit.succeed(1), Exit.succeed(1))).toBe(true)
    expect(structuralEq(Exit.succeed(1), Exit.succeed(2))).toBe(false)
    expect(structuralEq(Exit.fail("e"), Exit.die("e"))).toBe(false)
    expect(structuralEq(Exit.interrupt("f"), Exit.interrupt("f"))).toBe(true)
    // An IO's only own key is its effect, so two IOs are equal when their effects are: the same
    // steps, values and functions.
    const inc = (x: number): number => x + 1
    expect(structuralEq(IO.succeed(1), IO.succeed(1))).toBe(true)
    expect(structuralEq(IO.succeed(1).map(inc), IO.succeed(1).map(inc))).toBe(true)
    expect(structuralEq(IO.succeed(1), IO.succeed(2))).toBe(false)
    expect(structuralEq(IO.succeed(1), IO.fail(1))).toBe(false)
    expect(
      structuralEq(
        IO.succeed(1).map(inc),
        IO.succeed(1).map((x) => x * 2),
      ),
    ).toBe(false)
  })

  it("never calls objects with different prototypes equal", () => {
    expect(structuralEq(new Date(0), {})).toBe(false)
    expect(structuralEq(Some(1), { _tag: "Some", value: 1 })).toBe(false)
  })
})
