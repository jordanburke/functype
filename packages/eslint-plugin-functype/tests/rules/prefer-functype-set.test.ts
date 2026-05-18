import { describe } from "vitest"
import { ruleTester } from "../utils/rule-tester"
import rule from "../../src/rules/prefer-functype-set"

describe("prefer-functype-set", () => {
  ruleTester.run("prefer-functype-set", rule, {
    valid: [
      {
        name: "functype Set is fine",
        code: 'import { Set } from "functype"\nconst s = Set.empty()',
      },
      {
        name: "non-Set code is fine",
        code: 'const x: string = "hello"',
      },
    ],
    invalid: [
      {
        name: "new Set() should use Set.empty()",
        code: "const s = new Set()",
        errors: [
          {
            messageId: "preferFunctypeSetLiteral",
            suggestions: [
              {
                messageId: "suggestSetEmpty",
                output: "const s = Set.empty()",
              },
              {
                messageId: "suggestAddImport",
                data: { symbol: "Set" },
                output: 'import { Set } from "functype"\nconst s = new Set()',
              },
            ],
          },
        ],
        output: null,
      },
      {
        name: "new Set([...]) should use Set.of(...) with unwrapped elements",
        code: 'const s = new Set(["a", "b", "c"])',
        errors: [
          {
            messageId: "preferFunctypeSetLiteral",
            suggestions: [
              {
                messageId: "suggestSetOf",
                output: 'const s = Set.of("a", "b", "c")',
              },
              {
                messageId: "suggestAddImport",
                data: { symbol: "Set" },
                output: 'import { Set } from "functype"\nconst s = new Set(["a", "b", "c"])',
              },
            ],
          },
        ],
        output: null,
      },
      {
        name: "new Set(variable) should use Set(variable)",
        code: "const s = new Set(items)",
        errors: [
          {
            messageId: "preferFunctypeSetLiteral",
            suggestions: [
              {
                messageId: "suggestSetFrom",
                output: "const s = Set(items)",
              },
              {
                messageId: "suggestAddImport",
                data: { symbol: "Set" },
                output: 'import { Set } from "functype"\nconst s = new Set(items)',
              },
            ],
          },
        ],
        output: null,
      },
      {
        name: "Set<string> type annotation with new Set() should report two errors",
        code: "const s: Set<string> = new Set()",
        errors: [
          {
            messageId: "preferFunctypeSet",
            data: { type: "string" },
            suggestions: [
              {
                messageId: "suggestAddImport",
                data: { symbol: "Set" },
                output: 'import { Set } from "functype"\nconst s: Set<string> = new Set()',
              },
            ],
          },
          {
            messageId: "preferFunctypeSetLiteral",
            suggestions: [
              {
                messageId: "suggestSetEmpty",
                output: "const s: Set<string> = Set.empty()",
              },
              {
                messageId: "suggestAddImport",
                data: { symbol: "Set" },
                output: 'import { Set } from "functype"\nconst s: Set<string> = new Set()',
              },
            ],
          },
        ],
        output: null,
      },
    ],
  })
})
