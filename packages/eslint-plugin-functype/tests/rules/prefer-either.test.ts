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
    ],
  })
})
