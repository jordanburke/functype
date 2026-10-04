import { describe } from "vitest"

import rule from "../../src/rules/collection-naming"
import { ruleTester } from "../utils/rule-tester"

/**
 * functype's `Map` / `Set` are the default collections (Scala-style): imported under their own names,
 * with the built-in spelled `globalThis.Map` / `globalThis.Set` where it is genuinely needed. This rule
 * keeps that convention mechanical, and replaces TypeScript's TS7009 ("target lacks a construct
 * signature") or TS2350 (without noImplicitAny) with a message that says what to write instead.
 */
describe("collection-naming", () => {
  ruleTester.run("collection-naming", rule, {
    valid: [
      {
        name: "functype's Map imported under its own name",
        code: 'import { Map, Set } from "functype"\nconst m = Map.empty()',
      },
      { name: "Factory call, not new", code: 'import { Map } from "functype"\nconst m = Map([["a", 1]])' },
      {
        name: "The built-in spelled explicitly",
        code: 'import { Map } from "functype"\nconst m = new globalThis.Map()',
      },
      { name: "A built-in Map with no functype import", code: "const m = new Map()" },
      { name: "A local class named Map is not functype's", code: "class Map {}\nconst m = new Map()" },
      {
        name: "Other functype imports may be aliased",
        code: 'import { List as L } from "functype"\nconst xs = L([1])',
      },
      {
        name: "A non-functype library's Map alias is not checked",
        code: 'import { Map as IMap } from "immutable"\nconst m = IMap()',
      },
      {
        name: "allowAlias: true accepts an aliased import",
        code: 'import { Map as FMap } from "functype"\nconst m = FMap.empty()',
        options: [{ allowAlias: true }],
      },
    ],
    invalid: [
      {
        name: "new on functype's Map",
        code: 'import { Map } from "functype"\nconst m = new Map()',
        errors: [{ messageId: "newFunctypeCollection", data: { name: "Map", local: "Map" } }],
      },
      {
        name: "new on functype's Set",
        code: 'import { Set } from "functype"\nconst s = new Set([1])',
        errors: [{ messageId: "newFunctypeCollection", data: { name: "Set", local: "Set" } }],
      },
      {
        name: "new on functype's Map through a subpath import",
        code: 'import { Map } from "functype/map"\nconst m = new Map()',
        errors: [{ messageId: "newFunctypeCollection", data: { name: "Map", local: "Map" } }],
      },
      {
        name: "new on a namespace-qualified functype Map",
        code: 'import * as F from "functype"\nconst m = new F.Map()',
        errors: [{ messageId: "newFunctypeCollection", data: { name: "Map", local: "F.Map" } }],
      },
      {
        name: "Aliased import of functype's Map",
        code: 'import { Map as FMap } from "functype"\nconst m = FMap.empty()',
        errors: [{ messageId: "aliasedImport", data: { name: "Map", local: "FMap" } }],
      },
      {
        name: "Aliased type-only import of functype's Set",
        code: 'import type { Set as FSet } from "functype"\nlet s: FSet<number>',
        errors: [{ messageId: "aliasedImport", data: { name: "Set", local: "FSet" } }],
      },
      {
        name: "Aliased import and new on the alias report separately",
        code: 'import { Map as FMap } from "functype"\nconst m = new FMap()',
        errors: [
          { messageId: "aliasedImport", data: { name: "Map", local: "FMap" } },
          { messageId: "newFunctypeCollection", data: { name: "Map", local: "FMap" } },
        ],
      },
      {
        name: "The naming convention holds in test files",
        filename: "src/__tests__/x.test.ts",
        code: 'import { Map as FMap } from "functype"\nconst m = FMap.empty()',
        errors: [{ messageId: "aliasedImport", data: { name: "Map", local: "FMap" } }],
      },
    ],
  })
})
