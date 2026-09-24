import { describe } from "vitest"
import { ruleTester } from "../utils/rule-tester"
import rule from "../../src/rules/prefer-functype-set"

describe("prefer-functype-set", () => {
  ruleTester.run("prefer-functype-set", rule, {
    valid: [
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
