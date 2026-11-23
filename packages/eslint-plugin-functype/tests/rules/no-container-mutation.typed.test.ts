import { describe } from "vitest"

import rule from "../../src/rules/no-container-mutation"
import { ruleTester } from "../utils/rule-tester"
import { typedFilename, typedRuleTester } from "../utils/typed-rule-tester"

/**
 * functype values don't change after they're built. The types mark every field read-only, so a write
 * needs a cast, and the rule looks through it. Once collections stopped freezing each value, this rule
 * became what stops a write through a cast.
 */
const decls = [
  'import { Either, List, Map as FMap, Option, Set as FSet } from "functype"',
  "declare const list: List<number>",
  "declare const set: FSet<number>",
  "declare const fmap: FMap<string, number>",
  "declare const opt: Option<number>",
  "declare const either: Either<string, number>",
  "declare const maybeList: List<number> | undefined",
  'type Shape = { _tag: "Circle"; fold<B>(f: (s: Shape) => B): B; r: number }',
  "declare const shape: Shape",
  "declare const plain: { value: number[]; _tag: string }",
  "",
].join("; ")

const valid = (name: string, code: string) => ({ name, filename: typedFilename, code: decls + code })

const changed = (code: string, name: string) => ({
  code: decls + code,
  filename: typedFilename,
  errors: [{ messageId: "mutation" as const, data: { name } }],
})

describe("no-container-mutation (type-aware)", () => {
  typedRuleTester.run("no-container-mutation", rule, {
    valid: [
      valid("Building a new list", "export const a = list.map((x) => x + 1)"),
      valid("Reading a field", "export const a = list.size + (opt.isSome() ? 1 : 0)"),
      valid("A plain object", 'plain.value = [1]; plain._tag = "x"'),
      valid("A user type with _tag and fold", "shape.r = 2"),
      valid(
        "A local variable holding a list",
        "export function f() { let xs = list; xs = list.map((x) => x); return xs }",
      ),
      valid("Object.assign onto a new object", "export const a = Object.assign({}, { n: list.size })"),
      valid("Object.keys of a value", "export const a = Object.keys(list)"),
      valid(
        "A copy changed, not the list",
        "export function f() { const xs = [...list.toArray()]; xs[0] = 9; return xs }",
      ),
    ],
    invalid: [
      changed("(list as unknown as { value: number[] }).value = [9]", "List"),
      changed('(list as any)._tag = "Other"', "List"),
      changed("(list as any).value[0] = 9", "List"),
      changed("(list as any).value.length++", "List"),
      changed("delete (list as any).value", "List"),
      changed("Object.assign(list, { extra: 1 })", "List"),
      changed('Object.defineProperty(set, "value", { value: new globalThis.Set() })', "Set"),
      changed('Reflect.set(fmap, "value", null)', "Map"),
      changed("(opt as any).value = 2", "Option"),
      changed("(either as { value: unknown }).value = 0", "Either"),
      changed("(maybeList! as any).value = []", "List"),
      changed("export function f<L extends List<number>>(xs: L) { (xs as any).value = [] }", "List"),
    ],
  })
})

describe("no-container-mutation (without type information)", () => {
  ruleTester.run("no-container-mutation", rule, {
    valid: [{ code: "(list as any).value = [9]; Object.assign(list, {})" }],
    invalid: [],
  })
})
