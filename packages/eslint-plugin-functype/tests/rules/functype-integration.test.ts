import { describe } from "vitest"
import { ruleTester } from "../utils/rule-tester"
import preferOption from "../../src/rules/prefer-option"
import preferList from "../../src/rules/prefer-list"

describe("functype-integration", () => {
  describe("prefer-option with functype imports", () => {
    ruleTester.run("prefer-option", preferOption, {
      valid: [
        // Should not flag when functype is imported and used properly
        {
          name: "Functype Option usage is not flagged",
          code: `
            import { Option, Some, None } from 'functype'
            const maybeValue: Option<string> = Some("test")
            const noValue: Option<string> = None
          `,
        },
        // Already using Option types should not be flagged again
        {
          name: "Existing Option types are not flagged",
          code: `
            import { Option } from 'functype'
            const value: Option<string> = Option.some("test")
          `,
        },
      ],
      invalid: [
        // Should still flag nullable types when functype is imported but not used
        {
          name: "Still flags nullable types with functype import",
          code: `
            import { Option } from 'functype'
            const value: string | null = null
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

  describe("prefer-list with functype imports", () => {
    ruleTester.run("prefer-list", preferList, {
      valid: [
        // Should not flag when List.from is used
        {
          name: "List.from usage is not flagged",
          code: `
            import { List } from 'functype'
            const items = List.from([1, 2, 3])
            const empty = List.empty<string>()
          `,
        },
        // Should not flag arrays within List.of calls
        {
          name: "Arrays in List.of calls are not flagged",
          code: `
            import { List } from 'functype'
            const matrix = List.from([[1, 2], [3, 4]])
          `,
        },
      ],
      invalid: [
        // Should still flag array literals when functype is imported but List not used
        {
          name: "Still flags array literals with functype import",
          code: `
            import { Option } from 'functype'
            const items = [1, 2, 3]
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
