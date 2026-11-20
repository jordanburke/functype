/**
 * Construction cost per type. Run with `pnpm bench`.
 * - Collections: issue #511 (collection construction cost). test/collections/construction-cost.spec.ts
 *   holds their CI guard.
 * - Option, Either and Try: issue #539 (every method copied onto every value). Each case builds a
 *   value and maps it once, the pattern a render loop runs. The bar is about 2x the plain object.
 * This file is for looking.
 */
import { describe, test } from "vitest"

import { LazyList, Left, List, Map, Obj, Option, Right, Set, Some, Stack, Try } from "@/index"

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

const valueCases: ReadonlyArray<readonly [string, (i: number) => unknown]> = [
  ["plain { _tag, value }, for scale", (i) => ({ _tag: "Some", value: inc(i) })],
  ["Some(i).map", (i) => some(i).map(inc)],
  ["Option(i).map", (i) => option(i).map(inc)],
  ["Right(i).map", (i) => right<string, number>(i).map(inc)],
  ["Left(i).map", (i) => left<number, number>(i).map(inc)],
  ["Try(() => i).map", (i) => tryOf(() => i).map(inc)],
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
