import { describe } from "vitest"

import rule from "../../src/rules/prefer-list"
import { typedFilename, typedRuleTester } from "../utils/typed-rule-tester"

/**
 * With type information, an array literal passed where an array is expected is the boundary itself:
 * it goes straight to code that requires an array (drizzle's `.values([...])`, an index definition, a
 * schema `target: [...]`) and never becomes a collection in your own code. CivalaOS: 616 of its 821
 * prefer-list hits were literals, nearly all of this kind.
 */

// The fixture lives under tests/, which the rule skips by default (allowArraysInTests).
const options = [{ allowArraysInTests: false }]

const literal = (code: string, elements: string) => ({
  code,
  filename: typedFilename,
  options,
  errors: [
    {
      messageId: "preferListLiteral" as const,
      suggestions: [
        { messageId: "suggestListOf" as const, output: code.replace(`[${elements}]`, `List.of(${elements})`) },
        {
          messageId: "suggestAddImport" as const,
          data: { symbol: "List" },
          output: `import { List } from "functype"\n${code}`,
        },
      ],
    },
  ],
})

describe("prefer-list (type-aware)", () => {
  typedRuleTester.run("prefer-list", rule, {
    valid: [
      {
        name: "A literal passed to an array-typed parameter",
        filename: typedFilename,
        options,
        code: "declare function insertRows(rows: ReadonlyArray<{ id: number }>): void; insertRows([{ id: 1 }, { id: 2 }])",
      },
      {
        name: "A literal initialising an array-typed property",
        filename: typedFilename,
        options,
        code: 'declare function upsert(o: { target: ReadonlyArray<string> }): void; upsert({ target: ["a", "b"] })',
      },
      {
        name: "A literal returned from a callback whose return type is an array",
        filename: typedFilename,
        options,
        code: "declare function defineIndexes(cb: (t: number) => ReadonlyArray<number>): void; defineIndexes((t) => [t, t + 1])",
      },
      {
        name: "A literal passed to an untyped (any) parameter",
        filename: typedFilename,
        options,
        code: "declare function legacy(x: any): void; legacy([1, 2])",
      },
      {
        name: "A literal passed to a parameter typed as a tuple",
        filename: typedFilename,
        options,
        code: "declare function between(range: readonly [number, number]): void; between([1, 9])",
      },
      {
        name: "A literal captured straight into a functype constructor",
        filename: typedFilename,
        options,
        code: 'import { List } from "functype"; declare const seen: globalThis.Map<string, number>; export const xs = List([...seen])',
      },
      {
        name: "A const whose every use hands it to an array-typed slot",
        filename: typedFilename,
        options,
        code: 'declare function select(o: { data: ReadonlyArray<string> }): void; const OPTIONS = ["a", "b"]; select({ data: OPTIONS }); select({ data: [...OPTIONS, "c"] })',
      },
    ],
    invalid: [
      // One use is not an array slot (`.length`), so the const is a collection in your own code.
      literal(
        'declare function select(o: { data: ReadonlyArray<string> }): void; const OPTIONS = ["a", "b"]; select({ data: OPTIONS }); export const n = OPTIONS.length',
        '"a", "b"',
      ),
      literal("export const ids = [1, 2, 3]", "1, 2, 3"),
      literal('export const upper = ["a", "b"].map((s) => s.toUpperCase())', '"a", "b"'),
    ],
  })
})
