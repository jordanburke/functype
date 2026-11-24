import { describe, expect, it } from "vitest"

import {
  type Baseline,
  BASELINE_SCHEMA,
  buildBaseline,
  compareBaseline,
  DEFAULT_TRACKED_RULES,
  parseBaseline,
  relativeTarget,
  resolveTrackedRules,
  serializeBaseline,
  toPosixPath,
} from "../../src/baseline/index"

const LET = "functype/no-let"
const LOOPS = "functype/no-imperative-loops"

const baselineOf = (files: Baseline["files"], trackedRules: ReadonlyArray<string> = [LET, LOOPS]): Baseline =>
  buildBaseline("src", trackedRules, files)

describe("resolveTrackedRules", () => {
  it("defaults to the eight rules from the issue, prefixed and sorted", () => {
    const rules = resolveTrackedRules()
    expect(rules).toHaveLength(8)
    expect(rules).toEqual(DEFAULT_TRACKED_RULES.map((r) => `functype/${r}`).sort())
    expect(rules).not.toContain("functype/prefer-option")
  })

  it("accepts names with or without the functype/ prefix and drops duplicates", () => {
    expect(resolveTrackedRules(["functype/no-let", "no-let", "prefer-option"])).toEqual([
      "functype/no-let",
      "functype/prefer-option",
    ])
  })

  it("rejects a rule the plugin doesn't have", () => {
    expect(() => resolveTrackedRules(["no-such-rule"])).toThrow(/unknown rule.*no-such-rule/)
  })

  it("rejects a type-aware-only rule, which would always count 0 here", () => {
    expect(() => resolveTrackedRules(["no-uncalled-method"])).toThrow(/need type information/)
  })
})

describe("path normalisation", () => {
  it("turns Windows separators into POSIX ones", () => {
    expect(toPosixPath("src\\cli\\index.ts", "\\")).toBe("src/cli/index.ts")
  })

  it("leaves POSIX paths alone", () => {
    expect(toPosixPath("src/cli/index.ts", "/")).toBe("src/cli/index.ts")
  })

  it("reports the target relative to the root, '.' for the root itself", () => {
    expect(relativeTarget("/repo", "/repo/packages/app/src")).toBe("packages/app/src")
    expect(relativeTarget("/repo", "/repo")).toBe(".")
  })
})

describe("serializeBaseline", () => {
  it("is identical whatever order the input arrives in", () => {
    const a = buildBaseline("src", [LOOPS, LET], { "src/b.ts": { [LOOPS]: 1, [LET]: 2 }, "src/a.ts": { [LET]: 1 } })
    const b = buildBaseline("src", [LET, LOOPS], { "src/a.ts": { [LET]: 1 }, "src/b.ts": { [LET]: 2, [LOOPS]: 1 } })
    expect(serializeBaseline(a)).toBe(serializeBaseline(b))
    expect(Object.keys(a.files)).toEqual(["src/a.ts", "src/b.ts"])
    expect(Object.keys(a.files["src/b.ts"] ?? {})).toEqual([LOOPS, LET])
  })

  it("sorts by code unit, not locale (uppercase before lowercase)", () => {
    const b = buildBaseline("src", [LET], { "src/b.ts": { [LET]: 1 }, "src/B.ts": { [LET]: 1 } })
    expect(Object.keys(b.files)).toEqual(["src/B.ts", "src/b.ts"])
  })

  it("drops zero counts and files left empty", () => {
    const b = buildBaseline("src", [LET], { "src/a.ts": { [LET]: 0 }, "src/b.ts": { [LET]: 1 } })
    expect(Object.keys(b.files)).toEqual(["src/b.ts"])
  })

  it("round-trips through parseBaseline", () => {
    const b = baselineOf({ "src/a.ts": { [LET]: 3 } })
    expect(parseBaseline(serializeBaseline(b))).toEqual(b)
  })
})

describe("parseBaseline", () => {
  it("refuses a schema it doesn't know", () => {
    const text = JSON.stringify({ schema: BASELINE_SCHEMA + 1, target: "src", trackedRules: [], files: {} })
    expect(() => parseBaseline(text)).toThrow(/schema 2/)
  })

  it("refuses malformed counts", () => {
    const text = JSON.stringify({ schema: BASELINE_SCHEMA, target: "src", trackedRules: [], files: { a: { r: -1 } } })
    expect(() => parseBaseline(text)).toThrow(/files/)
  })
})

describe("compareBaseline", () => {
  const baseline = baselineOf({ "src/a.ts": { [LET]: 2, [LOOPS]: 1 }, "src/b.ts": { [LET]: 1 } })

  it("passes when counts stay level", () => {
    const result = compareBaseline(baseline, baseline.files, [LET, LOOPS])
    expect(result.regressions).toEqual([])
    expect(result.findingsDown).toBe(0)
    expect(result.findings).toBe(4)
  })

  it("reports a rise with the file, rule, and old → new", () => {
    const result = compareBaseline(baseline, { ...baseline.files, "src/b.ts": { [LET]: 2 } }, [LET, LOOPS])
    expect(result.regressions).toEqual([{ path: "src/b.ts", rule: LET, before: 1, after: 2, newFile: false }])
  })

  it("reports a file missing from the baseline that has findings", () => {
    const result = compareBaseline(baseline, { ...baseline.files, "src/c.ts": { [LOOPS]: 1 } }, [LET, LOOPS])
    expect(result.regressions).toEqual([{ path: "src/c.ts", rule: LOOPS, before: 0, after: 1, newFile: true }])
  })

  it("counts reductions, including a file that is now clean", () => {
    const result = compareBaseline(baseline, { "src/a.ts": { [LET]: 1, [LOOPS]: 1 } }, [LET, LOOPS])
    expect(result.regressions).toEqual([])
    expect(result.findingsDown).toBe(2)
    expect(result.filesDown).toBe(2)
  })

  it("does not let a drop in one rule hide a rise in another in the same file", () => {
    const result = compareBaseline(baseline, { ...baseline.files, "src/a.ts": { [LET]: 0, [LOOPS]: 2 } }, [LET, LOOPS])
    expect(result.regressions).toEqual([{ path: "src/a.ts", rule: LOOPS, before: 1, after: 2, newFile: false }])
  })

  it("ignores a rule the baseline has but that is no longer tracked", () => {
    const result = compareBaseline(baseline, { "src/a.ts": { [LET]: 2 }, "src/b.ts": { [LET]: 1 } }, [LET])
    expect(result.regressions).toEqual([])
    expect(result.ignoredRules).toEqual([LOOPS])
    expect(result.findingsDown).toBe(0)
  })

  it("compares a newly tracked rule against 0", () => {
    const fold = "functype/prefer-fold"
    const result = compareBaseline(baseline, { ...baseline.files, "src/a.ts": { [LET]: 2, [LOOPS]: 1, [fold]: 1 } }, [
      LET,
      LOOPS,
      fold,
    ])
    expect(result.newRules).toEqual([fold])
    expect(result.regressions).toEqual([{ path: "src/a.ts", rule: fold, before: 0, after: 1, newFile: false }])
  })
})
