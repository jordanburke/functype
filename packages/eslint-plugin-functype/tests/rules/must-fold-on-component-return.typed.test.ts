import { describe } from "vitest"

import rule from "../../src/rules/must-fold-on-component-return"
import { typedRuleTester, typedTsxFilename } from "../utils/typed-rule-tester"

/** With type information, the predicate's receiver must be a functype container. */
const imports = 'import { Either, Option } from "functype"; declare function A(): null; declare function B(): null; '

describe("must-fold-on-component-return (type-aware)", () => {
  typedRuleTester.run("must-fold-on-component-return", rule, {
    valid: [
      {
        name: "isSome() on a non-functype object is not reported",
        filename: typedTsxFilename,
        code:
          imports +
          "declare const c1: { isSome(): boolean }; export function Comp() { return <>{c1.isSome() && <A />}</> }",
      },
    ],
    invalid: [
      {
        filename: typedTsxFilename,
        code: imports + "export function Comp({ o1 }: { o1: Option<number> }) { return <>{o1.isSome() && <A />}</> }",
        errors: [
          { messageId: "shortCircuit" as const, data: { receiver: "o1", method: "isSome", matcher: "MatchOption" } },
        ],
      },
      {
        filename: typedTsxFilename,
        code:
          imports +
          "export function Comp({ e1 }: { e1: Either<string, number> }) { if (e1.isLeft()) return <A />; return <B /> }",
        errors: [
          { messageId: "guardReturn" as const, data: { receiver: "e1", method: "isLeft", matcher: "MatchEither" } },
        ],
      },
    ],
  })
})
