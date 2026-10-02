import { describe } from "vitest"
import { ruleTester } from "../utils/rule-tester"
import rule from "../../src/rules/prefer-functype-set"

describe("prefer-functype-set", () => {
  ruleTester.run("prefer-functype-set", rule, {
    valid: [
      {
        name: "A type-only import of functype's Set is functype's Set in type positions",
        code: 'import type { Set } from "functype"\nlet m: Set<string>',
      },
      // A `new Set` that flows straight into a declared native read-only contract is what that
      // contract requires — the rule already accepts `ReadonlySet` annotations, so it must accept their value.
      {
        name: "Returned from a function declared to return ReadonlySet",
        code: "function f(e): ReadonlySet<string> { return new Set(e) }",
      },
      {
        name: "Returned from an async function declared to return Promise<ReadonlySet>",
        code: "async function f(): Promise<ReadonlySet<string>> { return new Set() }",
      },
      {
        name: "Arrow expression body with a ReadonlySet return type",
        code: "const g = (): ReadonlySet<string> => new Set()",
      },
      {
        name: "Ternary branch into a ReadonlySet-annotated binding",
        code: "const m: ReadonlySet<string> = cond ? g() : new Set()",
      },
      {
        name: "Nullish fallback into a ReadonlySet-annotated binding",
        code: "const m: ReadonlySet<string> = x ?? new Set()",
      },
      {
        name: "Asserted as ReadonlySet",
        code: "const m = new Set(e) as ReadonlySet<string>",
      },
      {
        name: "Class field annotated ReadonlySet",
        code: "class A { readonly m: ReadonlySet<string> = new Set() }",
      },
      {
        name: "Parameter default annotated ReadonlySet",
        code: "function f(m: ReadonlySet<string> = new Set()) { return m }",
      },
      {
        name: "functype's Set under its own name",
        code: 'import { Set } from "functype"\nconst m = new Set()',
      },
      {
        name: "A local binding named Set shadows the native one",
        code: "const Set = makeSet()\nconst m = new Set()",
      },
      // #329 review — more shapes that bind and then mutate a native Set.
      {
        name: "A let assigned later and then mutated",
        code: `let seen: Set<string>
seen = new Set()
seen.add("x")`,
      },
      {
        name: "An annotated parameter that is mutated",
        code: "export const track = (s: Set<string>, k: string) => { s.add(k) }",
      },
      {
        name: "A defaulted parameter that is mutated",
        code: "export function track(k: string, s = new Set<string>()) { s.add(k); return s }",
      },
      {
        name: "A constructor parameter property that is mutated through this",
        code: `class Store {
  constructor(private readonly ids = new Set<string>()) {}
  track(id: string) { this.ids.add(id) }
}`,
      },
      {
        name: "An annotated constructor parameter property that is mutated through this",
        code: `class Store {
  constructor(private readonly ids: Set<string>) {}
  track(id: string) { this.ids.add(id) }
}`,
      },
      {
        name: "A non-null asserted field that is mutated",
        code: `class Store {
  private ids?: Set<string> = new Set()
  track(id: string) { this.ids!.add(id) }
}`,
      },
      // #324 — a native Set that is mutated on purpose is a deliberate choice: functype's Set is
      // immutable, so it cannot express a cache, a registry or an in-place accumulator.
      {
        name: "A local Set that is later .add()-ed is mutable on purpose",
        code: `const seen = new Set<string>()
export const remember = (k: string) => seen.add(k)`,
      },
      {
        name: "A module-level Set mutated inside a nested function is mutable on purpose",
        code: `const seen = new Set<string>()
export function track(k: string) {
  const inner = () => seen.add(k)
  inner()
}`,
      },
      {
        name: "A Set annotation on a mutated binding is not reported either",
        code: `const seen: Set<string> = new Set()
seen.delete("x")`,
      },
      {
        name: "A class field mutated through this is mutable on purpose",
        code: `class Store {
  private readonly ids = new Set<string>()
  track(id: string) { this.ids.add(id) }
}`,
      },
      {
        name: "A field assigned in the constructor and cleared later is mutable on purpose",
        code: `class Cache {
  private keys: Set<string>
  constructor() { this.keys = new Set() }
  reset() { this.keys.clear() }
}`,
      },
      {
        name: "Copy-then-add is the React state update for a Set",
        code: "setSelected((prev) => new Set(prev).add(id))",
      },
      {
        name: "functype Set is fine",
        code: 'import { Set } from "functype"\nconst s = Set.empty()',
      },
      {
        name: "non-Set code is fine",
        code: 'const x: string = "hello"',
      },
    ],
    invalid: [
      {
        name: "A native Set annotation next to an aliased import points at the alias",
        code: 'import { Set as FSet } from "functype"\nlet m: Set<string>',
        errors: [
          {
            messageId: "preferFunctypeSet",
            data: { type: "string" },
            suggestions: [
              {
                messageId: "suggestUseLocalName",
                data: { name: "FSet" },
                output: 'import { Set as FSet } from "functype"\nlet m: FSet<string>',
              },
            ],
          },
        ],
      },
      {
        name: "A nested callback does not inherit the outer ReadonlySet return type",
        code: "function f(): ReadonlyArray<ReadonlySet<string>> { return build(() => new Set()) }",
        errors: [
          {
            messageId: "preferFunctypeSetLiteral",
            suggestions: [
              {
                messageId: "suggestSetEmpty",
                data: { name: "Set" },
                output: "function f(): ReadonlyArray<ReadonlySet<string>> { return build(() => Set.empty()) }",
              },
              {
                messageId: "suggestAddImport",
                data: { symbol: "Set" },
                output:
                  'import { Set } from "functype"\nfunction f(): ReadonlyArray<ReadonlySet<string>> { return build(() => new Set()) }',
              },
            ],
          },
        ],
      },
      {
        name: "An alias import of functype's Set does not silence the native Set",
        code: 'import { Set as FSet } from "functype"\nconst m = new Set(entries)',
        errors: [
          {
            messageId: "preferFunctypeSetLiteral",
            suggestions: [
              {
                messageId: "suggestSetFrom",
                data: { name: "FSet" },
                output: 'import { Set as FSet } from "functype"\nconst m = FSet(entries)',
              },
            ],
          },
        ],
      },
      {
        name: "An empty native Set next to an aliased import suggests the alias",
        code: 'import { Set as FSet } from "functype"\nconst m = new Set()',
        errors: [
          {
            messageId: "preferFunctypeSetLiteral",
            suggestions: [
              {
                messageId: "suggestSetEmpty",
                data: { name: "FSet" },
                output: 'import { Set as FSet } from "functype"\nconst m = FSet.empty()',
              },
            ],
          },
        ],
      },
      {
        name: "A builder chain on an empty new Set is a Set.of candidate, not a mutation",
        code: "const s = new Set().add(1).add(2)",
        errors: [
          {
            messageId: "preferFunctypeSetLiteral",
            suggestions: [
              { messageId: "suggestSetEmpty", output: "const s = Set.empty().add(1).add(2)" },
              {
                messageId: "suggestAddImport",
                data: { symbol: "Set" },
                output: `import { Set } from "functype"
const s = new Set().add(1).add(2)`,
              },
            ],
          },
        ],
      },
      {
        name: "allowMutable: false reports a mutated Set too",
        code: `const seen = new Set()
seen.add(1)`,
        options: [{ allowMutable: false }],
        errors: [
          {
            messageId: "preferFunctypeSetLiteral",
            suggestions: [
              {
                messageId: "suggestSetEmpty",
                output: `const seen = Set.empty()
seen.add(1)`,
              },
              {
                messageId: "suggestAddImport",
                data: { symbol: "Set" },
                output: `import { Set } from "functype"
const seen = new Set()
seen.add(1)`,
              },
            ],
          },
        ],
      },
      {
        name: "A Set whose only use is .has() is still reported",
        code: `const allowed = new Set()
export const ok = (k) => allowed.has(k)`,
        errors: [
          {
            messageId: "preferFunctypeSetLiteral",
            suggestions: [
              {
                messageId: "suggestSetEmpty",
                output: `const allowed = Set.empty()
export const ok = (k) => allowed.has(k)`,
              },
              {
                messageId: "suggestAddImport",
                data: { symbol: "Set" },
                output: `import { Set } from "functype"
const allowed = new Set()
export const ok = (k) => allowed.has(k)`,
              },
            ],
          },
        ],
      },
      {
        name: "new Set() should use Set.empty()",
        code: "const s = new Set()",
        errors: [
          {
            messageId: "preferFunctypeSetLiteral",
            suggestions: [
              {
                messageId: "suggestSetEmpty",
                output: "const s = Set.empty()",
              },
              {
                messageId: "suggestAddImport",
                data: { symbol: "Set" },
                output: 'import { Set } from "functype"\nconst s = new Set()',
              },
            ],
          },
        ],
        output: null,
      },
      {
        name: "new Set([...]) should use Set.of(...) with unwrapped elements",
        code: 'const s = new Set(["a", "b", "c"])',
        errors: [
          {
            messageId: "preferFunctypeSetLiteral",
            suggestions: [
              {
                messageId: "suggestSetOf",
                output: 'const s = Set.of("a", "b", "c")',
              },
              {
                messageId: "suggestAddImport",
                data: { symbol: "Set" },
                output: 'import { Set } from "functype"\nconst s = new Set(["a", "b", "c"])',
              },
            ],
          },
        ],
        output: null,
      },
      {
        name: "new Set(variable) should use Set(variable)",
        code: "const s = new Set(items)",
        errors: [
          {
            messageId: "preferFunctypeSetLiteral",
            suggestions: [
              {
                messageId: "suggestSetFrom",
                output: "const s = Set(items)",
              },
              {
                messageId: "suggestAddImport",
                data: { symbol: "Set" },
                output: 'import { Set } from "functype"\nconst s = new Set(items)',
              },
            ],
          },
        ],
        output: null,
      },
      {
        name: "Set<string> type annotation with new Set() should report two errors",
        code: "const s: Set<string> = new Set()",
        errors: [
          {
            messageId: "preferFunctypeSet",
            data: { type: "string" },
            suggestions: [
              {
                messageId: "suggestAddImport",
                data: { symbol: "Set" },
                output: 'import { Set } from "functype"\nconst s: Set<string> = new Set()',
              },
            ],
          },
          {
            messageId: "preferFunctypeSetLiteral",
            suggestions: [
              {
                messageId: "suggestSetEmpty",
                output: "const s: Set<string> = Set.empty()",
              },
              {
                messageId: "suggestAddImport",
                data: { symbol: "Set" },
                output: 'import { Set } from "functype"\nconst s: Set<string> = new Set()',
              },
            ],
          },
        ],
        output: null,
      },
    ],
  })
})
