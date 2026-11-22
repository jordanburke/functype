import { describe } from "vitest"

import rule from "../../src/rules/no-uncalled-method"
import { ruleTester } from "../utils/rule-tester"
import { typedFilename, typedRuleTester } from "../utils/typed-rule-tester"

/**
 * Porting an app and a library to functype 2 found `list.head` read as a value twice: once in a
 * truthiness check, and once as `Option(list.head)` inside a published library's `first()`, which then
 * returned a function to every caller while all their tests passed (#603).
 */
const decls = [
  'import { Either, LazyList, List, Option, Ref, Right, Set as FSet, Some } from "functype"',
  "type Row = { readonly id: string }",
  "declare const results: List<Row>",
  "declare const set: FSet<number>",
  "declare const lazy: LazyList<number>",
  "declare const opt: Option<string>",
  "declare const either: Either<Error, Row>",
  "declare const maybeList: List<Row> | undefined",
  "declare const fnOpt: Option<() => void>",
  "declare const fnRight: Either<Error, () => void>",
  "declare const fnRef: Ref<() => void>",
  "declare const plain: { readonly head: () => Row; run(): void }",
  "declare function expect(value: unknown): void",
  "declare function use<T>(value: T): T",
  'type Shape = { readonly _tag: "Circle"; fold<B>(f: (s: Shape) => B): B; area(): number }',
  "declare const shape: Shape",
  "interface MyList extends List<Row> { extra(): void }",
  "declare const mine: MyList",
  "",
].join("; ")

const valid = (name: string, code: string) => ({ name, filename: typedFilename, code: decls + code })

const read = (code: string, name: string, owner: string, count = 1) => ({
  code: decls + code,
  filename: typedFilename,
  errors: Array.from({ length: count }, () => ({ messageId: "uncalledMethod" as const, data: { name, owner } })),
})

describe("no-uncalled-method (type-aware)", () => {
  typedRuleTester.run("no-uncalled-method", rule, {
    valid: [
      valid("Called", "export const a = results.head()"),
      valid("Called through optional chaining", "export const a = maybeList?.head()"),
      valid("An optional call", "export const a = results.headOption?.()"),
      valid("Bound on purpose", "export const a = results.head.bind(results)"),
      valid("Called with a receiver", "export const a = results.head.call(results)"),
      valid("Checked with typeof", 'export const a = typeof results.head === "function"'),
      valid("Properties stay properties", "export const a = results.size + (results.isEmpty ? 0 : 1)"),
      valid("A tag", 'export const a = opt._tag === "Some"'),
      valid("Function-valued data in an Option", "export const a = fnOpt.isSome() ? fnOpt.value : undefined"),
      valid("Function-valued data in a Right", "export const a = fnRight.isRight() ? fnRight.value : undefined"),
      valid("Function-valued data in a Ref", "export const a = fnRef.get()"),
      valid("Not a functype value", "export const a = plain.head; export const b = plain.run"),
      valid("Destructuring data", "export const { size } = results"),
      valid("A companion's static", "export const a = [1, 2].map(Some)"),
      valid("A constructor passed as a callback", "export const a = [1].map(Right)"),
      valid(
        "A user object with _tag and fold",
        'const o = { _tag: "X" as const, fold(f: () => number) { return f() }, m() { return 1 } }; export const a = [1].map(o.m)',
      ),
      valid("A user union with _tag and fold", "export const a = [shape].map(shape.area)"),
      valid("A user method on an interface extending List", "export const a = mine.extra"),
      valid("Called through a cast", "export const a = (results.head as () => Row | undefined)()"),
    ],
    invalid: [
      read("export function f() { const checkout = results.head; if (!checkout) return 0; return 1 }", "head", "List"),
      read("export const a = Option(results.head)", "head", "List"),
      read("expect(results.head)", "head", "List"),
      read("export const a = results.head ?? null", "head", "List"),
      read("export const a = `${results.last}`", "last", "List"),
      read("export const a = use(results.tail)", "tail", "List"),
      read("export const a = set.headOption", "headOption", "Set"),
      read("export const a = lazy.lastOption", "lastOption", "LazyList"),
      read("export const a = maybeList?.init", "init", "List"),
      read("export const a = opt.isSome ? 1 : 2", "isSome", "Option"),
      read("export const a = [opt].map(opt.getOrElse)", "getOrElse", "Option"),
      read("export const a = results.head.name", "head", "List"),
      read('export const a = results["head"]', "head", "List"),
      read("export const { head } = results", "head", "List"),
      read("export function f<L extends List<Row>>(xs: L) { return xs.head ? 1 : 0 }", "head", "List"),
      read("export const a = mine.head", "head", "MyList"),
      read("export function f() { let head: unknown; ({ head } = results); return head }", "head", "List"),
      read('export const { "last": l } = results', "last", "List"),
    ],
  })
})

describe("no-uncalled-method (without type information)", () => {
  ruleTester.run("no-uncalled-method", rule, {
    valid: [{ code: "const a = results.head; if (opt.isSome) {}" }],
    invalid: [],
  })
})
