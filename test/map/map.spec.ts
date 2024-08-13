import { Map } from "../../src"
import { Some, None } from "../../src"
import { Tuple } from "../../src"

describe("Map", () => {
  let map: Map<string, number>

  beforeEach(() => {
    map = new Map([
      ["a", 1],
      ["b", 2],
      ["c", 3],
    ])
  })

  test("map should transform values", () => {
    const newMap = map.map((value) => value * 2)
    expect(newMap.get("a").getOrElse(0)).toBe(2)
    expect(newMap.get("b").getOrElse(0)).toBe(4)
    expect(newMap.get("c").getOrElse(0)).toBe(6)
  })

  test("flatMap should transform values and flatten", () => {
    const newMap = map.flatMap((value) => new Map([["a", value * 2]]))
    console.log(newMap)
    expect(newMap.get("a").getOrElse(0)).toBe(6) // Last one overwrites: 3 * 2 = 6
  })

  test("reduce should accumulate values", () => {
    const result = map.reduce(
      (acc, value) =>
        new Tuple([acc.getAs<string>(0) + value.getAs<string>(0), acc.getAs<number>(1) + value.getAs<number>(1)]),
    )
    expect(result.get(0)).toBe("abc") // "a" + "b" + "c"
    expect(result.get(1)).toBe(6) // 1 + 2 + 3
  })

  test("foldLeft should accumulate values with an initial value", () => {
    const result = map.foldLeft(0)((acc, value) => acc + value.getAs<number>(1))
    expect(result).toBe(6) // 1 + 2 + 3
  })

  test("foldRight should accumulate values with an initial value", () => {
    const result = map.foldRight(0)((value, acc) => acc + value.getAs<number>(1))
    expect(result).toBe(6) // 3 + 2 + 1
  })

  test("get should return Some if key exists", () => {
    expect(map.get("a")).toEqual(new Some(1))
  })

  test("get should return None if key does not exist", () => {
    expect(map.get("z")).toEqual(new None())
  })

  test("getOrElse should return default value if key does not exist", () => {
    expect(map.getOrElse("z", 10)).toBe(10)
  })

  test("isEmpty should return true for an empty map", () => {
    const emptyMap = new Map<string, number>()
    expect(emptyMap.isEmpty).toBe(true)
  })

  test("isEmpty should return false for a non-empty map", () => {
    expect(map.isEmpty).toBe(false)
  })

  test("orElse should return alternative option if key does not exist", () => {
    expect(map.orElse("z", new Some(10))).toEqual(new Some(10))
  })
})
