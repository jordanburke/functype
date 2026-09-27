import { describe } from "vitest"

import rule from "../../src/rules/prefer-either"
import { ruleTester } from "../utils/rule-tester"

describe("prefer-either", () => {
  ruleTester.run("prefer-either", rule, {
    valid: [
      // #241 — `@interop <reason>` marks a function whose contract with a host library IS the throw.
      {
        name: "A throw inside an @interop function is the host contract",
        code: `/**
 * Runs the effect, or throws for React Query.
 *
 * @interop React Query signals failure only by promise rejection.
 */
const runBoxed = async (effect) => {
  const exit = await effect()
  if (exit.failed) throw new Error("boxed")
  return exit.value
}`,
      },
      {
        name: "@interop on an exported function declaration covers throws in nested callbacks",
        code: `/** @interop React's use() reaches an ErrorBoundary only through a throw. */
export function useValue(p) {
  return p.fold(
    (e) => {
      throw e
    },
    (a) => a,
  )
}`,
      },
      // #325 D — `@invariant <reason>` marks a throw that signals a programmer error, not an expected failure.
      {
        name: "A throw inside an @invariant function is a documented invariant violation",
        code: `/** @invariant Called only inside a DBOS step, where every argument is already validated. */
function deriveRunId(workflowId: string, step: number): string {
  if (step < 0) throw new Error("step must be non-negative")
  return workflowId + ":" + step
}`,
      },
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
      {
        name: "A bare @interop tag with no reason does not exempt",
        code: `/** @interop */
function f(x: boolean): number {
  if (x) throw new Error("x")
  return 1
}`,
        errors: [{ messageId: "preferEitherReturn", data: { type: "number" } }],
      },
      {
        name: "@interop on one function does not cover a sibling",
        code: `/** @interop React Query needs a rejection. */
const a = () => 1
function b(x) {
  if (x) throw new Error("x")
}`,
        errors: [{ messageId: "preferEitherOverThrow" }],
      },
      {
        name: "A plain comment mentioning @interop is not a JSDoc marker",
        code: `// @interop React Query needs a rejection.
function b(x) {
  if (x) throw new Error("x")
}`,
        errors: [{ messageId: "preferEitherOverThrow" }],
      },
      {
        name: "allowInteropMarker: false reports inside an @interop function",
        code: `/** @interop React Query needs a rejection. */
function b(x) {
  if (x) throw new Error("x")
}`,
        options: [{ allowInteropMarker: false }],
        errors: [{ messageId: "preferEitherOverThrow" }],
      },
      {
        name: "allowInvariantMarker: false reports inside an @invariant function",
        code: `/** @invariant Arguments are validated upstream. */
function b(x) {
  if (x) throw new Error("x")
}`,
        options: [{ allowInvariantMarker: false }],
        errors: [{ messageId: "preferEitherOverThrow" }],
      },
      // #324 — one report per throw. The enclosing function's return type decides the message; a throw
      // inside a nested function belongs to that function, not the outer one.
      {
        name: "A throw in a nested unannotated function does not make the annotated outer function report",
        code: `function outer(): number {
  const f = () => {
    throw new Error("x")
  }
  return 1
}`,
        errors: [
          {
            messageId: "preferEitherOverThrow",
            suggestions: [
              {
                messageId: "suggestEitherLeft",
                output: `function outer(): number {
  const f = () => {
    return Either.left(new Error("x"))
  }
  return 1
}`,
              },
              {
                messageId: "suggestAddImport",
                data: { symbol: "Either" },
                output: `import { Either } from "functype"
function outer(): number {
  const f = () => {
    throw new Error("x")
  }
  return 1
}`,
              },
            ],
          },
        ],
      },
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
            messageId: "preferEitherReturn",
            data: { type: "string" },
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
