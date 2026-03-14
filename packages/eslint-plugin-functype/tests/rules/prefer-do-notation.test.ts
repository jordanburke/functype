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
      ]),
    },
    { showAll: true },
  )
})
