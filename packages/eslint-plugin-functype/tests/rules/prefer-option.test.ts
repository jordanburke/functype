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
      // Multi-member union should not flag
      {
        name: "Multi-type union with null is not flagged",
        code: "const value: string | number | null = null",
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
            suggestions: [
              {
                messageId: "suggestOptionType",
                data: { type: "string" },
                output: "const value: Option<string> = null",
              },
              {
                messageId: "suggestAddImport",
                data: { symbol: "Option" },
                output: 'import { Option } from "functype"\nconst value: string | null = null',
              },
            ],
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
            suggestions: [
              {
                messageId: "suggestOptionType",
                data: { type: "string" },
                output: "const value: Option<string> = undefined",
              },
              {
                messageId: "suggestAddImport",
                data: { symbol: "Option" },
                output: 'import { Option } from "functype"\nconst value: string | undefined = undefined',
              },
            ],
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
            suggestions: [
              {
                messageId: "suggestOptionType",
                data: { type: "string" },
                output: "const value: Option<string> = null",
              },
              {
                messageId: "suggestAddImport",
                data: { symbol: "Option" },
                output: 'import { Option } from "functype"\nconst value: string | null | undefined = null',
              },
            ],
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
            suggestions: [
              {
                messageId: "suggestOptionType",
                data: { type: "string" },
                output: "function getValue(): Option<string> { return null }",
              },
              {
                messageId: "suggestAddImport",
                data: { symbol: "Option" },
                output: 'import { Option } from "functype"\nfunction getValue(): string | null { return null }',
              },
            ],
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
            suggestions: [
              {
                messageId: "suggestOptionType",
                data: { type: "{ name: string; age: number }" },
                output: "const user: Option<{ name: string; age: number }> = null",
              },
              {
                messageId: "suggestAddImport",
                data: { symbol: "Option" },
                output: 'import { Option } from "functype"\nconst user: { name: string; age: number } | null = null',
              },
            ],
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
            suggestions: [
              {
                messageId: "suggestOptionType",
                data: { type: "string[]" },
                output: "const items: Option<string[]> = null",
              },
              {
                messageId: "suggestAddImport",
                data: { symbol: "Option" },
                output: 'import { Option } from "functype"\nconst items: string[] | null = null',
              },
            ],
          },
        ],
      },
    ],
  })
})
