import { describe } from "vitest"

import rule from "../../src/rules/no-array-mutation"
import { ruleTester } from "../utils/rule-tester"
import { typedFilename, typedRuleTester } from "../utils/typed-rule-tester"

/**
 * no-array-mutation reports the mutation itself — the defect prefer-list only infers from types and
 * literals. It's what catches `const rows = load(); rows.push(x)`, where there's no annotation or literal
 * to hook onto. Type-aware only: an untyped run reports nothing rather than guess what `.push` is.
 */

// The fixture lives under tests/, which the rule skips by default (allowInTests).
const options = [{ allowInTests: false }]

const method = (code: string, name: string, m: string) => ({
  code,
  filename: typedFilename,
  options,
  errors: [{ messageId: "mutatingMethod" as const, data: { name, method: m } }],
})

describe("no-array-mutation (type-aware)", () => {
  typedRuleTester.run("no-array-mutation", rule, {
    valid: [
      {
        name: "Building a new array is fine",
        filename: typedFilename,
        options,
        code: "declare const xs: number[]; export const more = [...xs, 4]; export const sorted = xs.toSorted((a, b) => a - b)",
      },
      {
        name: "Mutating a fresh copy on the spot changes no array anyone else holds",
        filename: typedFilename,
        options,
        code: "declare const xs: number[]; declare function walk(): Promise<string[]>; export const a = [...xs].sort((x, y) => x - y); export const b = xs.slice().reverse(); export const c = Array.from(xs).sort(); export const d = async () => (await walk()).sort()",
      },
      {
        name: "push on something that isn't an array",
        filename: typedFilename,
        options,
        code: "declare const queue: { push(x: number): void }; queue.push(1); declare const tags: globalThis.Set<string>; tags.add('a')",
      },
      {
        name: "push on an any value isn't proven to be an array",
        filename: typedFilename,
        options,
        code: "declare const loose: any; loose.push(1)",
      },
      {
        name: "Reading elements and length is fine",
        filename: typedFilename,
        options,
        code: "declare const xs: number[]; export const first = xs[0]; export const n = xs.length",
      },
      {
        name: "A plain object keyed by index isn't an array",
        filename: typedFilename,
        options,
        code: "declare const counts: Record<string, number>; counts['a'] = 1",
      },
      {
        name: "@interop with a reason exempts a host boundary",
        filename: typedFilename,
        options,
        code: `
          /**
           * @interop the charting library mutates the series it's given.
           */
          export function fill(series: number[]) { series.push(0) }
        `,
      },
      {
        name: "Test files are skipped by default",
        filename: typedFilename,
        code: "declare const xs: number[]; xs.push(1)",
      },
    ],
    invalid: [
      method("declare function load(): { id: number }[]; const rows = load(); rows.push({ id: 1 })", "rows", "push"),
      method(
        "export function collect(): ReadonlyArray<string> { const acc: string[] = []; acc.push('a'); return acc }",
        "acc",
        "push",
      ),
      method("declare const xs: number[]; xs.sort()", "xs", "sort"),
      method("declare const xs: number[]; xs.splice(0, 1)", "xs", "splice"),
      method("declare const state: { errors: string[] }; state.errors.push('x')", "state.errors", "push"),
      method("declare const pair: [number, number]; pair.reverse()", "pair", "reverse"),
      method("declare const maybe: number[] | undefined; maybe?.push(1)", "maybe", "push"),
      {
        name: "Assigning to an element",
        filename: typedFilename,
        options,
        code: "declare const xs: number[]; xs[0] = 1; xs[1] += 2; xs[2]++; delete xs[3]",
        errors: [
          { messageId: "elementAssignment" as const, data: { name: "xs" } },
          { messageId: "elementAssignment" as const, data: { name: "xs" } },
          { messageId: "elementAssignment" as const, data: { name: "xs" } },
          { messageId: "elementAssignment" as const, data: { name: "xs" } },
        ],
      },
      {
        name: "Setting length",
        filename: typedFilename,
        options,
        code: "declare const xs: number[]; xs.length = 0",
        errors: [{ messageId: "lengthAssignment" as const, data: { name: "xs" } }],
      },
      {
        name: "A bare @interop tag exempts nothing",
        filename: typedFilename,
        options,
        code: `
          /**
           * @interop
           */
          export function fill(series: number[]) { series.push(0) }
        `,
        errors: [{ messageId: "mutatingMethod" as const, data: { name: "series", method: "push" } }],
      },
    ],
  })
})

describe("no-array-mutation (no type information)", () => {
  ruleTester.run("no-array-mutation", rule, {
    valid: [
      {
        name: "Without type information nothing is reported",
        code: "const rows = load(); rows.push(1); rows[0] = 2; rows.length = 0",
        options,
      },
    ],
    invalid: [],
  })
})
