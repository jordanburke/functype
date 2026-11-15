/**
 * Construction cost per type (issue #511). Run with `pnpm bench`.
 * test/collections/construction-cost.spec.ts holds the CI guard; this file is for looking.
 */
import { describe, test } from "vitest"

import { LazyList, List, Map, Obj, Option, Set, Stack } from "@/index"

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
