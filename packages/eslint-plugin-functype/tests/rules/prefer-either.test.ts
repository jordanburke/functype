import { describe } from "vitest"
import { ruleTester } from "../utils/rule-tester"
import rule from "../../src/rules/prefer-either"

describe("prefer-either", () => {
  ruleTester.run("prefer-either", rule, {
    valid: [
      // Using Either instead of try/catch
      {
        name: "Using Either is allowed",
        code: `
          function safeParse(json: string): Either<Error, object> {
            return Either.right(JSON.parse(json))
          }
        `,
      },
      // No error handling
      {
        name: "Functions without error handling are allowed",
        code: `
          function add(a: number, b: number): number {
            return a + b
          }
        `,
      },
      // Rethrowing in catch blocks (common pattern)
      {
        name: "Rethrowing in catch blocks is allowed",
        code: `
          function handleError() {
            try {
              riskyOperation()
            } catch (error) {
              console.error('Error occurred:', error)
              throw error  // Re-throwing is allowed
            }
          }
        `,
      },
      // Rethrowing after multiple statements in catch
      {
        name: "Rethrowing after logging and cleanup is allowed",
        code: `
          function handleWithCleanup() {
            try {
              riskyOperation()
            } catch (error) {
              cleanup()
              logError(error)
              notifyAdmin(error)
              throw error
            }
          }
        `,
      },
      // Function already returning Either should not trigger preferEitherReturn
      {
        name: "Function returning Either with internal throw is allowed",
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
      // Try/catch block
      {
        name: "Try/catch should use Either",
        code: `
          function parseJson(json: string) {
            try {
              return JSON.parse(json)
            } catch (error) {
              return null
            }
          }
        `,
        errors: [
          {
            messageId: "preferEitherOverTryCatch",
          },
        ],
      },
      // Throw statement
      {
        name: "Throw statement should use Either.left",
        code: `
          function validateAge(age: number) {
            if (age < 0) {
              throw new Error('Age cannot be negative')
            }
            return age
          }
        `,
        errors: [
          {
            messageId: "preferEitherOverThrow",
          },
        ],
      },
      // Function with throw and no Either return type
      {
        name: "Function with throw should return Either",
        code: `
          function divide(a: number, b: number): number {
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
          },
        ],
      },
      // Multiple try/catch blocks
      {
        name: "Multiple try/catch blocks should use Either",
        code: `
          function complexOperation() {
            try {
              firstOperation()
            } catch (e1) {
              console.error(e1)
            }

            try {
              secondOperation()
            } catch (e2) {
              console.error(e2)
            }
          }
        `,
        errors: [
          {
            messageId: "preferEitherOverTryCatch",
          },
          {
            messageId: "preferEitherOverTryCatch",
          },
        ],
      },
      // try/catch with empty catch block
      {
        name: "Empty catch block should use Either",
        code: `
          function silentParse(json: string) {
            try {
              return JSON.parse(json)
            } catch (e) {
            }
          }
        `,
        errors: [
          {
            messageId: "preferEitherOverTryCatch",
          },
        ],
      },
      // Nested try/catch
      {
        name: "Nested try/catch should use Either",
        code: `
          function nestedOps() {
            try {
              try {
                riskyOperation()
              } catch (inner) {
                fallback()
              }
            } catch (outer) {
              console.error(outer)
            }
          }
        `,
        errors: [
          {
            messageId: "preferEitherOverTryCatch",
          },
          {
            messageId: "preferEitherOverTryCatch",
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
          },
        ],
      },
      // Arrow function with throw and return type
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
          },
          {
            messageId: "preferEitherOverThrow",
          },
        ],
      },
    ],
  })
})
