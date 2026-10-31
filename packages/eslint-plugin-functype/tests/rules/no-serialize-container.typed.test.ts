import { describe } from "vitest"

import rule from "../../src/rules/no-serialize-container"
import { ruleTester } from "../utils/rule-tester"
import { typedFilename, typedRuleTester } from "../utils/typed-rule-tester"

/**
 * agent-todo's `GET /billing` handed an Either to Hono's `c.json()`, so the dashboard read
 * `subscription.hasStripeCustomer` as `undefined` for nine months, and an MCP tool's
 * `JSON.stringify({ success: true, checkout })` reported success on failure (#364).
 */
const decls = [
  'import { Either, List, Map as FMap, Option, Stack } from "functype"',
  "type Details = { readonly hasStripeCustomer: boolean }",
  "declare const c: { json(body: unknown, status?: number): Response }",
  "declare const svc: { getDetails(id: string): Promise<Either<Error, Details>> }",
  "declare const r: Either<Error, Details>",
  "declare const user: { readonly id: string }",
  "declare const details: Either<Error, Details>",
  "declare const checkout: Either<Error, { readonly url: string }>",
  "declare const list: List<number>",
  "declare const maybe: Option<string>",
  "declare const rows: ReadonlyArray<Option<string>>",
  "declare const byId: Record<string, Option<string>>",
  "declare const res: { json(): Promise<unknown> }",
  "type User = { readonly id: string; readonly plan: Option<string> }",
  "declare const patch: Partial<User>",
  'declare const row: Omit<User, "id">',
  'declare const pair: Record<"a" | "b", Option<string>>',
  "declare const stack: Stack<number>",
  "declare const loose: { readonly e?: Either<Error, number> }",
  "declare const orNull: Either<Error, number> | null",
  "type Named = { readonly x: number } | { readonly e: Either<Error, number> }",
  "declare const named: Named",
  "declare const fmap: FMap<string, number>",
  "declare const maybeC: { json(body: unknown): Response } | undefined",
  "",
].join("; ")

const valid = (name: string, code: string) => ({ name, filename: typedFilename, code: decls + code })

const sent = (code: string, name: string, where = "") => ({
  code: decls + code,
  filename: typedFilename,
  errors: [{ messageId: "serializedContainer" as const, data: { name, where } }],
})

describe("no-serialize-container (type-aware)", () => {
  typedRuleTester.run("no-serialize-container", rule, {
    valid: [
      valid("Unwrapped with orThrow", "export const a = c.json(r.orThrow())"),
      valid("A List turned into an array", "export const a = c.json({ items: list.toArray() })"),
      valid(
        "Checking the Left first",
        "export function f() { if (r.isLeft()) return c.json({ error: r.value.message }, 500); return c.json(r.orThrow()) }",
      ),
      valid("The envelope on purpose, with toJSON()", "export const a = c.json(r.toJSON())"),
      valid("Serialized on purpose", "export const a = c.json(r.serialize())"),
      valid("Plain data", "export const a = JSON.stringify({ success: true, user })"),
      valid("A read has no argument", "export async function f() { return res.json() }"),
      valid("Folded to a plain value", "export const a = c.json(maybe.fold(() => null, (s) => s))"),
      valid(
        "Another method named stringify",
        "declare const qs: { stringify(x: unknown): string }; export const a = qs.stringify(r)",
      ),
    ],
    invalid: [
      sent("export async function f(id: string) { return c.json(await svc.getDetails(id)) }", "Either"),
      sent("export const a = c.json({ user, subscription: details })", "Either", " at subscription"),
      sent("export const a = JSON.stringify({ success: true, checkout })", "Either", " at checkout"),
      sent("export const a = c.json(maybe)", "Option"),
      sent("export const a = c.json({ items: list })", "List", " at items"),
      sent("export const a = c.json({ rows })", "Option", " at rows[]"),
      sent("export const a = c.json(byId)", "Option", " at [key]"),
      sent(
        "export const a = new Response(JSON.stringify({ data: { nested: { value: maybe } } }))",
        "Option",
        " at data.nested.value",
      ),
      sent("export const a = c.json(patch)", "Option", " at plan"),
      sent("export const a = c.json(row)", "Option", " at plan"),
      sent("export const a = c.json(pair)", "Option", " at a"),
      sent("export const a = c.json(stack)", "Stack"),
      sent("export const a = c.json(loose)", "Either", " at e"),
      sent("export const a = c.json(orNull)", "Either"),
      sent("export const a = c.json(named)", "Either", " at e"),
      sent("export const a = c.json(fmap)", "Map"),
      sent("export const a = maybeC?.json(maybe)", "Option"),
    ],
  })
})

describe("no-serialize-container (no type information)", () => {
  ruleTester.run("no-serialize-container", rule, {
    valid: [{ name: "Reports nothing without type information", code: decls + "export const a = c.json(r)" }],
    invalid: [],
  })
})
