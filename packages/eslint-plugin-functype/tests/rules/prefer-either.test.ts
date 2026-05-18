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
      // Try/catch block with multi-stmt catch — no suggestion (catch has 2 stmts, isSimpleCatch=false)
      {
        name: "Try/catch should use Either",
        code: `function parseJson(json: string) { try { return JSON.parse(json) } catch (error) { console.error(error); return null } }`,
        errors: [
          {
            messageId: "preferEitherOverTryCatch",
          },
        ],
      },
      // Throw statement
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
      // Multiple try/catch blocks — each has single-stmt expression body (non-return), so no suggestion
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
      // try/catch with empty catch block — simple try + empty catch triggers suggestions
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
            suggestions: [
              {
                messageId: "suggestTry",
                output: `
          function silentParse(json: string) {
            return Try(() => JSON.parse(json))
          }
        `,
              },
              {
                messageId: "suggestAddImport",
                data: { symbol: "Try" },
                output: `
          import { Try } from "functype"
function silentParse(json: string) {
            try {
              return JSON.parse(json)
            } catch (e) {
            }
          }
        `,
              },
            ],
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
      // Simple try/catch with empty catch -> Try() suggestion
      {
        name: "Simple try/catch with empty catch should suggest Try()",
        code: `function parse(json: string) {
  try {
    return JSON.parse(json)
  } catch (e) {}
}`,
        errors: [
          {
            messageId: "preferEitherOverTryCatch",
            suggestions: [
              {
                messageId: "suggestTry",
                output: `function parse(json: string) {
  return Try(() => JSON.parse(json))
}`,
              },
              {
                messageId: "suggestAddImport",
                data: { symbol: "Try" },
                output: `import { Try } from "functype"
function parse(json: string) {
  try {
    return JSON.parse(json)
  } catch (e) {}
}`,
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
      // Multi-statement try body -> no suggestion
      {
        name: "Multi-statement try body should have no suggestion",
        code: `function f() { try { const a = 1; return a } catch (e) { return null } }`,
        errors: [{ messageId: "preferEitherOverTryCatch" }],
      },
    ],
  })
})
