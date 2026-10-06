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
      {
        name: "A literal spread into a variadic call",
        filename: typedFilename,
        options,
        code: "declare const flag: boolean; hostAnd(1, ...(flag ? [2] : []))",
      },
      {
        name: "A const only spread into a variadic call",
        filename: typedFilename,
        options,
        code: "const conds = [1, 2]; hostAnd(...conds)",
      },
      {
        name: "A literal inside an object passed to an untyped parameter (a JSON request body)",
        filename: typedFilename,
        options,
        code: 'export const body = JSON.stringify({ content: { parts: [{ text: "hi" }] } })',
      },
      {
        name: "A cast whose target is a parameter that requires a mutable array",
        filename: typedFilename,
        options,
        code: 'declare const params: ReadonlyArray<unknown>; hostQuery("select 1", params as unknown[])',
      },
      {
        name: "A mutable-typed const handed to a slot that requires a mutable array",
        filename: typedFilename,
        options,
        code: "const rows: { id: number }[] = hostLoadRows(); hostInsertRows(rows)",
      },
      {
        name: "A mutable-typed const passed as a shorthand property to a slot that requires a mutable array",
        filename: typedFilename,
        options,
        code: 'declare const id: string; const params: unknown[] = [id]; hostRun({ sql: "select 1", params })',
      },
      {
        name: "A function whose declared return type feeds a slot that requires a mutable array",
        filename: typedFilename,
        options,
        code: "declare const servers: ReadonlyArray<string>; function allowedTools(): string[] { return servers.map((s) => `mcp__${s}`) } hostAgent({ allowedTools: allowedTools() })",
      },
      {
        name: "A string | string[] option for a library that requires it",
        filename: typedFilename,
        options,
        code: "declare const aud: ReadonlyArray<string>; const audience: string | string[] = [...aud]; hostVerify({ audience })",
      },
    ],
    invalid: [
      {
        name: "A mutable array changed in place gets advice, not a ReadonlyArray suggestion that wouldn't compile",
        filename: typedFilename,
        options,
        code: 'export function collect(): ReadonlyArray<string> { const acc: string[] = []; acc.push("a"); return acc }',
        errors: [{ messageId: "mutatedArray" as const, data: { name: "acc", how: "push" } }],
      },
      {
        name: "A cast after Array.isArray narrowing (any[]) is decoding too",
        filename: typedFilename,
        options,
        code: "export const asIds = (raw: unknown): ReadonlyArray<string> => (Array.isArray(raw) ? (raw as string[]) : [])",
        errors: [
          {
            messageId: "preferWireCast" as const,
            data: { type: "string", arrayType: "string[]" },
            suggestions: [
              {
                messageId: "suggestReadonlyArray" as const,
                data: { type: "string" },
                output:
                  "export const asIds = (raw: unknown): ReadonlyArray<string> => (Array.isArray(raw) ? (raw as ReadonlyArray<string>) : [])",
              },
            ],
          },
        ],
      },
      {
        name: "Re-casting a typed constant is not decoding, so it gets the plain message",
        filename: typedFilename,
        options,
        code: 'const VERDICTS = ["a", "b"] as const; export const v = VERDICTS as unknown as string[]',
        errors: [
          {
            messageId: "preferReadonlyOrList" as const,
            data: { type: "string", arrayType: "string[]" },
            suggestions: [
              {
                messageId: "suggestReadonlyArray" as const,
                data: { type: "string" },
                output:
                  'const VERDICTS = ["a", "b"] as const; export const v = VERDICTS as unknown as ReadonlyArray<string>',
              },
              {
                messageId: "suggestListType" as const,
                data: { type: "string" },
                output: 'const VERDICTS = ["a", "b"] as const; export const v = VERDICTS as unknown as List<string>',
              },
              {
                messageId: "suggestAddImport" as const,
                data: { symbol: "List" },
                output:
                  'import { List } from "functype"\nconst VERDICTS = ["a", "b"] as const; export const v = VERDICTS as unknown as string[]',
              },
            ],
          },
        ],
      },
      {
        name: "A cast of decoded data points at Wire",
        filename: typedFilename,
        options,
        code: "declare const raw: string; export const ids = JSON.parse(raw) as string[]",
        errors: [
          {
            messageId: "preferWireCast" as const,
            data: { type: "string", arrayType: "string[]" },
            suggestions: [
              {
                messageId: "suggestReadonlyArray" as const,
                data: { type: "string" },
                output: "declare const raw: string; export const ids = JSON.parse(raw) as ReadonlyArray<string>",
              },
            ],
          },
        ],
      },
      // One use is not an array slot (`.length`), so the const is a collection in your own code.
      literal(
        'declare function select(o: { data: ReadonlyArray<string> }): void; const OPTIONS = ["a", "b"]; select({ data: OPTIONS }); export const n = OPTIONS.length',
        '"a", "b"',
      ),
      literal("export const ids = [1, 2, 3]", "1, 2, 3"),
    ],
  })
})
