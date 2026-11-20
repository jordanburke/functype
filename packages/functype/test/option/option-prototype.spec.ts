/**
 * Option shares its methods through one prototype per variant (#276 §14, from #539: every method
 * was copied onto every value). These tests pin the shape, the 2.0 breaks, and the cost.
 */
import { inspect } from "node:util"

import { describe, expect, it } from "vitest"

import { None, Option, Some } from "@/index"

describe("Option's shape", () => {
  it("keeps only its data as own properties", () => {
    expect(Object.keys(Some(1))).toEqual(["_tag", "value"])
    expect(Object.keys(None())).toEqual(["_tag", "value"])
    const seen: string[] = []
    // eslint-disable-next-line functional/immutable-data -- collecting what for...in sees
    for (const key in Some(1)) seen.push(key)
    expect(seen).toEqual(["_tag", "value"])
  })

  it("shares one frozen prototype per variant", () => {
    expect(Object.getPrototypeOf(Some(1))).toBe(Object.getPrototypeOf(Some("a")))
    expect(Object.getPrototypeOf(Some(1))).not.toBe(Object.getPrototypeOf(None()))
    expect(Object.isFrozen(Object.getPrototypeOf(Some(1)))).toBe(true)
    expect(None()).toBe(None())
  })

  it("compares by data in test matchers", () => {
    expect(Some(1)).toEqual(Some(1))
    expect(Some(1)).not.toEqual(Some(2))
    expect(Some(1)).not.toEqual(None())
    expect(Option(undefined)).toEqual(None())
  })

  it("prints its variant and data", () => {
    expect(inspect(Some(1))).toBe("Some [Option] { _tag: 'Some', value: 1 }")
    expect(inspect(None())).toBe("None [Option] { _tag: 'None', value: undefined }")
    expect(Object.prototype.toString.call(Some(1))).toBe("[object Option]")
  })
})

describe("Option's 2.0 breaks", () => {
  it("a detached method call throws", () => {
    const { orElse } = Some(1)
    expect(() => orElse(0)).toThrow(TypeError)
    expect(() => [2].filter(Some(2).contains)).toThrow(TypeError)
  })

  it("a spread copies only the data", () => {
    expect({ ...Some(1) }).toEqual({ _tag: "Some", value: 1 })
  })

  it("assigning over a method throws, because the prototype is frozen", () => {
    expect(() => {
      // eslint-disable-next-line functional/immutable-data -- the write is what's under test
      ;(Some(1) as unknown as Record<string, unknown>).map = () => 0
    }).toThrow(TypeError)
  })

  it("structuredClone copies the data, with no methods", () => {
    expect(structuredClone(Some(1))).toEqual({ _tag: "Some", value: 1 })
  })
})

describe("Option's construction cost", () => {
  const RUNS = 9
  const N = 50_000
  const inc = (x: number): number => x + 1

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

  /** Median over interleaved runs of (build + map) / (build a plain object of the same data). */
  const ratioToPlain = (make: (i: number) => unknown): number => {
    const plain = (i: number) => ({ _tag: "Some", value: inc(i) })
    for (let i = 0; i < 5_000; i++) {
      make(i)
      plain(i)
    }
    const ratios = Array.from({ length: RUNS }, () => timePerCall(make) / timePerCall(plain)).sort((a, b) => a - b)
    return ratios[Math.floor(RUNS / 2)]!
  }

  // Measured locally on Node 24.20.0 with this loop: 84x before the change, 3.3x to 4.2x after.
  // The loop's own call overhead puts both above a raw benchmark's numbers (about 1.4x after).
  // The bound sits far below the old cost, with room for a slow or instrumented runner.
  it("Some(i).map costs at most 15 times a plain object", () => {
    const ratio = ratioToPlain((i) => Some(i).map(inc))
    console.info(`Some(i).map: ${ratio.toFixed(1)}x a plain object (bound 15x)`)
    expect(ratio).toBeLessThan(15)
  })
})
