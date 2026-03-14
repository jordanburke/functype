import { describe } from "vitest"
import { ruleTester } from "../utils/rule-tester"
import rule from "../../src/rules/prefer-option"

describe("prefer-option", () => {
  ruleTester.run("prefer-option", rule, {
    valid: [
      // Already using Option
      {
        name: "Option type is allowed",
        code: 'const value: Option<string> = Some("test")',
      },
      // Non-nullable types
      {
        name: "Non-nullable types are allowed",
        code: 'const value: string = "test"',
      },
      // Function parameters with non-nullable types
      {
        name: "Function with non-nullable parameters",
        code: "function test(value: string): string { return value }",
      },
      // Complex types without null/undefined
      {
        name: "Complex types without nullability",
        code: 'const value: { name: string; age: number } = { name: "test", age: 25 }',
      },
    ],
    invalid: [
      // Basic nullable type
      {
        name: "String or null should use Option",
        code: "const value: string | null = null",
        errors: [
          {
            messageId: "preferOption",
            data: { type: "string", nullable: "string | null" },
          },
        ],
      },
      // String or undefined
      {
        name: "String or undefined should use Option",
        code: "const value: string | undefined = undefined",
        errors: [
          {
            messageId: "preferOption",
            data: { type: "string", nullable: "string | undefined" },
          },
        ],
      },
      // String with both null and undefined
      {
        name: "String with null and undefined should use Option",
        code: "const value: string | null | undefined = null",
        errors: [
          {
            messageId: "preferOption",
            data: { type: "string", nullable: "string | null | undefined" },
          },
        ],
      },
      // Function return type
      {
        name: "Function return type should use Option",
        code: "function getValue(): string | null { return null }",
        errors: [
          {
            messageId: "preferOption",
            data: { type: "string", nullable: "string | null" },
          },
        ],
      },
      // Complex type with null
      {
        name: "Complex type with null should use Option",
        code: "const user: { name: string; age: number } | null = null",
        errors: [
          {
            messageId: "preferOption",
            data: {
              type: "{ name: string; age: number }",
              nullable: "{ name: string; age: number } | null",
            },
          },
        ],
      },
      // Array type with null
      {
        name: "Array type with null should use Option",
        code: "const items: string[] | null = null",
        errors: [
          {
            messageId: "preferOption",
            data: { type: "string[]", nullable: "string[] | null" },
          },
        ],
      },
    ],
  })
})
