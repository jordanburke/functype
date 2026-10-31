import { describe, expect, it } from "vitest"

import rule from "../../src/rules/prefer-do-notation"
import { showTransformations, VisualRuleTester } from "../utils/visual-rule-tester"

describe("prefer-do-notation", () => {
  VisualRuleTester.run(
    "prefer-do-notation",
    rule,
    {
      valid: [
        // Already using Do notation
        {
          name: "Do notation is allowed",
          code: `
          import { Do, Option, $ } from 'functype'
          const result = Do(function* () {
            const x = yield* $(Option(user))
            const y = yield* $(Option(x.address))
            return y.city
          })
        `,
        },
        // Simple property access without nesting
        {
          name: "Simple property access is allowed",
          code: "const city = user.address.city",
        },
        // Single flatMap calls
        {
          name: "Single flatMap is allowed",
          code: "const result = option.flatMap(x => processValue(x))",
        },
        // Two flatMap chain (below default minChainDepth: 3)
        {
          name: "Two flatMap chain is below threshold",
          code: `
          const result = option
            .flatMap(x => getOption2(x))
            .flatMap(y => getOption3(y))
        `,
        },
        // Single && with property access (below depth 2)
        {
          name: "Single && with property access is allowed",
          code: "const city = user && user.address",
        },
        // Mixed monads allowed when detectMixedMonads is false
        {
          name: "Mixed monads allowed when detection is disabled",
          code: `
          const result = option
            .flatMap(x => Either.right(x))
            .flatMap(y => Try(() => process(y)))
        `,
          options: [{ detectMixedMonads: false }],
        },
        // Idiomatic conversion .toEither — NOT a mixed-monad case
        // (substring scan misfired here because ".toEither" contains "Either")
        {
          name: "Try(...).toEither(err) is a conversion, not a mix",
          code: `
          const result = Try(() => parse(x)).toEither(buildErr)
        `,
        },
        // Idiomatic conversion .toOption — same false positive
        {
          name: "Try(...).toOption() is a conversion, not a mix",
          code: `
          const opt = Try(() => parse(x)).toOption()
        `,
        },
        // Option to Either conversion
        {
          name: "Option(x).toEither(left) is a conversion, not a mix",
          code: `
          const result = Option(value).toEither(missingError)
        `,
        },
        // Conversion in a chain — still not a mix
        {
          name: "Option(x).toEither(err).map(f) is a conversion chain",
          code: `
          const result = Option(value)
            .toEither(missing)
            .map(v => transform(v))
        `,
        },
        // Issue #205 repro: Try → Option via fold is a conversion, not composition
        {
          name: "Try(...).fold(() => Option.none(), v => Option(v)) is a conversion",
          code: `
          const ageVersion = () =>
            Try(() => execFileSync("age", ["--version"]).trim()).fold(
              () => Option.none(),
              (v) => Option(v),
            )
        `,
        },
        // Either.match with monad-constructing branches is a conversion
        {
          name: "Either.right(x).match with Option branches is a conversion",
          code: `
          const result = Either.right(x).match({
            Left: () => Option.none(),
            Right: (v) => Option(v),
          })
        `,
        },
        // getOrElse with a monad fallback is a conversion/exit, not composition
        {
          name: "Try(...).getOrElse(Option.none()) is a conversion",
          code: `
          const result = Try(() => parse(x)).getOrElse(Option.none())
        `,
        },
        // #444 1c: an array's flatMap chain is not a monad chain
        {
          name: "An array flatMap chain is not a monad chain",
          code: `
          export const words = (lines: string[]): string[] =>
            lines.flatMap((l) => l.split(" ")).flatMap((w) => w.split("-")).flatMap((p) => p.split("_"))
        `,
        },
        // #444 1d: monads built inside an array chain's callbacks are not a mix
        {
          name: "An array chain whose callbacks build different monads is not a mix",
          code: `
          import { Option, Either } from "functype"
          export const ids = (xs: string[]) =>
            xs.map((x) => Option(x)).filter((o) => o.isSome()).map((o) => Either.right(o))
        `,
        },
        // #444 1e: operands that don't guard one another
        {
          name: "An && chain whose operands don't guard one another",
          code: `
          export const show = (isAdmin: boolean, settings: { theme: string }, user: { profile: { name: string } }) =>
            isAdmin && settings.theme && user.profile.name
        `,
        },
        {
          name: "Optional chaining is already the fix",
          code: "const name = user && user?.profile && user?.profile?.name",
        },
        {
          name: "Monads written inside a callback, not returned by it, are not steps",
          code: `
          const result = option
            .flatMap((x) => { log(Either.right(x)); return getOption(x) })
            .map((y) => y + 1)
        `,
        },
        // Bare co-occurrence in a function arg list isn't composition
        // A conversion keeps the chain in one monad: every step here is an Option
        {
          name: "A step that converts with toOption() stays in the chain's monad",
          code: `
          export const parseDsn = (dsn: string | undefined) =>
            Option(dsn)
              .flatMap((value) => Try(() => new URL(value)).toOption())
              .flatMap((url) => Option(url.pathname.split("/").at(-1)).map((id) => ({ host: url.host, id })))
        `,
        },
        {
          name: "Both branches of a conditional step are Options",
          code: `
          const header = Try(() => JSON.parse(line))
            .toOption()
            .flatMap((h) => (typeof h.dsn === "string" ? parseDsn(h.dsn) : Option.none()))
            .map((p) => p.host)
        `,
        },
        {
          name: "Two flatMaps on a constructor root are two levels, below the default of 3",
          code: "const r = Option(x).flatMap((a) => Option(a + 1)).flatMap((b) => Option(b * 2))",
        },
        {
          name: "Function args mixing monads is not composition",
          code: `
          combine(Option(x), Try(() => f()))
        `,
        },
      ],
      invalid: showTransformations([
        // Nested null checks
        {
          name: "Nested null checks should use Do notation",
          code: "const city = user && user.address && user.address.city && user.address.city.name",
          errors: [{ messageId: "preferDoForNestedChecks" }],
        },
        // Multiple chained flatMaps
        {
          name: "Chained flatMap calls should use Do notation",
          code: `
          const result = option1
            .flatMap(x => getOption2(x))
            .flatMap(y => getOption3(y))
            .flatMap(z => getOption4(z))
            .flatMap(w => getOption5(w))
        `,
          errors: [{ messageId: "preferDoForChainedMethods", data: { count: "4" } }],
        },
        // Real-world user data access example
        {
          name: "Real-world nested user data access",
          code: `
          function getUserCity(user) {
            return user && user.profile && user.profile.address && user.profile.address.city
          }
        `,
          errors: [{ messageId: "preferDoForNestedChecks" }],
        },
        // Mixed monad types
        {
          name: "Mixed Option and Either operations",
          code: `
          const result = option
            .flatMap(x => Either.right(x))
            .flatMap(y => Try(() => process(y)))
        `,
          errors: [
            {
              messageId: "preferDoForMixedMonads",
            },
          ],
        },
        // Custom minChainDepth: 2 triggers on shorter chains
        {
          name: "Custom minChainDepth triggers on shorter chains",
          code: `
          const result = option
            .flatMap(x => getOption2(x))
            .flatMap(y => getOption3(y))
            .flatMap(z => getOption4(z))
        `,
          options: [{ minChainDepth: 2 }],
          errors: [
            {
              messageId: "preferDoForChainedMethods",
              data: { count: "3" },
            },
          ],
        },
        // Mixed monads with Option + Try
        {
          name: "Mixed Option and Try operations",
          code: `
          const result = Option.of(value)
            .flatMap(x => Try(() => riskyOp(x)))
        `,
          errors: [
            {
              messageId: "preferDoForMixedMonads",
            },
          ],
        },
        // #444 1a: still reported, and no longer rewritten into code that doesn't compile
        {
          name: "Nested checks in a file that imports Do are reported, not rewritten",
          code: `
          import { Do } from "functype"
          export const name = (user?: { profile?: { name?: string } }) => user && user.profile && user.profile.name
        `,
          errors: [{ messageId: "preferDoForNestedChecks" }],
        },
        // #444 1b: reported once, and no TODO comment is added
        {
          name: "A flatMap chain in a file that imports Do is reported, not commented",
          code: `
          import { Do, Option } from "functype"
          export const v = (o: Option<number>) =>
            o.flatMap((a) => Option(a + 1)).flatMap((b) => Option(b * 2)).flatMap((c) => Option(c - 1))
        `,
          errors: [{ messageId: "preferDoForChainedMethods", data: { count: "3" } }],
        },
        {
          name: "A guard run after an unrelated operand",
          code: "const name = isAdmin && user && user.profile && user.profile.name",
          errors: [{ messageId: "preferDoForNestedChecks" }],
        },
        {
          name: "A trailing fold doesn't hide the flatMap chain under it",
          code: `
          const total = Option(1)
            .flatMap((a) => Option(a + 1))
            .flatMap((b) => Option(b * 2))
            .flatMap((c) => Option(c - 1))
            .fold(() => 0, (n) => n)
        `,
          errors: [{ messageId: "preferDoForChainedMethods", data: { count: "3" } }],
        },
        {
          name: "A mix returned from a block-bodied callback",
          code: `
          const result = Option(input)
            .flatMap((x) => {
              if (x > 0) return Either.right(x)
              return Either.left("negative")
            })
            .map((y) => y + 1)
        `,
          errors: [{ messageId: "preferDoForMixedMonads" }],
        },
        {
          name: "A step that converts to another monad is a mix",
          code: `
          const result = Option(input)
            .flatMap((x) => Try(() => parse(x)).toEither((e) => e.message))
            .map((y) => y + 1)
        `,
          errors: [{ messageId: "preferDoForMixedMonads" }],
        },
        // Deeply nested && chain (4+ levels)
        {
          name: "Deeply nested && chain with property access",
          code: "const x = a && a.b && a.b.c && a.b.c.d && a.b.c.d.e",
          errors: [{ messageId: "preferDoForNestedChecks" }],
        },
      ]),
    },
    { showAll: true },
  )
})

describe("prefer-do-notation fixes", () => {
  it("has no autofix, so eslint --fix can't change code on its behalf (#444)", () => {
    expect(rule.meta?.fixable).toBeUndefined()
  })
})
