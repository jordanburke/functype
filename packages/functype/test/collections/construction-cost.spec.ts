/**
 * Guards against the construction cost of issue #511 coming back.
 *
 * Two kinds of check:
 * - Shape, which is deterministic: which own properties are getters, and that instances are frozen.
 *   A getter written back into an object literal shows up here, whatever the machine.
 * - Cost, as a ratio to building an `Option` over the same loop. Ratios hold across machines far
 *   better than times do. Each bound sits between the measured ratio before the fix and after it,
 *   loose enough for a slow or instrumented runner.
 *
 * Ratios this test measured on Node 24.20.0, before -> after the fix: List 12.9x -> 4.3x,
 * Map 8.9x -> 1.4x, Stack 7.2x -> 0.6x, Obj 14.2x -> 2.1x. (Against the built package the gaps are
 * wider: List 33x -> 5.7x.) Set went from 8.3x to 5.6x and LazyList from 11.6x to 5.7x. Those gaps
 * are too narrow for a timing bound, so only their shape is checked.
 */
import { describe, expect, it } from "vitest"

import { LazyList, List, Map, Obj, Option, Set, Stack } from "@/index"

const accessors = (value: object): string[] =>
  Object.entries(Object.getOwnPropertyDescriptors(value))
    .filter(([, descriptor]) => descriptor.get !== undefined)
    .map(([key]) => key)
    .sort()

describe("construction shape", () => {
  it.each([
    ["List", () => List([1, 2]), ["headOption", "init", "lastOption", "tail"]],
    ["List()", () => List(), ["headOption", "init", "lastOption", "tail"]],
    ["Set", () => Set([1, 2]), ["head", "headOption", "init", "last", "lastOption", "tail"]],
    ["Map", () => Map([["a", 1]]), []],
    ["Stack", () => Stack([1, 2]), []],
    ["LazyList", () => LazyList([1, 2]), ["head", "headOption", "init", "last", "lastOption", "tail"]],
    ["Obj", () => Obj({ a: 1 }), ["isEmpty", "size"]],
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

describe("construction cost", () => {
  const RUNS = 7
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

  /** Median over several interleaved runs of (time to build the value) / (time to build an Option). */
  const ratioToOption = (make: () => unknown): number => {
    const option = () => Option("x")
    for (let i = 0; i < 2_000; i++) {
      make()
      option()
    }
    const ratios = Array.from({ length: RUNS }, () => timePerCall(make) / timePerCall(option)).sort((a, b) => a - b)
    return ratios[Math.floor(RUNS / 2)]!
  }

  it.each([
    ["List", 8, () => List(["a", "b"])],
    ["List()", 8, () => List()],
    ["Map", 4, () => Map([["a", 1]])],
    ["Stack", 3, () => Stack(["a", "b"])],
    ["Obj", 6, () => Obj({ a: 1 })],
  ] as const)("building a %s costs at most %d times an Option", (name, bound, make) => {
    const ratio = ratioToOption(make)
    console.info(`${name}: ${ratio.toFixed(1)}x an Option (bound ${bound}x)`)
    expect(ratio, `${name} costs ${ratio.toFixed(1)}x an Option`).toBeLessThan(bound)
  })
})
