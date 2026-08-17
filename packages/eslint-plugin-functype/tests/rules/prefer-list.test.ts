import { describe } from "vitest"
import { ruleTester } from "../utils/rule-tester"
import rule from "../../src/rules/prefer-list"

describe("prefer-list", () => {
  ruleTester.run("prefer-list", rule, {
    valid: [
      // Already using List
      {
        name: "List type is allowed",
        code: 'const items: List<string> = List.of("a", "b", "c")',
      },
      // Non-array types
      {
        name: "Non-array types are allowed",
        code: 'const value: string = "test"',
      },
      // Object types
      {
        name: "Object types are allowed",
        code: 'const user: { name: string } = { name: "test" }',
      },
      // Default allowReadonlyArrays: true — ReadonlyArray<T> is silent
      {
        name: "ReadonlyArray<T> is allowed under default allowReadonlyArrays: true",
        code: "const items: ReadonlyArray<string> = []",
      },
      // Default allowReadonlyArrays: true — readonly T[] is silent (parity with ReadonlyArray<T>)
      {
        name: "readonly T[] is allowed under default allowReadonlyArrays: true",
        code: "const items: readonly string[] = []",
      },
      // Wire<T> is silent for free — it's not "Array" or "ReadonlyArray", so the syntactic
      // rule ignores it. This is the mechanism that makes the boundary marker work.
      {
        name: "Wire<T> is allowed (syntactic rule ignores unknown type names)",
        code: "const rows: Wire<Row> = []",
      },
      // Any custom alias to ReadonlyArray also passes — same syntactic reason
      {
        name: "Custom aliases pass for the same reason",
        code: "const docs: ClaimedDoc = []",
      },
      // allowArrayLiterals: true — literals are silent
      {
        name: "Array literals are allowed under allowArrayLiterals: true",
        code: 'const items = ["a", "b", "c"]',
        options: [{ allowArrayLiterals: true }],
      },
      // Combination: strict readonly + literals allowed
      {
        name: "allowArrayLiterals: true silences literals but not types",
        code: "const rows: Wire<Row> = []; const other = [1, 2, 3]",
        options: [{ allowArrayLiterals: true }],
      },
    ],
    invalid: [
      // Array type syntax
      {
        name: "Array type should use List",
        code: 'const items: string[] = ["a", "b", "c"]',
        errors: [
          {
            messageId: "preferList",
            data: { type: "string", arrayType: "string[]" },
            suggestions: [
              {
                messageId: "suggestListType",
                data: { type: "string" },
                output: 'const items: List<string> = ["a", "b", "c"]',
              },
              {
                messageId: "suggestAddImport",
                data: { symbol: "List" },
                output: 'import { List } from "functype"\nconst items: string[] = ["a", "b", "c"]',
              },
            ],
          },
        ],
      },
      // Array<T> syntax
      {
        name: "Array<T> type should use List",
        code: 'const items: Array<string> = ["a", "b", "c"]',
        errors: [
          {
            messageId: "preferList",
            data: { type: "string", arrayType: "Array<string>" },
            suggestions: [
              {
                messageId: "suggestListType",
                data: { type: "string" },
                output: 'const items: List<string> = ["a", "b", "c"]',
              },
              {
                messageId: "suggestAddImport",
                data: { symbol: "List" },
                output: 'import { List } from "functype"\nconst items: Array<string> = ["a", "b", "c"]',
              },
            ],
          },
        ],
      },
      // ReadonlyArray<T> is invalid under explicit allowReadonlyArrays: false
      {
        name: "ReadonlyArray<T> is flagged when allowReadonlyArrays: false",
        code: 'const items: ReadonlyArray<string> = ["a", "b", "c"]',
        options: [{ allowReadonlyArrays: false }],
        errors: [
          {
            messageId: "preferList",
            data: { type: "string", arrayType: "ReadonlyArray<string>" },
            suggestions: [
              {
                messageId: "suggestListType",
                data: { type: "string" },
                output: 'const items: List<string> = ["a", "b", "c"]',
              },
              {
                messageId: "suggestAddImport",
                data: { symbol: "List" },
                output: 'import { List } from "functype"\nconst items: ReadonlyArray<string> = ["a", "b", "c"]',
              },
            ],
          },
        ],
      },
      // readonly T[] parity — same enforcement as ReadonlyArray<T> when the option flips.
      // The suggestion replaces the whole `readonly T[]` (not just the inner TSArrayType),
      // because `readonly List<T>` is invalid TypeScript (TS1354).
      {
        name: "readonly T[] is flagged when allowReadonlyArrays: false (parity check)",
        code: 'const items: readonly string[] = ["a", "b", "c"]',
        options: [{ allowReadonlyArrays: false }],
        errors: [
          {
            messageId: "preferList",
            data: { type: "string", arrayType: "readonly string[]" },
            suggestions: [
              {
                messageId: "suggestListType",
                data: { type: "string" },
                output: 'const items: List<string> = ["a", "b", "c"]',
              },
              {
                messageId: "suggestAddImport",
                data: { symbol: "List" },
                output: 'import { List } from "functype"\nconst items: readonly string[] = ["a", "b", "c"]',
              },
            ],
          },
        ],
      },
      // allowArrayLiterals: true silences literals but leaves type-position enforcement intact.
      // This is the "not types" half of the paired valid case above.
      {
        name: "allowArrayLiterals: true does not silence type positions",
        code: "function f(xs: string[]) {}",
        options: [{ allowArrayLiterals: true }],
        errors: [
          {
            messageId: "preferList",
            data: { type: "string", arrayType: "string[]" },
            suggestions: [
              {
                messageId: "suggestListType",
                data: { type: "string" },
                output: "function f(xs: List<string>) {}",
              },
              {
                messageId: "suggestAddImport",
                data: { symbol: "List" },
                output: 'import { List } from "functype"\nfunction f(xs: string[]) {}',
              },
            ],
          },
        ],
      },
      // Array literal (default: allowArrayLiterals is false, so still flagged)
      {
        name: "Array literal should use List.from",
        code: 'const items = ["a", "b", "c"]',
        errors: [
          {
            messageId: "preferListLiteral",
            suggestions: [
              {
                messageId: "suggestListOf",
                output: 'const items = List.of("a", "b", "c")',
              },
              {
                messageId: "suggestAddImport",
                data: { symbol: "List" },
                output: 'import { List } from "functype"\nconst items = ["a", "b", "c"]',
              },
            ],
          },
        ],
      },
      // Complex type array
      {
        name: "Complex type array should use List",
        code: "const users: { name: string; age: number }[] = []",
        errors: [
          {
            messageId: "preferList",
            data: {
              type: "{ name: string; age: number }",
              arrayType: "{ name: string; age: number }[]",
            },
            suggestions: [
              {
                messageId: "suggestListType",
                data: { type: "{ name: string; age: number }" },
                output: "const users: List<{ name: string; age: number }> = []",
              },
              {
                messageId: "suggestAddImport",
                data: { symbol: "List" },
                output: 'import { List } from "functype"\nconst users: { name: string; age: number }[] = []',
              },
            ],
          },
        ],
      },
      // Function parameter
      {
        name: "Function parameter array should use List",
        code: "function processItems(items: string[]): void {}",
        errors: [
          {
            messageId: "preferList",
            data: { type: "string", arrayType: "string[]" },
            suggestions: [
              {
                messageId: "suggestListType",
                data: { type: "string" },
                output: "function processItems(items: List<string>): void {}",
              },
              {
                messageId: "suggestAddImport",
                data: { symbol: "List" },
                output: 'import { List } from "functype"\nfunction processItems(items: string[]): void {}',
              },
            ],
          },
        ],
      },
      // Function return type
      {
        name: "Function return array should use List",
        code: "function getItems(): string[] { return [] }",
        errors: [
          {
            messageId: "preferList",
            data: { type: "string", arrayType: "string[]" },
            suggestions: [
              {
                messageId: "suggestListType",
                data: { type: "string" },
                output: "function getItems(): List<string> { return [] }",
              },
              {
                messageId: "suggestAddImport",
                data: { symbol: "List" },
                output: 'import { List } from "functype"\nfunction getItems(): string[] { return [] }',
              },
            ],
          },
        ],
      },
      // Nested array literal in assignment
      {
        name: "Nested array literals should use List.from",
        code: "const matrix = [[1, 2], [3, 4]]",
        errors: [
          {
            messageId: "preferListLiteral",
            suggestions: [
              {
                messageId: "suggestListOf",
                output: "const matrix = List.of([1, 2], [3, 4])",
              },
              {
                messageId: "suggestAddImport",
                data: { symbol: "List" },
                output: 'import { List } from "functype"\nconst matrix = [[1, 2], [3, 4]]',
              },
            ],
          },
        ],
      },
      // Array with spread elements — no suggestions (ambiguous semantics)
      {
        name: "Array literal with spread should warn but have no suggestions",
        code: "const items = [...other, 1, 2]",
        errors: [
          {
            messageId: "preferListLiteral",
            suggestions: [],
          },
        ],
      },
      // Mutable T[] is always flagged regardless of allowReadonlyArrays
      {
        name: "Mutable T[] is flagged even with allowReadonlyArrays: true",
        code: "function f(xs: string[]) {}",
        options: [{ allowReadonlyArrays: true }],
        errors: [
          {
            messageId: "preferList",
            data: { type: "string", arrayType: "string[]" },
            suggestions: [
              {
                messageId: "suggestListType",
                data: { type: "string" },
                output: "function f(xs: List<string>) {}",
              },
              {
                messageId: "suggestAddImport",
                data: { symbol: "List" },
                output: 'import { List } from "functype"\nfunction f(xs: string[]) {}',
              },
            ],
          },
        ],
      },
      // The recommended boundary recipe: allowReadonlyArrays: false + Wire<T> at boundaries.
      // The boundary declaration is silent; the pipeline signature fires.
      {
        name: "Boundary recipe: Wire<T> passes, direct ReadonlyArray<T> in pipeline fires",
        code: "type ClaimedDoc = Wire<Row>; function process(docs: ReadonlyArray<Row>) {}",
        options: [{ allowReadonlyArrays: false }],
        errors: [
          {
            messageId: "preferList",
            data: { type: "Row", arrayType: "ReadonlyArray<Row>" },
            suggestions: [
              {
                messageId: "suggestListType",
                data: { type: "Row" },
                output: "type ClaimedDoc = Wire<Row>; function process(docs: List<Row>) {}",
              },
              {
                messageId: "suggestAddImport",
                data: { symbol: "List" },
                output:
                  'import { List } from "functype"\ntype ClaimedDoc = Wire<Row>; function process(docs: ReadonlyArray<Row>) {}',
              },
            ],
          },
        ],
      },
    ],
  })
})
