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
