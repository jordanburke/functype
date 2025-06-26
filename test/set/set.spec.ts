import { describe, expect, test } from "vitest"

import { List } from "@/list"
import { Set } from "@/set"

describe("Set", () => {
  test("add should add a new value", () => {
    const set = Set([1, 2, 3])
    const newSet = set.add(4)
    expect(newSet.toArray()).toEqual(expect.arrayContaining([1, 2, 3, 4]))
  })

  test("add should not add duplicate values", () => {
    const set = Set([1, 2, 3])
    const newSet = set.add(3)
    expect(newSet.toArray()).toEqual(expect.arrayContaining([1, 2, 3]))
  })

  test("remove should remove a value", () => {
    const set = Set([1, 2, 3])
    const newSet = set.remove(2)
    expect(newSet.toArray()).toEqual(expect.arrayContaining([1, 3]))
  })

  test("remove should not affect the set if the value is not found", () => {
    const set = Set([1, 2, 3])
    const newSet = set.remove(4)
    expect(newSet.toArray()).toEqual(expect.arrayContaining([1, 2, 3]))
  })

  test("contains/has should return true if value is present", () => {
    const set = Set([1, 2, 3])
    expect(set.contains(2)).toBeTruthy()
    expect(set.has(2)).toBeTruthy()
  })

  test("contains/has should return false if value is not present", () => {
    const set = Set([1, 2, 3])
    expect(set.contains(4)).toBeFalsy()
    expect(set.has(4)).toBeFalsy()
  })

  test("map should correctly map values", () => {
    const set = Set([1, 2, 3])
    const newSet = set.map((x: number) => x * 2)
    expect(newSet.toArray()).toEqual(expect.arrayContaining([2, 4, 6]))
  })

  test("flatMap should correctly map and flatten values", () => {
    const set = Set([1, 2, 3])
    const newSet = set.flatMap((x: number) => List([x, x * 2]))
    expect(newSet.toArray()).toEqual(expect.arrayContaining([1, 2, 3, 4, 6]))
  })

  test("toList should convert set to list", () => {
    const set = Set([1, 2, 3])
    const list = set.toList()
    expect(list.toArray()).toEqual(expect.arrayContaining([1, 2, 3]))
  })

  test("toSet should return the set itself", () => {
    const set = Set([1, 2, 3])
    expect(set.toSet()).toBe(set)
  })
})
