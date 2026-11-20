/**
 * Guards against the construction cost of issue #511 coming back.
 *
 * Two kinds of check:
 * - Shape, which is deterministic: which own properties are getters, and that instances are frozen.
 *   A getter written back into an object literal shows up here, whatever the machine.
 * - Cost, as a ratio to building the yardstick below over the same loop. The bounds were set as
 *   ratios to an `Option`, which the yardstick now stands in for. Ratios hold across machines far
 *   better than times do. Each bound sits between the measured ratio before the fix and after it,
 *   loose enough for a slow or instrumented runner.
 *
 * Ratios this test measured locally on Node 24.20.0, before -> after the fix: Map 8.9x -> 1.4x,
 * Stack 7.2x -> 0.6x, Obj 14.2x -> 2.1x. Over 20 runs with the full suite running alongside, the
 * worst were Map 1.7x, Stack 0.6x and Obj 6.9x. On GitHub Actions they were Map 2.5x, Stack 0.6x
 * and Obj 2.8x.
 *
 * List, Set and LazyList have only the shape check. Here List went from 12.9x to 4.3x, but it
 * measured 7.0x on GitHub Actions, too close to any bound below the old ratio. (Against the built
 * package the gap is wider: 33x -> 5.7x.) Set went from 8.3x to 5.6x and LazyList from 11.6x to
 * 5.7x.
 */
import { describe, expect, it } from "vitest"

import { LazyList, List, Map, Obj, Set, Stack } from "@/index"

const accessors = (value: object): string[] =>
  Object.entries(Object.getOwnPropertyDescriptors(value))
    .filter(([, descriptor]) => descriptor.get !== undefined)
    .map(([key]) => key)
    .sort()

describe("construction shape", () => {
  it.each([
    ["List", () => List([1, 2]), []],
    ["List()", () => List(), []],
    ["Set", () => Set([1, 2]), []],
    ["Map", () => Map([["a", 1]]), []],
    ["Stack", () => Stack([1, 2]), []],
    ["LazyList", () => LazyList([1, 2]), []],
    ["Obj", () => Obj({ a: 1 }), []],
  ] as const)("%s keeps getters only where they must stay lazy, and is frozen", (_, make, expected) => {
    const value = make()
    expect(accessors(value)).toEqual(expected)
    expect(Object.isFrozen(value)).toBe(true)
  })

  it("rejects new properties and replaced methods", () => {
    const list = List([1, 2])
    expect(() => {
      ;(list as unknown as Record<string, unknown>).extra = 1
    }).toThrow(TypeError)
    expect(() => {
      ;(list as unknown as Record<string, unknown>).map = () => List()
    }).toThrow(TypeError)
    expect(list.map((x) => x + 1).toArray()).toEqual([2, 3])
  })

  it("toValue gives a copy, so changing it can't change the collection", () => {
    const list = List([1, 2])
    list.toValue().value.push(3)
    expect([list.size, list.toArray()]).toEqual([2, [1, 2]])
    const stack = Stack([1, 2])
    stack.toValue().value.push(3)
    expect([stack.size, stack.toArray()]).toEqual([2, [1, 2]])
  })

  it("Obj still counts the keys of the object it wraps when read", () => {
    const data: Record<string, number> = { a: 1 }
    const obj = Obj(data)
    data.b = 2
    expect([obj.size, obj.isEmpty]).toEqual([2, false])
  })
})

/**
 * The yardstick the bounds below were set against: an object literal holding 70 closures over one
 * value. It costs what `Option` cost until 2.0 (about 128 ns on Node 24.20.0, against 107 ns for 60
 * closures and 158 ns for 80). Option now shares its methods (#276 §14) and costs a few nanoseconds,
 * too little to divide by, so this stands in for the old Option.
 */
const yardstick = (x: string) => ({
  _tag: "Some",
  value: x,
  m0: () => x,
  m1: () => x,
  m2: () => x,
  m3: () => x,
  m4: () => x,
  m5: () => x,
  m6: () => x,
  m7: () => x,
  m8: () => x,
  m9: () => x,
  m10: () => x,
  m11: () => x,
  m12: () => x,
  m13: () => x,
  m14: () => x,
  m15: () => x,
  m16: () => x,
  m17: () => x,
  m18: () => x,
  m19: () => x,
  m20: () => x,
  m21: () => x,
  m22: () => x,
  m23: () => x,
  m24: () => x,
  m25: () => x,
  m26: () => x,
  m27: () => x,
  m28: () => x,
  m29: () => x,
  m30: () => x,
  m31: () => x,
  m32: () => x,
  m33: () => x,
  m34: () => x,
  m35: () => x,
  m36: () => x,
  m37: () => x,
  m38: () => x,
  m39: () => x,
  m40: () => x,
  m41: () => x,
  m42: () => x,
  m43: () => x,
  m44: () => x,
  m45: () => x,
  m46: () => x,
  m47: () => x,
  m48: () => x,
  m49: () => x,
  m50: () => x,
  m51: () => x,
  m52: () => x,
  m53: () => x,
  m54: () => x,
  m55: () => x,
  m56: () => x,
  m57: () => x,
  m58: () => x,
  m59: () => x,
  m60: () => x,
  m61: () => x,
  m62: () => x,
  m63: () => x,
  m64: () => x,
  m65: () => x,
  m66: () => x,
  m67: () => x,
  m68: () => x,
  m69: () => x,
})

describe("construction cost", () => {
  const RUNS = 9
  const N = 20_000

  const timePerCall = (make: () => unknown): number => {
    let kept = 0
    const start = performance.now()
    for (let i = 0; i < N; i++) {
      if (make() !== undefined) kept++
    }
    const elapsed = performance.now() - start
    expect(kept).toBe(N)
    return elapsed / N
  }

  /** Median over several interleaved runs of (time to build the value) / (time to build the yardstick). */
  const ratioToYardstick = (make: () => unknown): number => {
    const reference = () => yardstick("x")
    for (let i = 0; i < 2_000; i++) {
      make()
      reference()
    }
    const ratios = Array.from({ length: RUNS }, () => timePerCall(make) / timePerCall(reference)).sort((a, b) => a - b)
    return ratios[Math.floor(RUNS / 2)]!
  }

  it.each([
    ["Map", 5, () => Map([["a", 1]])],
    ["Stack", 3, () => Stack(["a", "b"])],
    ["Obj", 9, () => Obj({ a: 1 })],
  ] as const)("building a %s costs at most %d times the yardstick", (name, bound, make) => {
    const ratio = ratioToYardstick(make)
    console.info(`${name}: ${ratio.toFixed(1)}x the yardstick (bound ${bound}x)`)
    expect(ratio, `${name} costs ${ratio.toFixed(1)}x the yardstick`).toBeLessThan(bound)
  })
})
