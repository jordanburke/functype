import { describe } from "vitest"

import rule from "../../src/rules/no-floating-io"
import { ruleTester } from "../utils/rule-tester"
import { typedFilename, typedRuleTester } from "../utils/typed-rule-tester"

/**
 * An IO built and dropped never runs. `IO` isn't thenable, so `no-floating-promises` and
 * `await-thenable` miss it, and `await io` quietly hands back the IO itself.
 */
const io = 'import { IO } from "functype"; declare function save(id: number): IO<never, Error, number>; '

const floating = (code: string) => ({
  code: io + code,
  filename: typedFilename,
  errors: [{ messageId: "floatingIO" as const }],
})

const awaited = (code: string) => ({
  code: io + code,
  filename: typedFilename,
  errors: [{ messageId: "awaitedIO" as const }],
})

describe("no-floating-io (type-aware)", () => {
  typedRuleTester.run("no-floating-io", rule, {
    valid: [
      { name: "Running it", filename: typedFilename, code: io + "export async function f() { await save(1).run() }" },
      {
        name: "runOrThrow, runExit and runSync",
        filename: typedFilename,
        code:
          io +
          "export async function f() { await save(1).runOrThrow(); await save(2).runExit(); IO.succeed(1).runSync() }",
      },
      {
        name: "Returning it",
        filename: typedFilename,
        code: io + "export function f() { return save(1).map((n) => n + 1) }",
      },
      { name: "An arrow body returns it", filename: typedFilename, code: io + "export const f = () => save(1)" },
      { name: "Assigning it", filename: typedFilename, code: io + "export const pending = save(1)" },
      {
        name: "Passing it along",
        filename: typedFilename,
        code: io + "export const both = IO.all([save(1), save(2)])",
      },
      {
        name: "yield* inside IO.gen",
        filename: typedFilename,
        code: io + "export const program = IO.gen(function* () { const n = yield* save(1); return n })",
      },
      {
        name: "void marks a deliberate drop",
        filename: typedFilename,
        code: io + "export function f() { void save(1) }",
      },
      {
        name: "A Promise-returning call is not an IO",
        filename: typedFilename,
        code: "declare function load(): Promise<number>; export async function f() { await load() }",
      },
      {
        name: "Other functype containers are not IO",
        filename: typedFilename,
        code: 'import { Option, Task } from "functype"; export function f() { Option(1).map((n) => n); Task().Sync(() => 1) }',
      },
      {
        name: "An object with a run method is not an IO",
        filename: typedFilename,
        code: "declare const job: { run(): Promise<void> }; export function f() { job.run }",
      },
    ],
    invalid: [
      floating("export function f() { save(1) }"),
      floating("export function f() { save(1).tap(() => undefined) }"),
      floating("export function f() { IO.sync(() => console.log('hi')) }"),
      floating("export function f(ok: boolean) { ok ? save(1) : save(2) }"),
      awaited("export async function f() { await save(1) }"),
      awaited("export async function f() { const n = await save(1); return n }"),
      awaited("export async function f() { return [await save(1)] }"),
    ],
  })
})

describe("no-floating-io (no type information)", () => {
  ruleTester.run("no-floating-io", rule, {
    valid: [{ name: "Reports nothing without type information", code: io + "export function f() { save(1) }" }],
    invalid: [],
  })
})
