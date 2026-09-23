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
      // The untyped nullable heuristic must NOT fire when a ternary branch is literally undefined/null —
      // that's optional value construction (prefer-option's concern), not a fold. Regression for a false
      // positive on plain `T | undefined` ternaries.
      {
        name: "Nullable ternary yielding undefined in a branch is not a fold candidate",
        code: 'const label = title !== undefined ? "t=" + title : undefined',
      },
      {
        name: "Nullable ternary yielding null in a branch is not a fold candidate",
        code: "const x = value === null ? null : value.toString()",
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
        output: null,
        errors: [
          {
            messageId: "preferFold",
            data: { type: "Option" },
            suggestions: [
              {
                messageId: "suggestFold",
                output: `
          return option.fold(() => "default", (value) => value)
        `,
              },
            ],
          },
        ],
      },
      // Ternary operator with isRight check
      {
        name: "Ternary with Either check should use fold",
        code: 'const result = either.isRight() ? either.get() : "error"',
        output: null,
        errors: [
          {
            messageId: "preferFoldTernary",
            data: { type: "Either" },
            suggestions: [
              { messageId: "suggestFold", output: 'const result = either.fold(() => "error", (value) => value)' },
            ],
          },
        ],
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
        output: null,
        errors: [
          {
            messageId: "preferFold",
            data: { type: "Option" },
            suggestions: [
              {
                messageId: "suggestFold",
                output: `
          return option.fold(() => "empty", (value) => value)
        `,
              },
            ],
          },
        ],
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
        output: null,
        errors: [
          {
            messageId: "preferFold",
            data: { type: "Either" },
            suggestions: [
              {
                messageId: "suggestFold",
                output: `
          return either.fold(() => "error", (value) => value)
        `,
              },
            ],
          },
        ],
      },
      // Ternary with isNone() (negated ternary)
      {
        name: "Ternary with isNone should use fold",
        code: 'const result = option.isNone() ? "empty" : option.get()',
        output: null,
        errors: [
          {
            messageId: "preferFoldTernary",
            data: { type: "Option" },
            suggestions: [
              { messageId: "suggestFold", output: 'const result = option.fold(() => "empty", (value) => value)' },
            ],
          },
        ],
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
        output: null,
        errors: [
          {
            messageId: "preferFold",
            data: { type: "Option" },
            suggestions: [
              {
                messageId: "suggestFold",
                output: `
          return option.fold(() => "default", (value) => value)
        `,
              },
            ],
          },
        ],
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
        name: "Suggestion replaces .get().method() with value.method()",
        code: `
          if (option.isSome()) {
            return option.get().toUpperCase()
          } else {
            return "default"
          }
        `,
        output: null,
        errors: [
          {
            messageId: "preferFold",
            data: { type: "Option" },
            suggestions: [
              {
                messageId: "suggestFold",
                output: `
          return option.fold(() => "default", (value) => value.toUpperCase())
        `,
              },
            ],
          },
        ],
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
        output: null,
        errors: [
          {
            messageId: "preferFold",
            data: { type: "Result" },
            suggestions: [
              {
                messageId: "suggestFold",
                output: `
          return result.fold(() => "failed", (value) => value)
        `,
              },
            ],
          },
        ],
      },
    ],
  })

  // #323 — prefer-fold must never rewrite code under `eslint --fix` (ts-builds validate runs --fix, which
  // applies fixable rules at warn severity). Every rewrite is offered as a suggestion, and the suggested
  // code must type-check: branch values read through the fold's parameters, never through the
  // un-narrowed receiver.
  ruleTester.run("prefer-fold (#323: suggestions, not autofix)", rule, {
    valid: [],
    invalid: [
      {
        name: "Ternary is not autofixed; the fold is a suggestion",
        code: 'const result = either.isRight() ? either.orThrow() : "error"',
        output: null,
        errors: [
          {
            messageId: "preferFoldTernary",
            data: { type: "Either" },
            suggestions: [
              { messageId: "suggestFold", output: 'const result = either.fold(() => "error", (value) => value)' },
            ],
          },
        ],
      },
      {
        name: "Narrowed Left read binds the fold's left parameter instead of the un-narrowed receiver",
        code: "const errOf = (e) => (e.isLeft() ? e.value : undefined)",
        output: null,
        errors: [
          {
            messageId: "preferFoldTernary",
            data: { type: "Either" },
            suggestions: [
              { messageId: "suggestFold", output: "const errOf = (e) => (e.fold((left) => left, () => undefined))" },
            ],
          },
        ],
      },
      {
        name: "Narrowed Right read via .value binds the success parameter",
        code: "const n = e.isRight() ? e.value + 1 : 0",
        output: null,
        errors: [
          {
            messageId: "preferFoldTernary",
            data: { type: "Either" },
            suggestions: [{ messageId: "suggestFold", output: "const n = e.fold(() => 0, (value) => value + 1)" }],
          },
        ],
      },
      {
        name: "Try failure read via .error binds the failure parameter",
        code: "const msg = t.isFailure() ? t.error.message : t.orThrow()",
        output: null,
        errors: [
          {
            messageId: "preferFoldTernary",
            data: { type: "Result" },
            suggestions: [
              { messageId: "suggestFold", output: "const msg = t.fold((error) => error.message, (value) => value)" },
            ],
          },
        ],
      },
      {
        name: "A branch that ignores the value gets a parameterless callback (no unused param)",
        code: 'const label = o.isSome() ? "yes" : "no"',
        output: null,
        errors: [
          {
            messageId: "preferFoldTernary",
            data: { type: "Option" },
            suggestions: [{ messageId: "suggestFold", output: 'const label = o.fold(() => "no", () => "yes")' }],
          },
        ],
      },
      {
        name: "The fold parameter never shadows an identifier the branches already use",
        code: "const total = o.isSome() ? o.orThrow() + value : value",
        output: null,
        errors: [
          {
            messageId: "preferFoldTernary",
            data: { type: "Option" },
            suggestions: [
              { messageId: "suggestFold", output: "const total = o.fold(() => value, (value1) => value1 + value)" },
            ],
          },
        ],
      },
      {
        name: "Receiver members of another object are not rewritten",
        code: "const x = e.isRight() ? other.e.value : 0",
        output: null,
        errors: [
          {
            messageId: "preferFoldTernary",
            data: { type: "Either" },
            suggestions: [{ messageId: "suggestFold", output: "const x = e.fold(() => 0, () => other.e.value)" }],
          },
        ],
      },
      {
        name: "Choosing between two Options suggests .or(), not a fold",
        code: "const pick = (a, b) => (a.isSome() ? a : b)",
        output: null,
        errors: [
          {
            messageId: "preferFoldTernary",
            data: { type: "Option" },
            suggestions: [
              {
                messageId: "suggestOr",
                data: { receiver: "a", alternative: "b" },
                output: "const pick = (a, b) => (a.or(b))",
              },
            ],
          },
        ],
      },
      {
        name: "Negated form of the Option choice also suggests .or()",
        code: "const pick = (a, b) => (a.isNone() ? b : a)",
        output: null,
        errors: [
          {
            messageId: "preferFoldTernary",
            data: { type: "Option" },
            suggestions: [
              {
                messageId: "suggestOr",
                data: { receiver: "a", alternative: "b" },
                output: "const pick = (a, b) => (a.or(b))",
              },
            ],
          },
        ],
      },
      {
        name: "If/else of returns keeps the return",
        code: `function f(o) {
  if (o.isSome()) {
    return o.orThrow()
  } else {
    return "d"
  }
}`,
        output: null,
        errors: [
          {
            messageId: "preferFold",
            data: { type: "Option" },
            suggestions: [
              {
                messageId: "suggestFold",
                output: `function f(o) {
  return o.fold(() => "d", (value) => value)
}`,
              },
            ],
          },
        ],
      },
      {
        name: "If/else of bare (unbraced) returns keeps the return",
        code: `function f(o) {
  if (o.isNone()) return "d"
  else return o.orThrow()
}`,
        output: null,
        errors: [
          {
            messageId: "preferFold",
            data: { type: "Option" },
            suggestions: [
              {
                messageId: "suggestFold",
                output: `function f(o) {
  return o.fold(() => "d", (value) => value)
}`,
              },
            ],
          },
        ],
      },
    ],
  })
})
