import { describe, expect, it } from "vitest"

import { isIterable } from "../../src/util/isIterable"

describe("isIterable", () => {
  it("should return true for arrays", () => {
    expect(isIterable([1, 2, 3])).toBe(true)
    expect(isIterable([])).toBe(true)
  })

  it("should return true for strings", () => {
    expect(isIterable("hello")).toBe(true)
    expect(isIterable("")).toBe(true)
  })

  it("should return true for Set objects", () => {
    expect(isIterable(new Set([1, 2, 3]))).toBe(true)
    expect(isIterable(new Set())).toBe(true)
  })

  it("should return true for Map objects", () => {
    expect(isIterable(new Map([['a', 1], ['b', 2]]))).toBe(true)
    expect(isIterable(new Map())).toBe(true)
  })

  it("should return true for custom iterables", () => {
    const customIterable = {
      [Symbol.iterator]: function* () {
        yield 1;
        yield 2;
        yield 3;
      }
    };
    expect(isIterable(customIterable)).toBe(true)
  })

  it("should return false for null and undefined", () => {
    expect(isIterable(null)).toBe(false)
    expect(isIterable(undefined)).toBe(false)
  })

  it("should return false for non-iterable objects", () => {
    expect(isIterable({})).toBe(false)
    expect(isIterable({ a: 1, b: 2 })).toBe(false)
  })

  it("should return false for primitive types", () => {
    expect(isIterable(42)).toBe(false)
    expect(isIterable(true)).toBe(false)
    expect(isIterable(Symbol('test'))).toBe(false)
  })

  it("should return false for functions", () => {
    expect(isIterable(() => {})).toBe(false)
    expect(isIterable(function() {})).toBe(false)
  })
})
