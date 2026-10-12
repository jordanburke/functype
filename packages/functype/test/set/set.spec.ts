import { describe, expect, test } from "vitest"

import { List } from "@/list"
import { Set } from "@/set"

describe("Set", () => {
  describe("companion methods", () => {
    test("Set.empty() creates empty set", () => {
      const set = Set.empty<number>()
      expect(set.isEmpty).toBe(true)
      expect(set.toArray()).toEqual([])
    })

    test("Set.of() creates set from varargs", () => {
      const set = Set.of(1, 2, 3)
      expect(set.toArray()).toEqual(expect.arrayContaining([1, 2, 3]))
    })

    test("Set.of() with single element", () => {
      const set = Set.of("hello")
      expect(set.toArray()).toEqual(["hello"])
    })

    test("Set.of() with no arguments creates empty set", () => {
      const set = Set.of<number>()
      expect(set.isEmpty).toBe(true)
    })

    test("Set.of() deduplicates values", () => {
      const set = Set.of(1, 2, 2, 3, 3, 3)
      expect(set.size).toBe(3)
      expect(set.toArray()).toEqual(expect.arrayContaining([1, 2, 3]))
    })

    test("Set.empty() returns singleton instance", () => {
      const a = Set.empty<number>()
      const b = Set.empty<string>()
      expect(a).toBe(b) // Same instance regardless of type parameter
    })
  })

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

describe("Set.mapAsync", () => {
  test("collects results into a Set, collapsing equal ones", async () => {
    const result = await Set([1, 2, 3, 4]).mapAsync(async (n) => n % 2)
    expect(result.toArray().sort()).toEqual([0, 1])
  })

  test("runs one call at a time by default", async () => {
    const gauge = { now: 0, max: 0 }
    await Set([1, 2, 3]).mapAsync(async (n) => {
      gauge.now += 1
      gauge.max = Math.max(gauge.max, gauge.now)
      await new Promise((resolve) => setTimeout(resolve, 2))
      gauge.now -= 1
      return n
    })
    expect(gauge.max).toBe(1)
  })

  test("runs up to `concurrency` calls at once", async () => {
    const run = async (concurrency: number | "unbounded"): Promise<number> => {
      const gauge = { now: 0, max: 0 }
      const result = await Set([1, 2, 3, 4, 5]).mapAsync(
        async (n) => {
          gauge.now += 1
          gauge.max = Math.max(gauge.max, gauge.now)
          await new Promise((resolve) => setTimeout(resolve, 2))
          gauge.now -= 1
          return n * 10
        },
        { concurrency },
      )
      expect(result.toArray().sort((x, y) => x - y)).toEqual([10, 20, 30, 40, 50])
      return gauge.max
    }
    expect(await run(2)).toBe(2)
    expect(await run("unbounded")).toBe(5)
  })

  test("rejects when a call rejects", async () => {
    await expect(Set([1]).mapAsync(() => Promise.reject(new Error("boom")))).rejects.toThrow("boom")
  })
})
