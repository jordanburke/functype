import { Seq } from "../../src"
import { Map } from "../../src"
import { None, Some } from "../../src"
import { Tuple } from "../../src"

describe("Map", () => {
  let map: Map<string, number>

  beforeEach(() => {
    map = Map<string, number>([
      ["a", 1],
      ["b", 2],
      ["c", 3],
    ])
  })

  test("map should transform values", () => {
    const newMap = map.add(Tuple(["d", 4]))
    expect(newMap.get("a").getOrElse(0)).toBe(1)
    expect(newMap.get("b").getOrElse(0)).toBe(2)
    expect(newMap.get("c").getOrElse(0)).toBe(3)
    expect(newMap.get("d").getOrElse(0)).toBe(4)
    expect(newMap.get("e").getOrElse(0)).toBe(0)
  })

  test("map should transform values", () => {
    const newMap = map.map((value) => value * 2)
    expect(newMap.get("a").getOrElse(0)).toBe(2)
    expect(newMap.get("b").getOrElse(0)).toBe(4)
    expect(newMap.get("c").getOrElse(0)).toBe(6)
    expect(newMap.get("d").getOrElse(0)).toBe(0)
  })

  test("flatMap should transform values and flatten", () => {
    const newMap = map.flatMap((value) => Seq([["a", value.get(1) * 2]]))
    expect(newMap.get("a").getOrElse(0)).toBe(6) // Last one overwrites: 3 * 2 = 6
  })

  test("reduce should accumulate values", () => {
    const result = map.reduce((acc, value) => Tuple([acc.get(0) + value.get(0), acc.get(1) + value.get(1)]))
    expect(result.get(0)).toBe("abc") // "a" + "b" + "c"
    expect(result.get(1)).toBe(6) // 1 + 2 + 3
  })

  test("foldLeft should accumulate values with an initial value", () => {
    const result = map.foldLeft(0)((acc, value) => acc + value.get(1))
    expect(result).toBe(6) // 1 + 2 + 3
  })

  test("foldRight should accumulate values with an initial value", () => {
    const result = map.foldRight(0)((value, acc) => acc + value.get(1))
    expect(result).toBe(6) // 3 + 2 + 1
  })

  test("get should return Some if key exists", () => {
    expect(map.get("a").toValue()).toEqual(Some(1).toValue())
  })

  test("get should return None if key does not exist", () => {
    expect(map.get("z").toValue()).toEqual(None().toValue())
  })

  test("getOrElse should return default value if key does not exist", () => {
    expect(map.getOrElse("z", 10)).toBe(10)
  })

  test("isEmpty should return true for an empty map", () => {
    const emptyMap = Map<string, number>()
    expect(emptyMap.isEmpty).toBe(true)
  })

  test("isEmpty should return false for a non-empty map", () => {
    expect(map.isEmpty).toBe(false)
  })

  test("orElse should return alternative option if key does not exist", () => {
    expect(map.orElse("z", Some(10)).toValue()).toEqual(Some(10).toValue())
  })
})
