import { describe } from "vitest"

import rule from "../../src/rules/prefer-either"
import { ruleTester } from "../utils/rule-tester"

describe("prefer-either", () => {
  ruleTester.run("prefer-either", rule, {
    valid: [
      // Using Either instead of throwing
      {
        name: "Using Either is allowed",
        code: `
          function safeParse(json: string): Either<Error, object> {
            return Either.right(JSON.parse(json))
          }
        `,
      },
      // No error handling at all
      {
        name: "Functions without error handling are allowed",
        code: `
          function add(a: number, b: number): number {
            return a + b
          }
        `,
      },
      // Function already returning Either should not trigger preferEitherReturn,
      // and the throw is inside a catch so it's exempt from preferEitherOverThrow.
      {
        name: "Function returning Either with internal rethrow is allowed",
        code: `
          function safeParse(json: string): Either<Error, object> {
            try {
              return Either.right(JSON.parse(json))
            } catch (error) {
              throw error
            }
          }
        `,
      },
    ],
    invalid: [
      // Throw statement in function body
      {
        name: "Throw statement should use Either.left",
        code: `function validateAge(age: number) { if (age < 0) { throw new Error('Age cannot be negative') } return age }`,
        errors: [
          {
            messageId: "preferEitherOverThrow",
            suggestions: [
              {
                messageId: "suggestEitherLeft",
                output: `function validateAge(age: number) { if (age < 0) { return Either.left(new Error('Age cannot be negative')) } return age }`,
              },
              {
                messageId: "suggestAddImport",
                data: { symbol: "Either" },
                output: `import { Either } from "functype"\nfunction validateAge(age: number) { if (age < 0) { throw new Error('Age cannot be negative') } return age }`,
              },
            ],
          },
        ],
      },
      // Function with throw and no Either return type
      {
        name: "Function with throw should return Either",
        code: `function divide(a: number, b: number): number { if (b === 0) { throw new Error('Division by zero') } return a / b }`,
        errors: [
          {
            messageId: "preferEitherReturn",
            data: { type: "number" },
          },
          {
            messageId: "preferEitherOverThrow",
            suggestions: [
              {
                messageId: "suggestEitherLeft",
                output: `function divide(a: number, b: number): number { if (b === 0) { return Either.left(new Error('Division by zero')) } return a / b }`,
              },
              {
                messageId: "suggestAddImport",
                data: { symbol: "Either" },
                output: `import { Either } from "functype"\nfunction divide(a: number, b: number): number { if (b === 0) { throw new Error('Division by zero') } return a / b }`,
              },
            ],
          },
        ],
      },
      // Function with throw and complex return type
      {
        name: "Function with throw and complex return type should return Either",
        code: `
          function fetchData(url: string): Promise<Array<Record<string, unknown>>> {
            if (!url) {
              throw new Error('URL required')
            }
            return fetch(url).then(r => r.json())
          }
        `,
        errors: [
          {
            messageId: "preferEitherReturn",
            data: { type: "Promise<Array<Record<string, unknown>>>" },
          },
          {
            messageId: "preferEitherOverThrow",
            suggestions: [
              {
                messageId: "suggestEitherLeft",
                output: `
          function fetchData(url: string): Promise<Array<Record<string, unknown>>> {
            if (!url) {
              return Either.left(new Error('URL required'))
            }
            return fetch(url).then(r => r.json())
          }
        `,
              },
              {
                messageId: "suggestAddImport",
                data: { symbol: "Either" },
                output: `
          import { Either } from "functype"
function fetchData(url: string): Promise<Array<Record<string, unknown>>> {
            if (!url) {
              throw new Error('URL required')
            }
            return fetch(url).then(r => r.json())
          }
        `,
              },
            ],
          },
        ],
      },
      // Arrow function with throw
      {
        name: "Arrow function with throw should suggest Either return",
        code: `
          const divide = (a: number, b: number): number => {
            if (b === 0) {
              throw new Error('Division by zero')
            }
            return a / b
          }
        `,
        errors: [
          {
            messageId: "preferEitherReturn",
            data: { type: "number" },
          },
          {
            messageId: "preferEitherOverThrow",
            suggestions: [
              {
                messageId: "suggestEitherLeft",
                output: `
          const divide = (a: number, b: number): number => {
            if (b === 0) {
              return Either.left(new Error('Division by zero'))
            }
            return a / b
          }
        `,
              },
              {
                messageId: "suggestAddImport",
                data: { symbol: "Either" },
                output: `
          import { Either } from "functype"
const divide = (a: number, b: number): number => {
            if (b === 0) {
              throw new Error('Division by zero')
            }
            return a / b
          }
        `,
              },
            ],
          },
        ],
      },
      // Multiple throws in same function
      {
        name: "Multiple throw statements should each report",
        code: `
          function validate(input: string): string {
            if (!input) {
              throw new Error('Input required')
            }
            if (input.length > 100) {
              throw new Error('Input too long')
            }
            return input.trim()
          }
        `,
        errors: [
          {
            messageId: "preferEitherReturn",
            data: { type: "string" },
          },
          {
            messageId: "preferEitherOverThrow",
            suggestions: [
              {
                messageId: "suggestEitherLeft",
                output: `
          function validate(input: string): string {
            if (!input) {
              return Either.left(new Error('Input required'))
            }
            if (input.length > 100) {
              throw new Error('Input too long')
            }
            return input.trim()
          }
        `,
              },
              {
                messageId: "suggestAddImport",
                data: { symbol: "Either" },
                output: `
          import { Either } from "functype"
function validate(input: string): string {
            if (!input) {
              throw new Error('Input required')
            }
            if (input.length > 100) {
              throw new Error('Input too long')
            }
            return input.trim()
          }
        `,
              },
            ],
          },
          {
            messageId: "preferEitherOverThrow",
            suggestions: [
              {
                messageId: "suggestEitherLeft",
                output: `
          function validate(input: string): string {
            if (!input) {
              throw new Error('Input required')
            }
            if (input.length > 100) {
              return Either.left(new Error('Input too long'))
            }
            return input.trim()
          }
        `,
              },
              {
                messageId: "suggestAddImport",
                data: { symbol: "Either" },
                output: `
          import { Either } from "functype"
function validate(input: string): string {
            if (!input) {
              throw new Error('Input required')
            }
            if (input.length > 100) {
              throw new Error('Input too long')
            }
            return input.trim()
          }
        `,
              },
            ],
          },
        ],
      },
      // throw in function body -> Either.left()
      {
        name: "throw in function body should suggest Either.left()",
        code: `function validate(x: number) {
  if (x < 0) {
    throw new Error("negative")
  }
  return x
}`,
        errors: [
          {
            messageId: "preferEitherOverThrow",
            suggestions: [
              {
                messageId: "suggestEitherLeft",
                output: `function validate(x: number) {
  if (x < 0) {
    return Either.left(new Error("negative"))
  }
  return x
}`,
              },
              {
                messageId: "suggestAddImport",
                data: { symbol: "Either" },
                output: `import { Either } from "functype"
function validate(x: number) {
  if (x < 0) {
    throw new Error("negative")
  }
  return x
}`,
              },
            ],
          },
        ],
      },
    ],
  })
})
