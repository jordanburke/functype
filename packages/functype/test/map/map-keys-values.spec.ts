import { describe, expect, expectTypeOf, test } from "vitest"

import { List, Map, Tuple } from "../../src"

describe("Map.has", () => {
  test("is true for a present key and false for a missing one", () => {
    const map = Map([
      ["a", 1],
      ["b", 2],
    ])
    expect(map.has("a")).toBe(true)
    expect(map.has("z")).toBe(false)
  })

  test("is true for a key whose value is undefined, where get returns None", () => {
    const map = Map<string, number | undefined>([["a", undefined]])
    expect(map.has("a")).toBe(true)
    expect(map.get("a").isNone()).toBe(true)
  })

  test("compares object keys by identity, like a native Map", () => {
    const key = { id: 1 }
    const map = Map([[key, "x"]])
    expect(map.has(key)).toBe(true)
    expect(map.has({ id: 1 })).toBe(false)
  })

  test("treats NaN as equal to NaN (SameValueZero)", () => {
    expect(Map([[Number.NaN, "x"]]).has(Number.NaN)).toBe(true)
  })

  test("checks the key only, where contains checks the whole entry", () => {
    const map = Map([["a", 1]])
    expect(map.has("a")).toBe(true)
    expect(map.contains(Tuple(["a", 2]))).toBe(false)
  })

  test("tracks add and remove", () => {
    const map = Map([["a", 1]])
    expect(map.add(Tuple(["b", 2])).has("b")).toBe(true)
    expect(map.remove("a").has("a")).toBe(false)
    expect(map.has("a")).toBe(true)
  })

  test("is false on the empty map", () => {
    expect(Map.empty<string, number>().has("a")).toBe(false)
  })
})

describe("Map.keys", () => {
  test("returns a List of the keys in insertion order", () => {
    const keys = Map([
      ["b", 2],
      ["a", 1],
      ["c", 3],
    ]).keys()
    expect(keys._tag).toBe("List")
    expect(keys.toArray()).toEqual(["b", "a", "c"])
  })

  test("can be read more than once, unlike a native iterator", () => {
    const keys = Map([["a", 1]]).keys()
    expect([...keys]).toEqual(["a"])
    expect([...keys]).toEqual(["a"])
  })

  test("chains as a functype List", () => {
    const keys = Map([
      ["a", 1],
      ["bb", 2],
    ]).keys()
    expect(keys.filter((k) => k.length > 1).toArray()).toEqual(["bb"])
  })

  test("is empty on the empty map", () => {
    expect(Map.empty<string, number>().keys().isEmpty).toBe(true)
  })

  test("is typed List<K>", () => {
    expectTypeOf(Map<string, number>([]).keys()).toEqualTypeOf<List<string>>()
  })
})

describe("Map.values", () => {
  test("returns a List of the values in insertion order, keeping duplicates", () => {
    const values = Map([
      ["a", 1],
      ["b", 1],
      ["c", 2],
    ]).values()
    expect(values._tag).toBe("List")
    expect(values.toArray()).toEqual([1, 1, 2])
  })

  test("keeps undefined values", () => {
    expect(
      Map<string, number | undefined>([["a", undefined]])
        .values()
        .toArray(),
    ).toEqual([undefined])
  })

  test("follows the latest value after add replaces a key", () => {
    expect(
      Map([["a", 1]])
        .add(Tuple(["a", 9]))
        .values()
        .toArray(),
    ).toEqual([9])
  })

  test("chains as a functype List", () => {
    const total = Map([
      ["a", 1],
      ["b", 2],
    ])
      .values()
      .fold(0, (acc, v) => acc + v)
    expect(total).toBe(3)
  })

  test("is empty on the empty map", () => {
    expect(Map.empty<string, number>().values().isEmpty).toBe(true)
  })

  test("is typed List<V> and stays covariant in V", () => {
    const map: Map<string, 1 | 2> = Map<string, 1 | 2>([["a", 1]])
    const widened: Map<string, number> = map
    expectTypeOf(widened.values()).toEqualTypeOf<List<number>>()
  })
})
