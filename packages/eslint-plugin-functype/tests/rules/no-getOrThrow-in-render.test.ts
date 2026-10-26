import { describe } from "vitest"

import rule from "../../src/rules/no-getOrThrow-in-render"
import { ruleTester } from "../utils/rule-tester"

/** A throwing extractor in a component's or hook's own body throws during render. */
const reported = (code: string, receiver: string, method = "orThrow") => ({
  code,
  errors: [{ messageId: "throwInRender" as const, data: { receiver, method } }],
})

describe("no-getOrThrow-in-render", () => {
  ruleTester.run("no-getOrThrow-in-render", rule, {
    valid: [
      {
        name: "fold renders both cases",
        code: "function Comp({ o1 }) { return o1.fold(() => <A />, (v) => <B v={v} />) }",
      },
      {
        name: "orElse reads a fallback",
        code: "function Comp({ o1 }) { const v = o1.orElse(0); return <A v={v} /> }",
      },
      {
        name: "A named error is a deliberate throw to an error boundary",
        code: 'function Comp({ o1 }) { const v = o1.orThrow(() => new Error("e1")); return <A v={v} /> }',
      },
      {
        name: "expect takes the chosen throw as its handler",
        code: "function Comp({ o1 }) { const v = o1.expect(() => fail()); return <A v={v} /> }",
      },
      {
        name: "An event handler runs after render",
        code: "function Comp({ o1 }) { return <A onClick={() => use1(o1.orThrow())} /> }",
      },
      {
        name: "An effect runs after render",
        code: "function Comp({ o1 }) { useEffect(() => { use1(o1.orThrow()) }, [o1]); return <A /> }",
      },
      {
        name: "A function that is not a component or a hook",
        code: "function compute(o1) { return o1.orThrow() }",
      },
      {
        name: "A PascalCase function with no JSX is not a component",
        code: "function Compute(o1) { return o1.orThrow() }",
      },
      {
        name: "A module-level call is not in render",
        code: "const v1 = o1.orThrow()",
      },
      {
        name: "Guarded by a ternary on the same receiver",
        code: "function Comp({ o1 }) { return <A v={o1.isSome() ? o1.orThrow() : 0} /> }",
      },
      {
        name: "Guarded by the else of a negative predicate",
        code: "function Comp({ e1 }) { return e1.isLeft() ? <A /> : <B v={e1.orThrow()} /> }",
      },
      {
        name: "Guarded by an if on the same receiver",
        code: "function useThing(t1) { if (t1.isSuccess()) return t1.orThrow(); return 0 }",
      },
      {
        name: "Guarded by &&",
        code: "function Comp({ o1 }) { return <A v={o1.isSome() && o1.orThrow()} /> }",
      },
      {
        name: "Guarded by an earlier early exit",
        code: "function Comp({ o1 }) { if (o1.isNone()) return null; const v = o1.orThrow(); return <A v={v} /> }",
      },
      {
        name: "An @interop declaration with a reason",
        code: `
          /**
           * @interop the host reads failure only from a throw
           */
          function useThing(o1) { return o1.orThrow() }
        `,
      },
    ],
    invalid: [
      reported("function Comp({ o1 }) { const v = o1.orThrow(); return <A v={v} /> }", "o1"),
      reported("const Comp = ({ o1 }) => <A v={o1.orThrow()} />", "o1"),
      reported("const Comp = memo(({ o1 }) => <A v={o1.orThrow()} />)", "o1"),
      reported(
        "const Comp = React.forwardRef(function (props, ref) { return <A v={props.o1.orThrow()} /> })",
        "props.o1",
      ),
      reported("export default function Comp({ o1 }) { return <>{o1.getOrThrow()}</> }", "o1", "getOrThrow"),
      reported("function useThing(o1) { return o1.orThrow() }", "o1"),
      reported("const useThing = (o1) => o1.orThrow()", "o1"),
      {
        name: "A guard on a different receiver doesn't count",
        ...reported("function Comp({ o1, o2 }) { return o2.isSome() ? <A v={o1.orThrow()} /> : null }", "o1"),
      },
      {
        name: "A positive predicate's else branch is the missing case",
        ...reported("function Comp({ o1 }) { return o1.isSome() ? null : <A v={o1.orThrow()} /> }", "o1"),
      },
      {
        name: "A bare @interop tag exempts nothing",
        ...reported(
          `
          /** @interop */
          function useThing(o1) { return o1.orThrow() }
        `,
          "o1",
        ),
      },
      {
        name: "With the @interop marker turned off",
        options: [{ allowInteropMarker: false }],
        ...reported(
          `
          /** @interop the host reads failure only from a throw */
          function useThing(o1) { return o1.orThrow() }
        `,
          "o1",
        ),
      },
    ],
  })
})
