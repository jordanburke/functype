import { describe } from "vitest"

import rule from "../../src/rules/no-container-mutation"
import { ruleTester } from "../utils/rule-tester"
import { typedFilename, typedRuleTester } from "../utils/typed-rule-tester"

/**
 * functype values don't change after they're built, and since functype 2.2 collections no longer freeze
 * each value. The types mark every field read-only, so a write needs the value's type hidden from
 * TypeScript: a cast, or a variable holding one. The rule reports those writes, and calls such as
 * Object.assign that compile without a cast. Writes that compile cast-free (an Option's payload, a
 * List element's own field, a field of your own subtype) are left alone.
 */
const decls = [
  'import { Either, List, Map as FMap, Option, Set as FSet } from "functype"',
  "declare const list: List<number>",
  "declare const set: FSet<number>",
  "declare const fmap: FMap<string, number>",
  "declare const opt: Option<number>",
  "declare const either: Either<string, number>",
  "declare const maybeList: List<number> | undefined",
  "declare const mixed: List<number> | number[]",
  "declare const box: Option<{ n: number }>",
  "declare const people: List<{ name: string }>",
  "interface MyList extends List<number> { dirty: boolean }",
  "declare const mine: MyList",
  'type Shape = { _tag: "Circle"; fold<B>(f: (s: Shape) => B): B; r: number }',
  "declare const shape: Shape",
  "declare const plain: { value: number[]; _tag: string }",
  "declare const source: { readonly x: number }",
  "declare const xs: ReadonlyArray<number>",
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
      valid("A field of your own subtype", "mine.dirty = true"),
      valid("An Option's payload", "if (box.isSome()) box.value.n = 1"),
      valid("Object.assign on an Option's payload", "if (box.isSome()) Object.assign(box.value, { n: 2 })"),
      valid("A List element's own field", 'people.toArray()[0]!.name = "x"'),
      valid(
        "A local variable holding a list",
        "export function f() { let ys = list; ys = list.map((x) => x); return ys }",
      ),
      valid("An alias without a cast, only read", "const o = list; export const a = o.size"),
      valid("Object.assign onto a new object", "export const a = Object.assign({}, { n: list.size })"),
      valid("Object.assign from a list", "export const a = Object.assign({}, list)"),
      valid("Object.keys of a value", "export const a = Object.keys(list)"),
      valid(
        "A copy changed, not the list",
        "export function f() { const ys = [...list.toArray()]; ys[0] = 9; return ys }",
      ),
      valid("A cast of something else", "(source as { x: number }).x = 2"),
      valid("A non-mutating method through a cast", "export const a = (list as any).value.map((x: number) => x)"),
      valid("Pushing to a copy", "export function f() { const ys = [...list.toArray()]; ys.push(1); return ys }"),
      valid(
        "Pushing to an Option's array payload, no cast",
        "declare const arr: Option<number[]>; if (arr.isSome()) arr.value.push(1)",
      ),
      valid("A reassigned variable is not followed", "export function f() { let o: any = {}; o = list; o.x = 1 }"),
    ],
    invalid: [
      changed("(list as unknown as { value: number[] }).value = [9]", "List"),
      changed('(list as any)._tag = "Other"', "List"),
      changed("(<any>list).extra = 1", "List"),
      changed("(list as any).value[0] = 9", "List"),
      changed("(list as any).value.length++", "List"),
      changed("(list as any).extra += 1", "List"),
      changed("(list as any).extra ??= 1", "List"),
      changed("delete (list as any).value", "List"),
      changed("delete (list as any)?.value", "List"),
      changed("((list as any).value as number[])[0] = 9", "List"),
      changed("(maybeList! as any).value = []", "List"),
      changed("(mixed as any).extra = 1", "List"),
      changed("(opt as any).value = 2", "Option"),
      changed("(either as { value: unknown }).value = 0", "Either"),
      changed("export function f<L extends List<number>>(ys: L) { (ys as any).value = [] }", "List"),
      // Aliases: a variable that holds a cast of a functype value.
      changed("const o = list as any; o.extra = 1", "List"),
      changed("const record = list as unknown as Record<string, unknown>; record.extra = 1", "List"),
      changed("const o: any = list; o.extra = 1", "List"),
      changed("const o = (list as any).value; o[0] = 9", "List"),
      // Destructuring and loop targets.
      changed("({ a: (list as any).extra } = { a: 1 })", "List"),
      changed("[(list as any).extra] = [1]", "List"),
      changed("for ((list as any).extra of xs) {}", "List"),
      changed("for ((list as any).extra in { a: 1 }) {}", "List"),
      // Mutating methods on data reached through a cast.
      changed("(list as any).value.push(9)", "List"),
      changed("(list as unknown as { value: number[] }).value.sort()", "List"),
      changed("(set as any).value.add(1)", "Set"),
      changed('(fmap as any).value.delete("a")', "Map"),
      changed("const o = list as any; o.value.splice(0, 1)", "List"),
      // Calls that change their target, cast or not.
      changed("Object.assign(list, { extra: 1 })", "List"),
      changed('Object.defineProperty(set, "value", { value: new globalThis.Set() })', "Set"),
      changed('Reflect.set(fmap, "value", null)', "Map"),
      changed('Object["assign"](list, { extra: 1 })', "List"),
      changed("globalThis.Object.assign(list, { extra: 1 })", "List"),
      changed("const o = list; Object.assign(o, { extra: 1 })", "List"),
      changed("Object.setPrototypeOf(opt, null)", "Option"),
    ],
  })
})

describe("no-container-mutation (without type information)", () => {
  ruleTester.run("no-container-mutation", rule, {
    valid: [{ code: "(list as any).value = [9]; Object.assign(list, {})" }],
    invalid: [],
  })
})
