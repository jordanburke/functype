import { describe } from "vitest"
import { VisualRuleTester, showTransformations } from "../utils/visual-rule-tester"
import rule from "../../src/rules/prefer-do-notation"

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
      ],
      invalid: showTransformations([
        // Nested null checks
        {
          name: "Nested null checks should use Do notation",
          code: "const city = user && user.address && user.address.city && user.address.city.name",
          errors: [
            {
              messageId: "preferDoForNestedChecks",
            },
            {
              messageId: "preferDoForNestedChecks",
            },
          ],
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
          errors: [
            {
              messageId: "preferDoForChainedMethods",
              data: { count: "4" },
            },
            {
              messageId: "preferDoForChainedMethods",
              data: { count: "3" },
            },
          ],
        },
        // Real-world user data access example
        {
          name: "Real-world nested user data access",
          code: `
          function getUserCity(user) {
            return user && user.profile && user.profile.address && user.profile.address.city
          }
        `,
          errors: [
            {
              messageId: "preferDoForNestedChecks",
            },
            {
              messageId: "preferDoForNestedChecks",
            },
          ],
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
        // Deeply nested && chain (4+ levels)
        {
          name: "Deeply nested && chain with property access",
          code: "const x = a && a.b && a.b.c && a.b.c.d && a.b.c.d.e",
          errors: [
            {
              messageId: "preferDoForNestedChecks",
            },
            {
              messageId: "preferDoForNestedChecks",
            },
            {
              messageId: "preferDoForNestedChecks",
            },
          ],
        },
      ]),
    },
    { showAll: true },
  )
})
