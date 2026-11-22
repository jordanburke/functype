import { ESLint } from "eslint"
import { describe, expect, it } from "vitest"

import configRecommended from "../../eslint-config-functype/src/configs/recommended"
import testOverrides from "../../eslint-config-functype/src/configs/test-overrides"
import plugin from "../src/index"
import ruleRegistry from "../src/rules"

type Level = "off" | "warn" | "error"
type RuleEntry = Level | readonly [Level, Readonly<Record<string, unknown>>]
type Preset = { readonly rules: Readonly<Record<string, RuleEntry>> }
const configs = plugin.configs as Readonly<Record<string, Preset>>

/** A rule's level, whether it is set alone (`"error"`) or with options (`["error", { … }]`). */
const levelOf = (entry: RuleEntry | undefined): Level | undefined => (typeof entry === "string" ? entry : entry?.[0])

/**
 * The one preset: every rule is `error` or `off`, because the code is written by coding agents, which
 * act on what fails their build and pass over a warning. These tests pin each rule's level, so a
 * change is a deliberate, reviewed one.
 */
describe("recommended preset", () => {
  const rules = configs.recommended!.rules

  it("sets every rule, and none to warn", () => {
    expect(Object.keys(rules).sort()).toEqual(
      Object.keys(ruleRegistry)
        .map((name) => `functype/${name}`)
        .sort(),
    )
    expect(Object.entries(rules).filter(([, entry]) => levelOf(entry) === "warn")).toEqual([])
  })

  it.each([
    "functype/no-let",
    "functype/no-imperative-loops",
    "functype/prefer-functype-map",
    "functype/prefer-functype-set",
    "functype/prefer-map",
    "functype/collection-naming",
    "functype/prefer-list",
    "functype/no-array-mutation",
    "functype/prefer-option",
    "functype/prefer-either",
    "functype/prefer-try",
    "functype/no-get-unsafe",
    "functype/no-floating-io",
    "functype/no-floating-result",
    "functype/no-serialize-container",
    "functype/no-uncalled-method",
    "functype/no-getOrThrow-in-render",
    "functype/must-fold-on-component-return",
  ])("%s is an error", (rule) => {
    expect(rules[rule]).toBe("error")
  })

  it("turns on prefer-fold's guard check", () => {
    expect(rules["functype/prefer-fold"]).toEqual(["error", { checkGuards: true }])
  })

  it.each(["functype/prefer-flatmap", "functype/prefer-do-notation"])(
    "turns off %s until its precision is measured",
    (rule) => {
      expect(rules[rule]).toBe("off")
    },
  )

  it("is the only preset besides the test-file override", () => {
    expect(Object.keys(configs).sort()).toEqual(["recommended", "tests"])
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
    "functype/no-floating-result",
    "functype/no-serialize-container",
  ]
  const OFF = 0
  /** A rule no config mentions comes back undefined, so "not off" alone would pass for a rule that's gone. */
  const ON = [1, 2]

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
        "keeps %s configured on",
        async (rule) => {
          expect(ON).toContain(await severity(file, rule))
        },
      )
    },
  )

  it.each(relaxed)("src/foo.ts keeps %s on", async (rule) => {
    expect(ON).toContain(await severity("src/foo.ts", rule))
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
