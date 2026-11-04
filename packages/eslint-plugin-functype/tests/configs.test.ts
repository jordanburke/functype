import { ESLint } from "eslint"
import { describe, expect, it } from "vitest"

import configRecommended from "../../eslint-config-functype/src/configs/recommended"
import testOverrides from "../../eslint-config-functype/src/configs/test-overrides"
import plugin from "../src/index"
import ruleRegistry from "../src/rules"

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
    "functype/collection-naming",
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
  it("errors on in-place array mutation", () => {
    expect(configs.strict!.rules["functype/no-array-mutation"]).toBe("error")
  })

  it("warns on an IO that is never run, while it is measured", () => {
    expect(configs.strict!.rules["functype/no-floating-io"]).toBe("warn")
    expect(configs.recommended!.rules["functype/no-floating-io"]).toBe("off")
  })

  it("errors on a container sent to a JSON sink, which recommended leaves off until 2.0", () => {
    expect(configs.strict!.rules["functype/no-serialize-container"]).toBe("error")
    expect(configs.recommended!.rules["functype/no-serialize-container"]).toBe("off")
    expect(configs.agent!.rules["functype/no-serialize-container"]).toBe("error")
  })

  it("errors on a dropped Either or Try, which recommended leaves off until 2.0", () => {
    expect(configs.strict!.rules["functype/no-floating-result"]).toBe("error")
    expect(configs.recommended!.rules["functype/no-floating-result"]).toBe("off")
    expect(configs.agent!.rules["functype/no-floating-result"]).toBe("error")
  })

  it.each(["functype/no-getOrThrow-in-render", "functype/must-fold-on-component-return"])(
    "warns on the React rule %s, while it is measured",
    (rule) => {
      expect(configs.strict!.rules[rule]).toBe("warn")
      expect(configs.recommended!.rules[rule]).toBe("off")
    },
  )

  it("is never looser than recommended", () => {
    const rank = { off: 0, warn: 1, error: 2 } as const
    const recommended = configs.recommended!.rules
    const strict = configs.strict!.rules
    Object.entries(recommended).forEach(([rule, level]) => {
      expect(rank[strict[rule] as keyof typeof rank]).toBeGreaterThanOrEqual(rank[level as keyof typeof rank])
    })
  })
})

/**
 * The agent preset has no warnings: an agent acts on what fails its build and passes over the rest, so
 * each rule is a decision, `error` or `off`.
 */
describe("agent preset", () => {
  const agent = configs.agent!.rules

  it("sets every rule, and none to warn", () => {
    expect(Object.keys(agent).sort()).toEqual(
      Object.keys(ruleRegistry)
        .map((name) => `functype/${name}`)
        .sort(),
    )
    expect(Object.entries(agent).filter(([, level]) => level === "warn")).toEqual([])
  })

  it("errors on everything strict errors on", () => {
    Object.entries(configs.strict!.rules)
      .filter(([, level]) => level === "error")
      .forEach(([rule]) => expect(agent[rule], rule).toBe("error"))
  })

  it.each(["functype/no-floating-io", "functype/no-getOrThrow-in-render", "functype/must-fold-on-component-return"])(
    "errors on %s, which strict still warns on",
    (rule) => {
      expect(agent[rule]).toBe("error")
    },
  )

  it.each(["functype/prefer-flatmap", "functype/prefer-do-notation"])(
    "turns off %s until its precision is measured",
    (rule) => {
      expect(agent[rule]).toBe("off")
    },
  )

  it("leaves prefer-list off, since no-array-mutation errors on its in-place-change case", () => {
    expect(agent["functype/prefer-list"]).toBe("off")
    expect(agent["functype/no-array-mutation"]).toBe("error")
  })
})

describe("the test-file configs", () => {
  const tests = plugin.configs.tests as {
    files: ReadonlyArray<string>
    plugins: unknown
    rules: Record<string, string>
  }

  /** Stands in for typescript-eslint, which this package doesn't depend on. The rules' levels are the real ones. */
  const stubRule = { create: () => ({}) }
  const typescriptRules = {
    plugins: {
      "@typescript-eslint": { rules: { "no-unnecessary-condition": stubRule, "require-await": stubRule } },
    },
    rules: {
      "@typescript-eslint/no-unnecessary-condition":
        configRecommended.rules["@typescript-eslint/no-unnecessary-condition"],
      "@typescript-eslint/require-await": configRecommended.rules["@typescript-eslint/require-await"],
    },
  }
  const typescriptFiles = { files: ["**/*.{ts,tsx,mts,cts}"] }

  /** A consumer's config: both recommended configs, then both test configs. */
  const eslint = new ESLint({
    overrideConfigFile: true,
    overrideConfig: [
      typescriptFiles,
      typescriptRules,
      plugin.configs.recommended,
      testOverrides,
      tests,
    ] as ESLint.Options["overrideConfig"],
  })

  const severity = async (file: string, rule: string): Promise<unknown> => {
    const config = (await eslint.calculateConfigForFile(file)) as { rules: Record<string, unknown> }
    return Array.isArray(config.rules[rule]) ? (config.rules[rule] as unknown[])[0] : config.rules[rule]
  }

  const relaxed = [
    "@typescript-eslint/require-await",
    "@typescript-eslint/no-unnecessary-condition",
    "functype/prefer-option",
    "functype/prefer-either",
    "functype/prefer-try",
  ]
  const OFF = 0

  it("match the same files in both packages", () => {
    expect(tests.files).toEqual(testOverrides.files)
  })

  it("register the plugin, as the other presets do", () => {
    expect(tests.plugins).toEqual({ functype: plugin })
  })

  describe.each(["test/foo.ts", "src/foo.test.ts", "src/foo.spec.ts", "src/foo.test.tsx", "src/foo.spec.mts"])(
    "%s",
    (file) => {
      it.each(relaxed)("has %s off", async (rule) => {
        expect(await severity(file, rule)).toBe(OFF)
      })

      it.each(["functype/no-let", "functype/no-imperative-loops", "functype/prefer-fold", "functype/prefer-map"])(
        "keeps %s on",
        async (rule) => {
          expect(await severity(file, rule)).not.toBe(OFF)
        },
      )
    },
  )

  it.each(relaxed)("src/foo.ts keeps %s on", async (rule) => {
    expect(await severity("src/foo.ts", rule)).not.toBe(OFF)
  })

  it("test-overrides alone, without the plugin, loads and lints a file", async () => {
    const alone = new ESLint({
      overrideConfigFile: true,
      overrideConfig: [{ plugins: typescriptRules.plugins }, testOverrides] as ESLint.Options["overrideConfig"],
    })
    const [result] = await alone.lintText("export const answer = 42\n", { filePath: "test/foo.js" })
    expect(result?.fatalErrorCount).toBe(0)
    expect(result?.errorCount).toBe(0)
  })
})
