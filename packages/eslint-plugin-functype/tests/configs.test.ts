import { describe, expect, it } from "vitest"

import plugin from "../src/index"

type Preset = { readonly rules: Readonly<Record<string, string>> }
const configs = plugin.configs as Readonly<Record<string, Preset>>

/**
 * Severity policy (#325): a rule is `error` in `recommended` once it is right on ~95–99% of real code
 * and its known false-positive classes are closed; it stays `warn` only while those classes are open.
 * These tests pin which rules have graduated, so a demotion is a deliberate, reviewed change.
 */
describe("recommended preset", () => {
  const rules = configs.recommended!.rules

  it.each([
    "functype/no-let",
    "functype/no-imperative-loops",
    "functype/prefer-functype-map",
    "functype/prefer-functype-set",
    "functype/prefer-map",
    "functype/prefer-fold",
  ])("%s is an error", (rule) => {
    expect(rules[rule]).toBe("error")
  })

  it.each([
    "functype/prefer-option",
    "functype/prefer-either",
    "functype/prefer-try",
    "functype/prefer-flatmap",
    "functype/prefer-do-notation",
  ])("%s stays a warning until its boundary cases are closed", (rule) => {
    expect(rules[rule]).toBe("warn")
  })
})

describe("strict preset", () => {
  it("is never looser than recommended", () => {
    const rank = { off: 0, warn: 1, error: 2 } as const
    const recommended = configs.recommended!.rules
    const strict = configs.strict!.rules
    Object.entries(recommended).forEach(([rule, level]) => {
      expect(rank[strict[rule] as keyof typeof rank]).toBeGreaterThanOrEqual(rank[level as keyof typeof rank])
    })
  })
})
