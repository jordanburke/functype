import { describe } from "vitest"

import rule from "../../src/rules/no-get-unsafe"
import { typedFilename, typedRuleTester } from "../utils/typed-rule-tester"

/**
 * With type information, no-get-unsafe decides by the receiver's type instead of its name.
 * The name heuristic missed bare `.orThrow()` on an Option bound to any other name (three live
 * cases in civala: `missing.orThrow()` from `List.find`, `normalized.orThrow()`, …) and could
 * flag a native Map whose variable happened to be called `options`.
 */
// The fixture lives under tests/, which the rule skips by default (allowInTests).
const options = [{ allowInTests: false }]

const reported = (code: string, receiver: string, method: string) => ({
  code,
  filename: typedFilename,
  options,
  errors: [
    {
      messageId: "noUnsafeGet" as const,
      data: { method },
      suggestions: [
        {
          messageId: "suggestOrElse" as const,
          output: code.replace(`${receiver}.${method}()`, `${receiver}.orElse(undefined /* TODO: default */)`),
        },
        {
          messageId: "suggestFold" as const,
          output: code.replace(
            `${receiver}.${method}()`,
            `${receiver}.fold(() => undefined /* TODO: onNone */, (v) => v /* TODO: onSome */)`,
          ),
        },
      ],
    },
  ],
})

describe("no-get-unsafe (type-aware)", () => {
  typedRuleTester.run("no-get-unsafe", rule, {
    valid: [
      {
        name: "A native Map named `options` is not an Option",
        filename: typedFilename,
        options,
        code: 'const options = new globalThis.Map<string, string>(); export const v = options.get("k")',
      },
      {
        name: "orThrow on a non-functype object with that method is not reported",
        filename: typedFilename,
        options,
        code: "declare const client: { orThrow(): number }; export const v = client.orThrow()",
      },
      {
        name: "orThrow with an error is still allowed",
        filename: typedFilename,
        options,
        code: 'import { List } from "functype"; const missing = List([1, 2]).find((n) => n > 5); export const v = missing.orThrow(new Error("none"))',
      },
    ],
    invalid: [
      reported(
        'import { List } from "functype"; const missing = List([1, 2]).find((n) => n > 5); export const v = missing.orThrow()',
        "missing",
        "orThrow",
      ),
      reported(
        'import { Either } from "functype"; declare const normalized: Either<string, number>; export const v = normalized.orThrow()',
        "normalized",
        "orThrow",
      ),
      reported(
        'import { Try } from "functype"; const parsed = Try(() => JSON.parse("{}")); export const v = parsed.orThrow()',
        "parsed",
        "orThrow",
      ),
    ],
  })
})
