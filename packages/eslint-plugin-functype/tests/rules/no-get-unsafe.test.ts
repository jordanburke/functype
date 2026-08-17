import { describe } from "vitest"
import { ruleTester } from "../utils/rule-tester"
import rule from "../../src/rules/no-get-unsafe"

/**
 * Helper: RuleTester (since typescript-eslint 8.x) requires every reported error
 * to assert its `suggestions`. These builders keep the expected shape DRY.
 *
 * When the original call carried arguments (`.expect("msg")`, `.orThrow(err)`),
 * both suggestions preserve the source text in a `; was ${method}(${args})`
 * suffix inside the TODO comment. When there were no args (`.get()`,
 * `.orThrow()`, `.unwrap()`), the suffix is omitted.
 */
const wasSuffix = (method: string, argsSource: string): string => (argsSource ? `; was ${method}(${argsSource})` : "")

const orElseOutput = (source: string, receiver: string, method: string, argsSource: string): string =>
  source.replace(
    `${receiver}.${method}(${argsSource})`,
    `${receiver}.orElse(undefined /* TODO: default${wasSuffix(method, argsSource)} */)`,
  )

const foldOutput = (source: string, receiver: string, method: string, argsSource: string): string =>
  source.replace(
    `${receiver}.${method}(${argsSource})`,
    `${receiver}.fold(() => undefined /* TODO: onNone${wasSuffix(method, argsSource)} */, (v) => v /* TODO: onSome */)`,
  )

const suggestionsFor = (code: string, receiver: string, method: string, argsSource = "") => [
  {
    messageId: "suggestOrElse" as const,
    output: orElseOutput(code, receiver, method, argsSource),
  },
  {
    messageId: "suggestFold" as const,
    output: foldOutput(code, receiver, method, argsSource),
  },
]

