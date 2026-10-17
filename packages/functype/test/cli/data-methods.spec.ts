import { describe, expect, it } from "vitest"

import { TYPES } from "@/cli/data"
import { Either, Identity, Lazy, LazyList, List, Map, Obj, Option, Set, Stack, Try, Tuple } from "@/index"

/**
 * Asserts that every instance method listed in src/cli/data.ts exists on a real
 * instance of that type. The method lists are hand-curated and the MCP server's
 * get_type_api serves them verbatim, so a listed method that does not exist sends
 * users to code that does not compile — Map once listed .keys()/.values()/.set()
 * and Tuple listed .first/.second, none of which were ever part of the API.
 *
 * Only entries written as `.name...` are checked; static calls (`Lazy.fromJSON`),
 * imports and iteration notes are skipped. Types that need an effect or setup to
 * build a sample (IO, Task, Http, ...) are not covered yet.
 */
const samples: Record<string, object> = {
  Option: Option(1),
  Either: Either.right(1),
  Try: Try(() => 1),
  List: List([1]),
  Set: Set([1]),
  Obj: Obj({ a: 1 }),
  Map: Map([["a", 1]]),
  Lazy: Lazy(() => 1),
  LazyList: LazyList([1]),
  Tuple: Tuple([1, 2]),
  Stack: Stack([1]),
  Identity: Identity(1),
}

const listedMethods = (typeName: string): string[] => {
  const { create = [], transform = [], extract = [], check = [], other = [] } = TYPES[typeName]?.methods ?? {}
  return [...create, ...transform, ...extract, ...check, ...other]
    .filter((entry) => entry.startsWith("."))
    .map((entry) => entry.slice(1).split(/[^A-Za-z0-9_$]/)[0] ?? "")
}

describe("cli/data.ts methods ↔ runtime instances", () => {
  for (const [typeName, instance] of Object.entries(samples)) {
    it(`every listed ${typeName} method exists on an instance`, () => {
      const missing = listedMethods(typeName).filter((name) => !(name in instance))
      expect(missing).toEqual([])
    })
  }

  it("every sampled type has a TYPES entry", () => {
    const missing = Object.keys(samples).filter((n) => !TYPES[n])
    expect(missing).toEqual([])
  })
})
