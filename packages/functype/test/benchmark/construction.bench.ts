/**
 * Construction cost per type. Run with `pnpm bench`.
 * - Collections: issue #511 (collection construction cost). test/collections/construction-cost.spec.ts
 *   holds their CI guard.
 * - Option, Either and Try: issue #539 (every method copied onto every value). Each case builds a
 *   value and maps it once, the pattern a render loop runs. The bar is about 2x the plain object.
 * - IO and Exit: #276 §14 (values share their methods). Every `.map` on an IO builds a new IO, and
 *   every interpreter step builds an Exit, so these time building both and running a chain.
 *   test/io/io-prototype.spec.ts holds their CI guard.
 * - Collections on shared prototypes: #276 §14, PR 3, with §13 (tail() is a method). These build and
 *   map each collection, and walk a List with tail(), which copies the rest of the List every step.
 * - Tuple and Lazy on shared prototypes: #276 §14, PR 4. A Lazy used to cost about 2 µs to build,
 *   because its three getter closures gave every Lazy its own hidden class. These build each, call
 *   one method, and run a Lazy's thunk for the first time. test/tuple/tuple-prototype.spec.ts and
 *   test/lazy/lazy-prototype.spec.ts hold their CI guards.
 * This file is for looking.
 */
import { describe, test } from "vitest"

import { Exit, IO, Lazy, LazyList, Left, List, Map, Obj, Option, Right, Set, Some, Stack, Try, Tuple } from "@/index"

const cases: ReadonlyArray<readonly [string, () => unknown]> = [
  ['List(["a", "b"])', () => List(["a", "b"])],
  ["List()", () => List()],
  ['Set(["a", "b"])', () => Set(["a", "b"])],
  ['Map([["a", 1]])', () => Map([["a", 1]])],
  ['Stack(["a", "b"])', () => Stack(["a", "b"])],
  ['LazyList(["a", "b"])', () => LazyList(["a", "b"])],
  ["Obj({ a: 1 })", () => Obj({ a: 1 })],
  ['Option("x"), for scale', () => Option("x")],
]

describe("construction", () => {
  cases.forEach(([name, make]) => {
    test(name, async ({ bench }) => {
      await bench(name, () => {
        make()
      }).run()
    })
  })
})

const inc = (x: number): number => x + 1

// Read each export once. Vitest wraps module exports in getters, which would add to every call.
const [some, option, right, left, tryOf] = [Some, Option, Right, Left, Try] as const
const { succeed: ioSucceed } = IO
const { succeed: exitSucceed, fail: exitFail } = Exit
const chain50 = Array.from({ length: 50 }).reduce<IO<never, never, number>>((io) => io.map(inc), ioSucceed(0))

const valueCases: ReadonlyArray<readonly [string, (i: number) => unknown]> = [
  ["plain { _tag, value }, for scale", (i) => ({ _tag: "Some", value: inc(i) })],
  ["Some(i).map", (i) => some(i).map(inc)],
  ["Option(i).map", (i) => option(i).map(inc)],
  ["Right(i).map", (i) => right<string, number>(i).map(inc)],
  ["Left(i).map", (i) => left<number, number>(i).map(inc)],
  ["Try(() => i).map", (i) => tryOf(() => i).map(inc)],
  ["Exit.succeed(i)", (i) => exitSucceed(i)],
  ["Exit.succeed(i).map", (i) => exitSucceed(i).map(inc)],
  ["Exit.fail(i)", (i) => exitFail(i)],
  ["IO.succeed(i).map", (i) => ioSucceed(i).map(inc)],
  ["IO.succeed(i).map, then runSyncOrThrow", (i) => ioSucceed(i).map(inc).runSyncOrThrow()],
  ["a 50-step IO map chain, runSync", () => chain50.runSync()],
]

describe("value construction", () => {
  valueCases.forEach(([name, make]) => {
    test(name, async ({ bench }) => {
      // eslint-disable-next-line functional/no-let -- a fresh input each call, so V8 can't fold the work away
      let i = 0
      await bench(name, () => {
        make(i++)
      }).run()
    })
  })
})

// Read each export once, as above.
const [list, set, map, stack, lazyList, obj] = [List, Set, Map, Stack, LazyList, Obj] as const
const big = list(Array.from({ length: 5_000 }, (_, i) => i))

const collectionCases: ReadonlyArray<readonly [string, (i: number) => unknown]> = [
  ["List([i, 1, 2]).map", (i) => list([i, 1, 2]).map(inc)],
  ["Set([i, 1, 2]).map", (i) => set([i, 1, 2]).map(inc)],
  ['Map([["a", i]]).map', (i) => map([["a", i]]).map(inc)],
  ["Stack([i, 1, 2]).map", (i) => stack([i, 1, 2]).map(inc)],
  ["LazyList([i, 1, 2]).map", (i) => lazyList([i, 1, 2]).map(inc)],
  ["Obj({ a: i }).map", (i) => obj({ a: i }).map((o) => ({ a: inc(o.a) }))],
]

describe("collection construction", () => {
  collectionCases.forEach(([name, make]) => {
    test(name, async ({ bench }) => {
      // eslint-disable-next-line functional/no-let -- a fresh input each call, so V8 can't fold the work away
      let i = 0
      await bench(name, () => {
        make(i++)
      }).run()
    })
  })

  test("walk a 5,000-item List with tail()", async ({ bench }) => {
    await bench("walk a 5,000-item List with tail()", () => {
      // eslint-disable-next-line functional/no-let -- the walk §13 describes
      let l = big
      while (!l.isEmpty) l = l.tail()
    }).run()
  })
})

// Read each export once, as above.
const [tuple, lazy] = [Tuple, Lazy] as const

const tupleLazyCases: ReadonlyArray<readonly [string, (i: number) => unknown]> = [
  ["plain { _tag, value }, for scale", (i) => ({ _tag: "Tuple", value: [i, 1] })],
  ["Tuple([i, 1])", (i) => tuple([i, 1])],
  ["Tuple([i, 1]).get(0)", (i) => tuple([i, 1]).get(0)],
  ["Tuple.pair(i, 1).map", (i) => tuple.pair(i, 1).map(([a, b]) => [inc(a), b])],
  ["Lazy(() => i)", (i) => lazy(() => i)],
  ["Lazy(() => i).map", (i) => lazy(() => i).map(inc)],
  ["Lazy(() => i).orThrow(), its first evaluation", (i) => lazy(() => i).orThrow()],
  [
    "Lazy(() => i).map(inc).orThrow()",
    (i) =>
      lazy(() => i)
        .map(inc)
        .orThrow(),
  ],
]

describe("Tuple and Lazy construction", () => {
  tupleLazyCases.forEach(([name, make]) => {
    test(name, async ({ bench }) => {
      // eslint-disable-next-line functional/no-let -- a fresh input each call, so V8 can't fold the work away
      let i = 0
      await bench(name, () => {
        make(i++)
      }).run()
    })
  })
})
