import { describe } from "vitest"

import rule from "../../src/rules/prefer-do-notation"
import { typedFilename, typedRuleTester } from "../utils/typed-rule-tester"

/**
 * With type information, the chain root's type decides whether a chain is a monad chain, whatever it's
 * called: an array named `results` isn't one, and `getUser()` returning an Option is (#444).
 */
const decls = [
  'import { Either, Option } from "functype"',
  "declare function getUser(id: number): Option<{ id: number }>",
  "declare const results: string[]",
  "declare function step(n: number): Option<number>",
  "",
].join("; ")

const valid = (name: string, code: string) => ({ name, filename: typedFilename, code: decls + code })

describe("prefer-do-notation (type-aware)", () => {
  typedRuleTester.run("prefer-do-notation", rule, {
    valid: [
      valid(
        "An array named like a monad is still an array",
        "export const w = results.flatMap((r) => r.split(' ')).flatMap((w) => w.split('-')).flatMap((p) => p.split('_'))",
      ),
      valid(
        "An array chain whose callbacks build monads",
        "export const xs = results.map((r) => Option(r)).map((o) => Either.right(o))",
      ),
    ],
    invalid: [
      {
        name: "A call that returns an Option starts a monad chain",
        filename: typedFilename,
        code:
          decls +
          "export const n = getUser(1).flatMap((u) => step(u.id)).flatMap((a) => step(a)).flatMap((b) => step(b))",
        errors: [{ messageId: "preferDoForChainedMethods" as const, data: { count: "3" } }],
      },
    ],
  })
})
