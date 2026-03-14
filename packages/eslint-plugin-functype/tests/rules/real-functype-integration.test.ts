import { describe } from "vitest"
import { ruleTester } from "../utils/rule-tester"
import preferOption from "../../src/rules/prefer-option"
import preferList from "../../src/rules/prefer-list"

/**
 * Integration tests using actual functype library patterns
 * This verifies our rules work correctly with real functype usage
 */
describe("real-functype-integration", () => {
  describe("prefer-option with real functype patterns", () => {
    ruleTester.run("prefer-option", preferOption, {
      valid: [
        // Real functype Option usage should not be flagged
        {
          name: "Real Option.some() usage",
          code: `
            import { Option } from 'functype'
            const maybeValue = Option.some("test")
            const result: Option<string> = maybeValue.map(x => x.toUpperCase())
          `,
        },
        // Real functype None usage
        {
          name: "Real Option.none() usage",
          code: `
            import { Option } from 'functype'
            const noValue = Option.none<string>()
            const result = noValue.getOrElse("default")
          `,
        },
        // Real functype chaining patterns
        {
          name: "Real Option chaining",
          code: `
            import { Option } from 'functype'
            function findUser(id: string): Option<{ name: string }> {
              return Option.some({ name: "test" })
            }
            const userName = findUser("123")
              .map(user => user.name)
              .filter(name => name.length > 0)
              .getOrElse("Unknown")
          `,
        },
      ],
      invalid: [
        // Should still flag when functype is available but not used
        {
          name: "Still flags nullable types with functype available",
          code: `
            import { Option } from 'functype'
            const value: string | null = null
            const unused = Option.some("test") // functype is available but not used for value
          `,
          errors: [
            {
              messageId: "preferOption",
              data: { type: "string", nullable: "string | null" },
            },
          ],
        },
      ],
    })
  })

  describe("prefer-list with real functype patterns", () => {
    ruleTester.run("prefer-list", preferList, {
      valid: [
        // Real functype List.from usage should not be flagged
        {
          name: "Real List.from() usage",
          code: `
            import { List } from 'functype'
            const items = List.from([1, 2, 3])
            const result = items.map(x => x * 2).filter(x => x > 2)
          `,
        },
        // Real functype List.of usage
        {
          name: "Real List.of() usage",
          code: `
            import { List } from 'functype'
            const items = List.of(1, 2, 3)
            const doubled = items.map(x => x * 2)
          `,
        },
        // Real functype List chaining
        {
          name: "Real List chaining patterns",
          code: `
            import { List } from 'functype'
            const numbers = List.from([1, 2, 3, 4, 5])
            const result = numbers
              .filter(x => x % 2 === 0)
              .map(x => x.toString())
              .fold("", (acc, x) => acc + x)
          `,
        },
      ],
      invalid: [
        // Should still flag when functype is available but array literals used
        {
          name: "Still flags array literals with functype available",
          code: `
            import { List } from 'functype'
            const items = [1, 2, 3]
            const unused = List.from([4, 5, 6]) // functype is available but not used for items
          `,
          errors: [
            {
              messageId: "preferListLiteral",
            },
          ],
        },
      ],
    })
  })
})
