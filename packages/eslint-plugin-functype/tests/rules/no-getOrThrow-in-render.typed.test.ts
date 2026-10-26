import { describe } from "vitest"

import rule from "../../src/rules/no-getOrThrow-in-render"
import { typedRuleTester, typedTsxFilename } from "../utils/typed-rule-tester"

/** With type information, the receiver's type decides: a functype container, not just the method name. */
const imports = 'import { Either, Option, Try } from "functype"; declare function A(props: { v: unknown }): null; '

describe("no-getOrThrow-in-render (type-aware)", () => {
  typedRuleTester.run("no-getOrThrow-in-render", rule, {
    valid: [
      {
        name: "orThrow on a non-functype object is not reported",
        filename: typedTsxFilename,
        code:
          imports + "declare const c1: { orThrow(): number }; export function Comp() { return <A v={c1.orThrow()} /> }",
      },
      {
        name: "fold on an Option",
        filename: typedTsxFilename,
        code:
          imports +
          "export function Comp({ o1 }: { o1: Option<number> }) { return o1.fold(() => <A v={0} />, (v) => <A v={v} />) }",
      },
    ],
    invalid: [
      {
        filename: typedTsxFilename,
        code: imports + "export function Comp({ o1 }: { o1: Option<number> }) { return <A v={o1.orThrow()} /> }",
        errors: [{ messageId: "throwInRender" as const, data: { receiver: "o1", method: "orThrow" } }],
      },
      {
        filename: typedTsxFilename,
        code:
          imports +
          "export function useThing(e1: Either<string, number>, t1: Try<number>) { return [e1.orThrow(), t1.orThrow()] }",
        errors: [
          { messageId: "throwInRender" as const, data: { receiver: "e1", method: "orThrow" } },
          { messageId: "throwInRender" as const, data: { receiver: "t1", method: "orThrow" } },
        ],
      },
    ],
  })
})
