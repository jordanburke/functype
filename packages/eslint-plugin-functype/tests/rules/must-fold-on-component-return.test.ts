import { describe } from "vitest"

import rule from "../../src/rules/must-fold-on-component-return"
import { ruleTester } from "../utils/rule-tester"

const guard = (code: string, receiver: string, method: string, matcher: string) => ({
  code,
  errors: [{ messageId: "guardReturn" as const, data: { receiver, method, matcher } }],
})

const shortCircuit = (code: string, receiver: string, method: string, matcher: string) => ({
  code,
  errors: [{ messageId: "shortCircuit" as const, data: { receiver, method, matcher } }],
})

describe("must-fold-on-component-return", () => {
  ruleTester.run("must-fold-on-component-return", rule, {
    valid: [
      {
        name: "fold renders both cases",
        code: "function Comp({ o1 }) { return o1.fold(() => <A />, (v) => <B v={v} />) }",
      },
      {
        name: "A Match component renders both cases",
        code: "function Comp({ o1 }) { return <MatchOption value={o1} Some={(v) => <B v={v} />} None={() => <A />} /> }",
      },
      {
        name: "A ternary is prefer-fold's, not reported twice",
        code: "function Comp({ o1 }) { return o1.isSome() ? <B /> : <A /> }",
      },
      {
        name: "An if/else is prefer-fold's, not reported twice",
        code: "function Comp({ o1 }) { if (o1.isNone()) { return <A /> } else { return <B /> } }",
      },
      {
        name: "A property read is not a functype predicate (a useIO result)",
        code: "function Comp({ s1 }) { if (s1.isPending) return <A />; return <B /> }",
      },
      {
        name: "isEmpty is a property, never a predicate call",
        code: "function Comp({ l1 }) { return <div>{l1.isEmpty && <A />}</div> }",
      },
      {
        name: "A plain boolean guard",
        code: "function Comp({ b1 }) { if (!b1) return null; return <A /> }",
      },
      {
        name: "A guard that returns a value, not JSX",
        code: "function Comp({ o1 }) { if (o1.isNone()) return v1; return <A /> }",
      },
      {
        name: "A guard with more work than a return",
        code: "function Comp({ o1 }) { if (o1.isNone()) { log1(); return null } return <A /> }",
      },
      {
        name: "&& whose right side is not JSX",
        code: "function Comp({ o1 }) { const b = o1.isSome() && v1; return <A b={b} /> }",
      },
      {
        name: "A hook is not a component",
        code: "function useThing(o1) { if (o1.isNone()) return null; return <A /> }",
      },
      {
        name: "A lowercase function is not a component",
        code: "function render(o1) { return <div>{o1.isSome() && <A />}</div> }",
      },
      {
        name: "A nested callback is its own function",
        code: "function Comp({ l1 }) { return <div>{l1.map((o1) => o1.isSome() && <A />)}</div> }",
      },
      {
        name: "An @interop declaration with a reason",
        code: `
          /** @interop the host renders only one case */
          function Comp({ o1 }) { return <div>{o1.isSome() && <A />}</div> }
        `,
      },
    ],
    invalid: [
      guard("function Comp({ o1 }) { if (o1.isNone()) return <A />; return <B /> }", "o1", "isNone", "MatchOption"),
      guard(
        "function Comp({ o1 }) { if (o1.isNone()) return null; return <B v={o1.orThrow()} /> }",
        "o1",
        "isNone",
        "MatchOption",
      ),
      guard(
        "const Comp = ({ e1 }) => { if (e1.isLeft()) { return <A /> } return <B /> }",
        "e1",
        "isLeft",
        "MatchEither",
      ),
      guard(
        "const Comp = memo(function ({ t1 }) { if (t1.isSuccess()) return <B />; return <A /> })",
        "t1",
        "isSuccess",
        "MatchTry",
      ),
      guard(
        "function Comp({ p1 }) { if (p1.o1.isNone()) return <A />; return <B /> }",
        "p1.o1",
        "isNone",
        "MatchOption",
      ),
      shortCircuit("function Comp({ o1 }) { return <div>{o1.isSome() && <A />}</div> }", "o1", "isSome", "MatchOption"),
      shortCircuit("const Comp = ({ e1 }) => e1.isRight() && <B />", "e1", "isRight", "MatchEither"),
      shortCircuit("function Comp({ t1 }) { return t1.isFailure() && <></> }", "t1", "isFailure", "MatchTry"),
      {
        name: "With the @interop marker turned off",
        options: [{ allowInteropMarker: false }],
        ...shortCircuit(
          `
          /** @interop the host renders only one case */
          function Comp({ o1 }) { return <div>{o1.isSome() && <A />}</div> }
        `,
          "o1",
          "isSome",
          "MatchOption",
        ),
      },
    ],
  })
})
