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
      // Using getOrElse (already using proper pattern)
      {
        name: "getOrElse is a valid alternative to fold",
        code: `const result = option.getOrElse("default")`,
      },
      // If/else with regular boolean condition (not monadic)
      {
        name: "Non-monadic if/else is allowed",
        code: `
          if (count > 0) {
            return "positive"
          } else {
            return "non-positive"
          }
        `,
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
          option.fold(() => "default", (value) => value)
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
        output: 'const result = either.fold(() => "error", (value) => value)',
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
      // isNone() check in if/else (negated path)
      {
        name: "If/else with isNone should use fold",
        code: `
          if (option.isNone()) {
            return "empty"
          } else {
            return option.get()
          }
        `,
        errors: [
          {
            messageId: "preferFold",
            data: { type: "Option" },
          },
        ],
        output: `
          option.fold(() => "empty", (value) => value)
        `,
      },
      // isLeft() check in if/else (Either negated path)
      {
        name: "If/else with isLeft should use fold",
        code: `
          if (either.isLeft()) {
            return "error"
          } else {
            return either.get()
          }
        `,
        errors: [
          {
            messageId: "preferFold",
            data: { type: "Either" },
          },
        ],
        output: `
          either.fold(() => "error", (value) => value)
        `,
      },
      // Ternary with isNone() (negated ternary)
      {
        name: "Ternary with isNone should use fold",
        code: 'const result = option.isNone() ? "empty" : option.get()',
        errors: [
          {
            messageId: "preferFoldTernary",
            data: { type: "Option" },
          },
        ],
        output: 'const result = option.fold(() => "empty", (value) => value)',
      },
      // minComplexity: 1 triggers on single if/else
      {
        name: "Single if/else triggers with minComplexity 1",
        code: `
          if (option.isSome()) {
            return option.get()
          } else {
            return "default"
          }
        `,
        options: [{ minComplexity: 1 }],
        errors: [
          {
            messageId: "preferFold",
            data: { type: "Option" },
          },
        ],
        output: `
          option.fold(() => "default", (value) => value)
        `,
      },
      // Loose equality null check (== null)
      {
        name: "Loose null equality check should use fold",
        code: `
          if (value == null) {
            return "missing"
          } else {
            return value.toString()
          }
        `,
        errors: [
          {
            messageId: "preferFold",
            data: { type: "Option" },
          },
        ],
      },
      // .get() followed by method call should be replaced with value
      {
        name: "Auto-fix replaces .get().method() with value.method()",
        code: `
          if (option.isSome()) {
            return option.get().toUpperCase()
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
          option.fold(() => "default", (value) => value.toUpperCase())
        `,
      },
      // isFailure() check (Result type negated path)
      {
        name: "If/else with isFailure should use fold",
        code: `
          if (result.isFailure()) {
            return "failed"
          } else {
            return result.get()
          }
        `,
        errors: [
          {
            messageId: "preferFold",
            data: { type: "Result" },
          },
        ],
        output: `
          result.fold(() => "failed", (value) => value)
        `,
      },
    ],
  })
})
