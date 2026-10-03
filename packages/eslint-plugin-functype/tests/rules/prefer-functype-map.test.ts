import { describe } from "vitest"
import { ruleTester } from "../utils/rule-tester"
import rule from "../../src/rules/prefer-functype-map"

describe("prefer-functype-map", () => {
  ruleTester.run("prefer-functype-map", rule, {
    valid: [
      // The explicit built-in spelling (`globalThis.Map`) keeps the same exemptions as a bare one.
      {
        name: "new globalThis.Map that is mutated on purpose",
        code: "const c = new globalThis.Map()\nc.set('a', 1)",
      },
      {
        name: "new globalThis.Map flowing into a ReadonlyMap contract",
        code: "function f(): ReadonlyMap<string, number> { return new globalThis.Map() }",
      },
      {
        name: "A mutated binding annotated globalThis.Map",
        code: "const c: globalThis.Map<string, number> = make()\nc.set('a', 1)",
      },
      {
        name: "A type-only import of functype's Map is functype's Map in type positions",
        code: 'import type { Map } from "functype"\nlet m: Map<string, number>',
      },
      // A `new Map` that flows straight into a declared native read-only contract is what that
      // contract requires — the rule already accepts `ReadonlyMap` annotations, so it must accept their value.
      {
        name: "Returned from a function declared to return ReadonlyMap",
        code: "function f(e): ReadonlyMap<string, number> { return new Map(e) }",
      },
      {
        name: "Returned from an async function declared to return Promise<ReadonlyMap>",
        code: "async function f(): Promise<ReadonlyMap<string, number>> { return new Map() }",
      },
      {
        name: "Arrow expression body with a ReadonlyMap return type",
        code: "const g = (): ReadonlyMap<string, number> => new Map()",
      },
      {
        name: "Ternary branch into a ReadonlyMap-annotated binding",
        code: "const m: ReadonlyMap<string, number> = cond ? g() : new Map()",
      },
      {
        name: "Nullish fallback into a ReadonlyMap-annotated binding",
        code: "const m: ReadonlyMap<string, number> = x ?? new Map()",
      },
      {
        name: "Asserted as ReadonlyMap",
        code: "const m = new Map(e) as ReadonlyMap<string, number>",
      },
      {
        name: "Class field annotated ReadonlyMap",
        code: "class A { readonly m: ReadonlyMap<string, number> = new Map() }",
      },
      {
        name: "Parameter default annotated ReadonlyMap",
        code: "function f(m: ReadonlyMap<string, number> = new Map()) { return m }",
      },
      {
        name: "functype's Map under its own name",
        code: 'import { Map } from "functype"\nconst m = new Map()',
      },
      {
        name: "A local binding named Map shadows the native one",
        code: "const Map = makeMap()\nconst m = new Map()",
      },
      // #324 — mutated native Maps are deliberate (caches, registries, DI containers).
      {
        name: "A module-level registry that is .set() later is mutable on purpose",
        code: `const registry = new Map<string, () => void>()
export const register = (k: string, f: () => void) => { registry.set(k, f) }`,
      },
      {
        name: "A class-field token cache that is .delete()-d is mutable on purpose",
        code: `class Tokens {
  #byUser: Map<string, string> = new Map()
  evict(u: string) { this.#byUser.delete(u) }
}`,
      },
      // Already using functype Map
      {
        name: "functype Map.empty() is allowed",
        code: 'import { Map } from "functype"\nconst m = Map.empty()',
      },
      // functype Map.of() is allowed
      {
        name: "functype Map.of() is allowed",
        code: 'import { Map } from "functype"\nconst m = Map.of(["a", 1], ["b", 2])',
      },
      // Non-Map code is fine
      {
        name: "Non-Map code is allowed",
        code: 'const x: string = "hello"',
      },
      // functype Map type annotation is allowed
      {
        name: "functype Map type annotation is allowed",
        code: 'import { Map } from "functype"\nconst m: Map<string, number> = Map.empty()',
      },
    ],
    invalid: [
      // #349 — `globalThis.Map` is the explicit built-in spelling under the functype-by-default convention;
      // it must be as visible as a bare `new Map()`, not an escape hatch.
      {
        name: "new globalThis.Map that is only read",
        code: "const c = new globalThis.Map()",
        errors: [
          {
            messageId: "preferFunctypeMapLiteral",
            suggestions: [
              { messageId: "suggestMapEmpty", data: { name: "Map" }, output: "const c = Map.empty()" },
              {
                messageId: "suggestAddImport",
                data: { symbol: "Map" },
                output: 'import { Map } from "functype"\nconst c = new globalThis.Map()',
              },
            ],
          },
        ],
      },
      {
        name: "new globalThis.Map next to functype's Map suggests functype's",
        code: 'import { Map } from "functype"\nconst c = new globalThis.Map(xs)',
        errors: [
          {
            messageId: "preferFunctypeMapLiteral",
            suggestions: [
              {
                messageId: "suggestMapFrom",
                data: { name: "Map" },
                output: 'import { Map } from "functype"\nconst c = Map(xs)',
              },
            ],
          },
        ],
      },
      {
        name: "A globalThis.Map type annotation on a read-only binding",
        code: "let c: globalThis.Map<string, number>",
        errors: [
          {
            messageId: "preferFunctypeMap",
            data: { keyType: "string", valueType: "number" },
            suggestions: [
              {
                messageId: "suggestAddImport",
                data: { symbol: "Map" },
                output: 'import { Map } from "functype"\nlet c: globalThis.Map<string, number>',
              },
            ],
          },
        ],
      },
      {
        name: "new ESMap (functype's re-export of the built-in) is the built-in",
        code: 'import { ESMap } from "functype"\nconst m = new ESMap()',
        errors: [
          {
            messageId: "preferFunctypeMapLiteral",
            suggestions: [
              {
                messageId: "suggestMapEmpty",
                data: { name: "Map" },
                output: 'import { ESMap } from "functype"\nconst m = Map.empty()',
              },
              {
                messageId: "suggestAddImport",
                data: { symbol: "Map" },
                output: 'import { ESMap, Map } from "functype"\nconst m = new ESMap()',
              },
            ],
          },
        ],
      },
      {
        name: "A native Map annotation next to an aliased import points at the alias",
        code: 'import { Map as FMap } from "functype"\nlet m: Map<string, number>',
        errors: [
          {
            messageId: "preferFunctypeMap",
            data: { keyType: "string", valueType: "number" },
            suggestions: [
              {
                messageId: "suggestUseLocalName",
                data: { name: "FMap" },
                output: 'import { Map as FMap } from "functype"\nlet m: FMap<string, number>',
              },
            ],
          },
        ],
      },
      {
        name: "A nested callback does not inherit the outer ReadonlyMap return type",
        code: "function f(): ReadonlyArray<ReadonlyMap<string, number>> { return build(() => new Map()) }",
        errors: [
          {
            messageId: "preferFunctypeMapLiteral",
            suggestions: [
              {
                messageId: "suggestMapEmpty",
                data: { name: "Map" },
                output: "function f(): ReadonlyArray<ReadonlyMap<string, number>> { return build(() => Map.empty()) }",
              },
              {
                messageId: "suggestAddImport",
                data: { symbol: "Map" },
                output:
                  'import { Map } from "functype"\nfunction f(): ReadonlyArray<ReadonlyMap<string, number>> { return build(() => new Map()) }',
              },
            ],
          },
        ],
      },
      {
        name: "An alias import of functype's Map does not silence the native Map",
        code: 'import { Map as FMap } from "functype"\nconst m = new Map(entries)',
        errors: [
          {
            messageId: "preferFunctypeMapLiteral",
            suggestions: [
              {
                messageId: "suggestMapFrom",
                data: { name: "FMap" },
                output: 'import { Map as FMap } from "functype"\nconst m = FMap(entries)',
              },
            ],
          },
        ],
      },
      {
        name: "An empty native Map next to an aliased import suggests the alias",
        code: 'import { Map as FMap } from "functype"\nconst m = new Map()',
        errors: [
          {
            messageId: "preferFunctypeMapLiteral",
            suggestions: [
              {
                messageId: "suggestMapEmpty",
                data: { name: "FMap" },
                output: 'import { Map as FMap } from "functype"\nconst m = FMap.empty()',
              },
            ],
          },
        ],
      },
      {
        name: "A builder chain on an empty new Map is a Map.of candidate, not a mutation",
        code: "const m = new Map().set('a', 1).set('b', 2)",
        errors: [
          {
            messageId: "preferFunctypeMapLiteral",
            suggestions: [
              { messageId: "suggestMapEmpty", output: "const m = Map.empty().set('a', 1).set('b', 2)" },
              {
                messageId: "suggestAddImport",
                data: { symbol: "Map" },
                output: `import { Map } from "functype"
const m = new Map().set('a', 1).set('b', 2)`,
              },
            ],
          },
        ],
      },
      {
        name: "allowMutable: false reports a mutated Map too",
        code: `const cache = new Map()
cache.set("k", 1)`,
        options: [{ allowMutable: false }],
        errors: [
          {
            messageId: "preferFunctypeMapLiteral",
            suggestions: [
              {
                messageId: "suggestMapEmpty",
                output: `const cache = Map.empty()
cache.set("k", 1)`,
              },
              {
                messageId: "suggestAddImport",
                data: { symbol: "Map" },
                output: `import { Map } from "functype"
const cache = new Map()
cache.set("k", 1)`,
              },
            ],
          },
        ],
      },
      // new Map() with no args → Map.empty()
      {
        name: "new Map() should use Map.empty()",
        code: "const m = new Map()",
        errors: [
          {
            messageId: "preferFunctypeMapLiteral",
            suggestions: [
              {
                messageId: "suggestMapEmpty",
                output: "const m = Map.empty()",
              },
              {
                messageId: "suggestAddImport",
                data: { symbol: "Map" },
                output: 'import { Map } from "functype"\nconst m = new Map()',
              },
            ],
          },
        ],
      },
      // new Map with array of tuples → Map.of(...)
      {
        name: "new Map([...]) should use Map.of(...)",
        code: 'const m = new Map([["a", 1], ["b", 2]])',
        errors: [
          {
            messageId: "preferFunctypeMapLiteral",
            suggestions: [
              {
                messageId: "suggestMapOf",
                output: 'const m = Map.of(["a", 1], ["b", 2])',
              },
              {
                messageId: "suggestAddImport",
                data: { symbol: "Map" },
                output: 'import { Map } from "functype"\nconst m = new Map([["a", 1], ["b", 2]])',
              },
            ],
          },
        ],
      },
      // new Map(entries) → Map(entries)
      {
        name: "new Map(entries) should use Map(entries)",
        code: "const m = new Map(entries)",
        errors: [
          {
            messageId: "preferFunctypeMapLiteral",
            suggestions: [
              {
                messageId: "suggestMapFrom",
                output: "const m = Map(entries)",
              },
              {
                messageId: "suggestAddImport",
                data: { symbol: "Map" },
                output: 'import { Map } from "functype"\nconst m = new Map(entries)',
              },
            ],
          },
        ],
      },
      // Map<K, V> type annotation → two errors (type + new expression)
      {
        name: "Map<K, V> type annotation and new Map() both flagged",
        code: "const m: Map<string, number> = new Map()",
        errors: [
          {
            messageId: "preferFunctypeMap",
            data: { keyType: "string", valueType: "number" },
            suggestions: [
              {
                messageId: "suggestAddImport",
                data: { symbol: "Map" },
                output: 'import { Map } from "functype"\nconst m: Map<string, number> = new Map()',
              },
            ],
          },
          {
            messageId: "preferFunctypeMapLiteral",
            suggestions: [
              {
                messageId: "suggestMapEmpty",
                output: "const m: Map<string, number> = Map.empty()",
              },
              {
                messageId: "suggestAddImport",
                data: { symbol: "Map" },
                output: 'import { Map } from "functype"\nconst m: Map<string, number> = new Map()',
              },
            ],
          },
        ],
      },
    ],
  })
})