describe("no-get-unsafe", () => {
  ruleTester.run("no-get-unsafe", rule, {
    valid: [
      {
        name: "Using fold() is allowed",
        code: `
          const result = option.fold(
            () => "default",
            (value) => value
          )
        `,
      },
      // functype's actual extract method — no getOrElse alias exists.
      {
        name: "Using orElse() is allowed",
        code: 'const value = option.orElse("default")',
      },
      {
        name: "Using map() is allowed",
        code: "const mapped = option.map(x => x.toUpperCase())",
      },
      {
        name: "Regular method calls are allowed",
        code: "const result = obj.getData()",
      },
      {
        name: "Non-monadic get() calls are allowed",
        code: 'const item = map.get("key")',
      },
    ],
    invalid: [
      // orThrow — functype's actual dangerous extractor (added to defaults in this release).
      {
        name: "orThrow() call on Option should be avoided",
        code: "const value = someOption.orThrow()",
        errors: [
          {
            messageId: "noUnsafeGet",
            data: { method: "orThrow" },
            suggestions: suggestionsFor("const value = someOption.orThrow()", "someOption", "orThrow"),
          },
        ],
        output: null,
      },
      // Legacy names — kept in defaults for consumers on older functype versions.
      {
        name: "get() call on Option should be avoided",
        code: "const value = someOption.get()",
        errors: [
          {
            messageId: "noUnsafeGet",
            data: { method: "get" },
            suggestions: suggestionsFor("const value = someOption.get()", "someOption", "get"),
          },
        ],
        output: null,
      },
      {
        name: "getOrThrow() call should be avoided",
        code: "const value = either.getOrThrow()",
        errors: [
          {
            messageId: "noUnsafeGet",
            data: { method: "getOrThrow" },
            suggestions: suggestionsFor("const value = either.getOrThrow()", "either", "getOrThrow"),
          },
        ],
        output: null,
      },
      {
        name: "unwrap() call should be avoided",
        code: "const value = result.unwrap()",
        errors: [
          {
            messageId: "noUnsafeGet",
            data: { method: "unwrap" },
            suggestions: suggestionsFor("const value = result.unwrap()", "result", "unwrap"),
          },
        ],
        output: null,
      },
      // .expect("msg") — the old autofix silently dropped the message argument.
      // The new suggestions preserve source text and replace at the CallExpression level.
      {
        name: "expect() call should be avoided",
        code: 'const value = option.expect("Should have value")',
        errors: [
          {
            messageId: "noUnsafeGet",
            data: { method: "expect" },
            suggestions: suggestionsFor(
              'const value = option.expect("Should have value")',
              "option",
              "expect",
              '"Should have value"',
            ),
          },
        ],
        output: null,
      },
      {
        name: "Chained unsafe calls should be detected",
        code: 'const value = Some("test").map(x => x.toUpperCase()).get()',
        errors: [
          {
            messageId: "noUnsafeGet",
            data: { method: "get" },
            suggestions: [
              {
                messageId: "suggestOrElse",
                output: 'const value = Some("test").map(x => x.toUpperCase()).orElse(undefined /* TODO: default */)',
              },
              {
                messageId: "suggestFold",
                output:
                  'const value = Some("test").map(x => x.toUpperCase()).fold(() => undefined /* TODO: onNone */, (v) => v /* TODO: onSome */)',
              },
            ],
          },
        ],
        output: null,
      },
      // Multiple unsafe calls — each independently reported with its own suggestions.
      {
        name: "Multiple unsafe calls should all be flagged",
        code: `
          const value1 = option1.get()
          const value2 = option2.getOrThrow()
          const value3 = result.unwrap()
        `,
        errors: [
          {
            messageId: "noUnsafeGet",
            data: { method: "get" },
            suggestions: [
              {
                messageId: "suggestOrElse",
                output: `
          const value1 = option1.orElse(undefined /* TODO: default */)
          const value2 = option2.getOrThrow()
          const value3 = result.unwrap()
        `,
              },
              {
                messageId: "suggestFold",
                output: `
          const value1 = option1.fold(() => undefined /* TODO: onNone */, (v) => v /* TODO: onSome */)
          const value2 = option2.getOrThrow()
          const value3 = result.unwrap()
        `,
              },
            ],
          },
          {
            messageId: "noUnsafeGet",
            data: { method: "getOrThrow" },
            suggestions: [
              {
                messageId: "suggestOrElse",
                output: `
          const value1 = option1.get()
          const value2 = option2.orElse(undefined /* TODO: default */)
          const value3 = result.unwrap()
        `,
              },
              {
                messageId: "suggestFold",
                output: `
          const value1 = option1.get()
          const value2 = option2.fold(() => undefined /* TODO: onNone */, (v) => v /* TODO: onSome */)
          const value3 = result.unwrap()
        `,
              },
            ],
          },
          {
            messageId: "noUnsafeGet",
            data: { method: "unwrap" },
            suggestions: [
              {
                messageId: "suggestOrElse",
                output: `
          const value1 = option1.get()
          const value2 = option2.getOrThrow()
          const value3 = result.orElse(undefined /* TODO: default */)
        `,
              },
              {
                messageId: "suggestFold",
                output: `
          const value1 = option1.get()
          const value2 = option2.getOrThrow()
          const value3 = result.fold(() => undefined /* TODO: onNone */, (v) => v /* TODO: onSome */)
        `,
              },
            ],
          },
        ],
        output: null,
      },
      {
        name: "Custom unsafeMethods option is honored",
        code: 'const value = someOption.expect("msg")',
        options: [{ unsafeMethods: ["expect"] }],
        errors: [
          {
            messageId: "noUnsafeGet",
            data: { method: "expect" },
            suggestions: suggestionsFor('const value = someOption.expect("msg")', "someOption", "expect", '"msg"'),
          },
        ],
        output: null,
      },
      {
        name: "Custom unsafeMethods can exclude default methods (orThrow no longer flagged)",
        code: 'const a = someOption.orThrow(); const b = someOption.expect("msg")',
        options: [{ unsafeMethods: ["expect"] }],
        errors: [
          {
            messageId: "noUnsafeGet",
            data: { method: "expect" },
            suggestions: suggestionsFor(
              'const a = someOption.orThrow(); const b = someOption.expect("msg")',
              "someOption",
              "expect",
              '"msg"',
            ),
          },
        ],
        output: null,
      },
    ],
  })
})
