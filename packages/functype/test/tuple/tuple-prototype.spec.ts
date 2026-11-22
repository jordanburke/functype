/**
 * Tuple shares its methods through one prototype (#276 §14, PR 4). Every Tuple used to carry its
 * own copy of 16 properties. These tests pin the shape, the 2.0 breaks, and the cost.
 */
import { inspect } from "node:util"

import { describe, expect, it, vi } from "vitest"

import { Some, Tuple } from "@/index"

describe("Tuple's shape", () => {
  it("keeps only its tag and its array as own properties", () => {
    const tuple = Tuple([1, "a"])
    expect(Reflect.ownKeys(tuple)).toEqual(["_tag", "value"])
    const seen: string[] = []
    // eslint-disable-next-line functional/immutable-data -- collecting what for...in sees
    for (const key in tuple) seen.push(key)
    expect(seen).toEqual(["_tag", "value"])
  })

  it("holds the array it was given, without copying it", () => {
    const values: [number, string] = [1, "a"]
    const tuple = Tuple(values)
    expect((tuple as unknown as { value: unknown }).value).toBe(values)
    expect(tuple.toArray()).toBe(values)
  })

  it("shares one frozen prototype", () => {
    const proto = Object.getPrototypeOf(Tuple([1])) as object
    for (const tuple of [Tuple.of(1, 2), Tuple.pair("a", 1), Tuple.empty(), Tuple([1]).map(() => ["b"])]) {
      expect(Object.getPrototypeOf(tuple)).toBe(proto)
    }
    expect(Object.isFrozen(proto)).toBe(true)
    expect(Object.getPrototypeOf(proto)).toBe(Object.prototype)
  })

  it("stays unfrozen, as it was in 1.x", () => {
    expect(Object.isFrozen(Tuple([1]))).toBe(false)
  })

  it("length is a property, read from the array", () => {
    expect(Tuple([1, 2, 3]).length).toBe(3)
    expect(Tuple.empty().length).toBe(0)
    expect(Object.getOwnPropertyDescriptor(Object.getPrototypeOf(Tuple([1])) as object, "length")?.get).toBeTypeOf(
      "function",
    )
  })

  it("prints its type and data", () => {
    expect(inspect(Tuple([1, "a"]))).toBe("Tuple { _tag: 'Tuple', value: [ 1, 'a' ] }")
    expect(Object.prototype.toString.call(Tuple([1]))).toBe("[object Tuple]")
    expect(Tuple([1, "a"]).toString()).toBe("Tuple(1, a)")
  })

  it("still iterates, folds, pipes and serializes", () => {
    const tuple = Tuple([1, 2, 3])
    expect([...tuple]).toEqual([1, 2, 3])
    expect([...tuple]).toEqual([1, 2, 3])
    expect(tuple.fold(0, (acc, x) => acc + x)).toBe(6)
    expect(tuple.foldLeft("")((acc, x) => acc + String(x))).toBe("123")
    expect(tuple.foldRight("")((x, acc) => acc + String(x))).toBe("321")
    expect(tuple.pipe((t) => t)).toBe(tuple)
    expect(JSON.stringify(tuple)).toBe('{"@functype":"Tuple","_tag":"Tuple","value":[1,2,3]}')
    expect(Tuple.fromJSON<number[]>(tuple.serialize().toJSON()).toArray()).toEqual([1, 2, 3])
  })
})

describe("Tuples compare by their data in test matchers", () => {
  it("two Tuples with the same data are equal", () => {
    expect(Tuple([1, "a"])).toEqual(Tuple([1, "a"]))
    expect(Tuple([1, "a"])).toStrictEqual(Tuple([1, "a"]))
    expect(Some(Tuple([1]))).toEqual(Some(Tuple([1])))
  })

  it("two Tuples with different data are unequal", () => {
    expect(Tuple([1, "a"])).not.toEqual(Tuple([1, "b"]))
    expect(Tuple([1])).not.toEqual(Tuple([1, 2]))
    expect([Tuple([1])]).not.toEqual([Tuple([2])])
    const spy = vi.fn()
    spy(Tuple([1]))
    expect(spy).toHaveBeenCalledWith(Tuple([1]))
    expect(spy).not.toHaveBeenCalledWith(Tuple([2]))
  })
})

describe("Tuple's 2.0 breaks", () => {
  it("a detached method call throws, because `this` is undefined", () => {
    const { get, toArray, toString } = Tuple([1, 2])
    expect(() => get(0)).toThrow(TypeError)
    expect(() => toArray()).toThrow(TypeError)
    expect(() => toString()).toThrow(TypeError)
    expect(() => [0, 1].map(Tuple(["a", "b"]).get)).toThrow(TypeError)
  })

  it("a spread copies only the data, and has no methods", () => {
    const copy = { ...Tuple([1, 2]) }
    expect(copy).toEqual({ _tag: "Tuple", value: [1, 2] })
    expect("map" in copy).toBe(false)
    expect(Object.keys(Tuple([1]))).toEqual(["_tag", "value"])
  })

  it("assigning over a method or length throws, because the prototype is frozen", () => {
    const record = Tuple([1]) as unknown as Record<string, unknown>
    expect(() => {
      // eslint-disable-next-line functional/immutable-data -- the write is what's under test
      record.map = () => 0
    }).toThrow(TypeError)
    expect(() => {
      // eslint-disable-next-line functional/immutable-data -- the write is what's under test
      record.length = 5
    }).toThrow(TypeError)
  })

  it("structuredClone copies the data, with no methods", () => {
    expect(structuredClone(Tuple([1, "a"]))).toEqual({ _tag: "Tuple", value: [1, "a"] })
  })
})

describe("Tuple's construction cost", { retry: 2 }, () => {
  const RUNS = 9
  const N = 50_000

  const timePerCall = (make: (i: number) => unknown): number => {
    let kept = 0
    const start = performance.now()
    for (let i = 0; i < N; i++) {
      if (make(i) !== undefined) kept++
    }
    const elapsed = performance.now() - start
    expect(kept).toBe(N)
    return elapsed / N
  }

  /** The smallest of interleaved runs of (build) / (build a plain object of the same data). */
  const ratioToPlain = (make: (i: number) => unknown): number => {
    const plain = (i: number) => ({ _tag: "Tuple", value: [i, 1] })
    for (let i = 0; i < 5_000; i++) {
      make(i)
      plain(i)
    }
    const ratios = Array.from({ length: RUNS }, () => timePerCall(make) / timePerCall(plain)).sort((a, b) => a - b)
    return ratios[0]!
  }

  const tuple = Tuple

  // Measured locally on Node 24.20.0 with this loop: 26x before the change, 1.0x after.
  // The bound sits far below the old cost, with room for a slow or instrumented runner.
  it("Tuple([i, 1]) costs at most 10 times a plain object", () => {
    const ratio = ratioToPlain((i) => tuple([i, 1]))
    console.info(`Tuple([i, 1]): ${ratio.toFixed(1)}x a plain object (bound 10x)`)
    expect(ratio).toBeLessThan(10)
  })
})
