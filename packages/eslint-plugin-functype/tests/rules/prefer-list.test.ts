import { describe } from "vitest"
import { ruleTester } from "../utils/rule-tester"
import rule from "../../src/rules/prefer-list"

describe("prefer-list", () => {
  ruleTester.run("prefer-list", rule, {
    valid: [
      // Already using List
      {
        name: "List type is allowed",
        code: 'const items: List<string> = List.of("a", "b", "c")',
      },
      // Non-array types
      {
        name: "Non-array types are allowed",
        code: 'const value: string = "test"',
      },
      // Object types
      {
        name: "Object types are allowed",
        code: 'const user: { name: string } = { name: "test" }',
      },
    ],
    invalid: [
      // Array type syntax
      {
        name: "Array type should use List",
        code: 'const items: string[] = ["a", "b", "c"]',
        errors: [
          {
            messageId: "preferList",
            data: { type: "string", arrayType: "string[]" },
          },
        ],
      },
      // Array<T> syntax
      {
        name: "Array<T> type should use List",
        code: 'const items: Array<string> = ["a", "b", "c"]',
        errors: [
          {
            messageId: "preferList",
            data: { type: "string", arrayType: "Array<string>" },
          },
        ],
      },
      // ReadonlyArray<T> should still suggest List
      {
        name: "ReadonlyArray<T> should use List",
        code: 'const items: ReadonlyArray<string> = ["a", "b", "c"]',
        errors: [
          {
            messageId: "preferList",
            data: { type: "string", arrayType: "ReadonlyArray<string>" },
          },
        ],
      },
      // Array literal
      {
        name: "Array literal should use List.from",
        code: 'const items = ["a", "b", "c"]',
        errors: [
          {
            messageId: "preferListLiteral",
          },
        ],
      },
      // Complex type array
      {
        name: "Complex type array should use List",
        code: "const users: { name: string; age: number }[] = []",
        errors: [
          {
            messageId: "preferList",
            data: {
              type: "{ name: string; age: number }",
              arrayType: "{ name: string; age: number }[]",
            },
          },
        ],
      },
      // Function parameter
      {
        name: "Function parameter array should use List",
        code: "function processItems(items: string[]): void {}",
        errors: [
          {
            messageId: "preferList",
            data: { type: "string", arrayType: "string[]" },
          },
        ],
      },
      // Function return type
      {
        name: "Function return array should use List",
        code: "function getItems(): string[] { return [] }",
        errors: [
          {
            messageId: "preferList",
            data: { type: "string", arrayType: "string[]" },
          },
        ],
      },
      // Nested array literal in assignment
      {
        name: "Nested array literals should use List.from",
        code: "const matrix = [[1, 2], [3, 4]]",
        errors: [
          {
            messageId: "preferListLiteral",
          },
        ],
      },
    ],
  })
})
