import { describe } from "vitest"
import { ruleTester } from "../utils/rule-tester"
import rule from "../../src/rules/prefer-functype-map"

describe("prefer-functype-map", () => {
  ruleTester.run("prefer-functype-map", rule, {
    valid: [
      // Already using functype Map
      {
        name: "functype Map.empty() is allowed",
        code: 'import { Map } from "functype"\nconst m = Map.empty()',
      },
      // functype Map.of() is allowed
      {
        name: "functype Map.of() is allowed",
        code: 'import { Map } from "functype"\nconst m = Map.of(["a", 1], ["b", 2])',
      },
      // Non-Map code is fine
      {
        name: "Non-Map code is allowed",
        code: 'const x: string = "hello"',
      },
      // functype Map type annotation is allowed
      {
        name: "functype Map type annotation is allowed",
        code: 'import { Map } from "functype"\nconst m: Map<string, number> = Map.empty()',
      },
    ],
    invalid: [
      // new Map() with no args → Map.empty()
      {
        name: "new Map() should use Map.empty()",
        code: "const m = new Map()",
        errors: [
          {
            messageId: "preferFunctypeMapLiteral",
            suggestions: [
              {
                messageId: "suggestMapEmpty",
                output: "const m = Map.empty()",
              },
              {
                messageId: "suggestAddImport",
                data: { symbol: "Map" },
                output: 'import { Map } from "functype"\nconst m = new Map()',
              },
            ],
          },
        ],
      },
      // new Map with array of tuples → Map.of(...)
      {
        name: "new Map([...]) should use Map.of(...)",
        code: 'const m = new Map([["a", 1], ["b", 2]])',
        errors: [
          {
            messageId: "preferFunctypeMapLiteral",
            suggestions: [
              {
                messageId: "suggestMapOf",
                output: 'const m = Map.of(["a", 1], ["b", 2])',
              },
              {
                messageId: "suggestAddImport",
                data: { symbol: "Map" },
                output: 'import { Map } from "functype"\nconst m = new Map([["a", 1], ["b", 2]])',
              },
            ],
          },
        ],
      },
      // new Map(entries) → Map(entries)
      {
        name: "new Map(entries) should use Map(entries)",
        code: "const m = new Map(entries)",
        errors: [
          {
            messageId: "preferFunctypeMapLiteral",
            suggestions: [
              {
                messageId: "suggestMapFrom",
                output: "const m = Map(entries)",
              },
              {
                messageId: "suggestAddImport",
                data: { symbol: "Map" },
                output: 'import { Map } from "functype"\nconst m = new Map(entries)',
              },
            ],
          },
        ],
      },
      // Map<K, V> type annotation → two errors (type + new expression)
      {
        name: "Map<K, V> type annotation and new Map() both flagged",
        code: "const m: Map<string, number> = new Map()",
        errors: [
          {
            messageId: "preferFunctypeMap",
            data: { keyType: "string", valueType: "number" },
            suggestions: [
              {
                messageId: "suggestAddImport",
                data: { symbol: "Map" },
                output: 'import { Map } from "functype"\nconst m: Map<string, number> = new Map()',
              },
            ],
          },
          {
            messageId: "preferFunctypeMapLiteral",
            suggestions: [
              {
                messageId: "suggestMapEmpty",
                output: "const m: Map<string, number> = Map.empty()",
              },
              {
                messageId: "suggestAddImport",
                data: { symbol: "Map" },
                output: 'import { Map } from "functype"\nconst m: Map<string, number> = new Map()',
              },
            ],
          },
        ],
      },
    ],
  })
})
