import { describe } from "vitest"
import { ruleTester } from "../utils/rule-tester"
import rule from "../../src/rules/prefer-fold"

describe("prefer-fold", () => {
  ruleTester.run("prefer-fold", rule, {
    valid: [
      // Using fold
      {
        name: "Using fold() is preferred",
        code: `
          const result = option.fold(
            () => "empty",
            (value) => value.toUpperCase()
          )
        `,
      },
      // Simple if without monadic checks
      {
        name: "Simple if statements are allowed",
        code: `
          if (x > 5) {
            console.log("greater")
          }
        `,
      },
      // Single if statement with monadic check (below complexity threshold)
      {
        name: "Single if with monadic check is allowed with low complexity",
        code: `
          if (option.isSome()) {
            console.log(option.get())
          }
        `,
        options: [{ minComplexity: 3 }],
      },
    ],
    invalid: [
      // If/else chain with isSome check
      {
        name: "If/else with isSome should use fold",
        code: `
          if (option.isSome()) {
            return option.get()
          } else {
            return "default"
          }
        `,
        errors: [
          {
            messageId: "preferFold",
            data: { type: "Option" },
          },
        ],
        output: `
          option.fold(() => "default", (value) => option.get())
        `,
      },
      // Ternary operator with isRight check
      {
        name: "Ternary with Either check should use fold",
        code: 'const result = either.isRight() ? either.get() : "error"',
        errors: [
          {
            messageId: "preferFoldTernary",
            data: { type: "Either" },
          },
        ],
        output: 'const result = either.fold(() => "error", (value) => either.get())',
      },
      // Complex if/else if/else chain
      {
        name: "Complex if/else chain with monadic checks",
        code: `
          if (result.isSuccess()) {
            return result.get()
          } else if (result.isFailure()) {
            return "failed"
          } else {
            return "unknown"
          }
        `,
        errors: [
          {
            messageId: "preferFold",
            data: { type: "Result" },
          },
        ],
      },
      // Null check that could be Option
      {
        name: "Null check should potentially use Option.fold",
        code: `
          if (value !== null) {
            return value.toUpperCase()
          } else {
            return "empty"
          }
        `,
        errors: [
          {
            messageId: "preferFold",
            data: { type: "Option" },
          },
        ],
      },
      // Undefined check
      {
        name: "Undefined check should potentially use Option.fold",
        code: `
          if (value !== undefined) {
            return process(value)
          } else {
            return defaultValue
          }
        `,
        errors: [
          {
            messageId: "preferFold",
            data: { type: "Option" },
          },
        ],
      },
      // Ternary with null check
      {
        name: "Ternary with null check should use fold",
        code: 'const result = value === null ? "empty" : value.toString()',
        errors: [
          {
            messageId: "preferFoldTernary",
            data: { type: "Option" },
          },
        ],
      },
    ],
  })
})
