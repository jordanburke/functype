import { describe } from "vitest"

import rule from "../../src/rules/no-floating-result"
import { ruleTester } from "../utils/rule-tester"
import { typedFilename, typedRuleTester } from "../utils/typed-rule-tester"

/**
 * A dropped Either or Try silently ignores its failure. agent-todo's Stripe webhook awaited
 * `userService.updateSubscription(…)` on its own line, so a failed write still answered Stripe 200 (#365).
 */
const svc = [
  'import { Either, IO, List, Option, Task, Try } from "functype"',
  "type ServiceResult<T> = Either<Error, T>",
  "declare function update(id: number): Promise<ServiceResult<void>>",
  "declare function parse(raw: string): Either<string, number>",
  "declare function attempt(): Try<number>",
  "declare function load(): Promise<number>",
  "declare function find(id: number): Option<number>",
  "declare function names(): List<string>",
  "declare function save(id: number): IO<never, Error, number>",
  "declare function maybe(): ServiceResult<number> | undefined",
  "declare function loose(): any",
  "declare function opaque(): unknown",
  "declare function sub(n: number): Either<string, number>",
  "declare const svc: { update?: (id: number) => Promise<ServiceResult<void>> }",
  "",
].join("; ")

const valid = (name: string, code: string) => ({ name, filename: typedFilename, code: svc + code })

const dropped = (code: string) => ({
  code: svc + code,
  filename: typedFilename,
  errors: [{ messageId: "floatingResult" as const }],
})

describe("no-floating-result (type-aware)", () => {
  typedRuleTester.run("no-floating-result", rule, {
    valid: [
      valid("Checking it", "export async function f() { const r = await update(1); if (r.isLeft()) throw r.value }"),
      valid("Returning it", "export async function f() { return update(1) }"),
      valid("Folding it", "export function f() { return parse('1').fold(() => 0, (n) => n) }"),
      valid("void marks a deliberate drop", "export async function f() { void (await update(1)) }"),
      valid("A dropped Option loses no error", "export function f() { find(1) }"),
      valid("A dropped List loses no error", "export function f() { names() }"),
      valid("A plain value", "export async function f() { await load() }"),
      valid("An IO that is never run is no-floating-io's", "export function f() { save(1) }"),
      valid(
        "A best-effort write that logs its failure with tapLeft",
        "export async function f() { (await update(1)).tapLeft((e) => console.error(e)) }",
      ),
      valid(
        "tapLeft earlier in the chain",
        "export function f() { parse('1').tapLeft((e) => console.error(e)).map((n) => n + 1) }",
      ),
      valid(
        "A best-effort IO write that logs its failure: the agent-todo shape",
        "export async function f() { await save(1).tapError((e) => console.error(e)).run() }",
      ),
      valid("any is not a result", "export function f() { loose() }"),
      valid("unknown is not a result", "export function f() { opaque() }"),
      valid("Assigning it", "export function f() { const n = parse('1'); return n }"),
    ],
    invalid: [
      dropped("export async function f() { await update(1) }"),
      dropped("export function f() { parse('1') }"),
      dropped("export function f() { attempt() }"),
      dropped("export async function f() { await svc.update?.(1) }"),
      dropped("export async function f() { await save(1).run() }"),
      dropped("export async function f() { await save(1).runExit() }"),
      dropped("export function f() { parse('1').tap((n) => console.log(n)) }"),
      dropped("export function f() { maybe() }"),
      dropped("export async function f(ok: boolean) { ok && (await update(1)) }"),
      dropped("export function f(ok: boolean) { ok ? parse('1') : parse('2') }"),
      dropped("export function f() { parse('1').tapLeft((e) => console.error(e)).flatMap(sub) }"),
      dropped("export function f() { Task().Sync(() => 1) }"),
    ],
  })
})

describe("no-floating-result (no type information)", () => {
  ruleTester.run("no-floating-result", rule, {
    valid: [{ name: "Reports nothing without type information", code: svc + "export function f() { parse('1') }" }],
    invalid: [],
  })
})
