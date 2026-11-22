/**
 * Guards the construction cost of the collections (#276 §14, PR 3; before that, issue #511).
 *
 * Each case builds a collection and maps it once, and is timed as a ratio to a plain object that
 * does the same data work: it builds the same arrays, native Sets or native Maps, but has no
 * methods and isn't frozen. Ratios hold across machines far better than times do. The medians
 * below were measured locally on Node 24.20.0 with this loop, before (each value built ~30 to 70
 * closures, 1.27 / origin/main) and after (one shared prototype per type). Each bound sits far
 * below the old ratio, with room for a slow or instrumented runner.
 *
 * What's left of the cost is mostly Object.freeze: collections stay frozen per value (#276 §14
 * Rules), and freezing costs about 14 ns, more than building the value on its prototype.
 *
 * The shape (own keys, shared prototype, frozen values) is pinned in collection-prototype.spec.ts.
 */
import { describe, expect, it } from "vitest"

import { LazyList, List, Map, Obj, Set, Stack } from "@/index"

const inc = (x: number): number => x + 1

describe("construction cost", { retry: 2 }, () => {
  const RUNS = 9
  const N = 20_000

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

  /** The smallest of interleaved runs of (time to build and map the value) / (time for the plain object). */
  const ratioToPlain = (make: (i: number) => unknown, plain: (i: number) => unknown): number => {
    for (let i = 0; i < 2_000; i++) {
      make(i)
      plain(i)
    }
    const ratios = Array.from({ length: RUNS }, () => timePerCall(make) / timePerCall(plain)).sort((a, b) => a - b)
    return ratios[0]!
  }

  // Read each export once. Vitest wraps module exports in getters, which would add to every call.
  const [list, set, map, stack, lazyList, obj] = [List, Set, Map, Stack, LazyList, Obj] as const
  const NativeSet = globalThis.Set
  const NativeMap = globalThis.Map

  // [name, bound, median measured before -> after, build + map, the plain object doing the same data work]
  it.each([
    [
      "List",
      15,
      "84x -> 3.4x",
      (i: number) => list([i, 1, 2]).map(inc),
      (i: number) => ({ _tag: "List", value: Array.from([i, 1, 2]) }).value.map(inc),
    ],
    [
      // Measured 0.7x to 0.8x over seven runs of this file alone (median 0.7x).
      "Set",
      5,
      "11x -> 0.7x",
      (i: number) => set([i, 1, 2]).map(inc),
      (i: number) => new NativeSet(Array.from({ _tag: "Set", value: new NativeSet([i, 1, 2]) }.value, inc)),
    ],
    [
      // Map's map() goes through Tuples on both sides, so this times building alone.
      "Map",
      5,
      "9x -> 1.9x",
      (i: number) => map([["a", i]]),
      (i: number) => ({ _tag: "Map", value: new NativeMap([["a", i]]) }),
    ],
    [
      "Stack",
      8,
      "10x -> 3.1x",
      (i: number) => stack([i, 1, 2]).map(inc),
      (i: number) => ({ _tag: "Stack", value: [...{ _tag: "Stack", value: [i, 1, 2] }.value].map(inc) }),
    ],
    [
      "LazyList",
      6,
      "15x -> 1.2x",
      (i: number) => lazyList([i, 1, 2]).map(inc),
      (i: number) => {
        const source = [i, 1, 2]
        return {
          _tag: "LazyList",
          source: (function* () {
            for (const item of source) yield inc(item)
          })(),
        }
      },
    ],
    [
      "Obj",
      40,
      "137x -> 9.1x",
      (i: number) => obj({ a: i }).map((o) => ({ a: inc(o.a) })),
      (i: number) => ({ _tag: "Obj", data: { a: inc({ _tag: "Obj", data: { a: i } }.data.a) } }),
    ],
  ] as const)(
    "a %s costs at most %dx a plain object doing the same work (%s)",
    (name, bound, _measured, make, plain) => {
      const ratio = ratioToPlain(make, plain)
      console.info(`${name}: ${ratio.toFixed(1)}x a plain object (bound ${bound}x)`)
      expect(ratio, `${name} costs ${ratio.toFixed(1)}x a plain object`).toBeLessThan(bound)
    },
  )
})
