import { readFileSync, rmSync, writeFileSync } from "node:fs"
import { join } from "node:path"

import { afterEach, describe, expect, it, vi } from "vitest"

import { BASELINE_FILE } from "../../src/baseline/index"
import { runBaseline, runCheck } from "../../src/cli/baseline"
import { removeProject, writeProject } from "../helpers/tmp"

// A `let` accumulator, a `for` loop and its counter: no-let ×2, no-imperative-loops ×1.
const IMPERATIVE = `export function total(items: ReadonlyArray<number>): number {
  let sum = 0
  for (let i = 0; i < items.length; i++) {
    sum += items[i] ?? 0
  }
  return sum
}
`
const ONE_LET = `export function one(): number {
  let x = 1
  x += 1
  return x
}
`
const CLEAN = "export const add = (a: number, b: number): number => a + b\n"

type Output = { readonly out: () => string; readonly err: () => string }

const capture = (): Output => {
  const log = vi.spyOn(console, "log").mockImplementation(() => undefined)
  const error = vi.spyOn(console, "error").mockImplementation(() => undefined)
  const text = (spy: typeof log): string => spy.mock.calls.map((call) => call.join(" ")).join("\n")
  return { out: () => text(log), err: () => text(error) }
}

const readBaseline = (dir: string): string => readFileSync(join(dir, BASELINE_FILE), "utf8")

const parsed = (
  dir: string,
): { target: string; trackedRules: string[]; files: Record<string, Record<string, number>> } =>
  JSON.parse(readBaseline(dir)) as {
    target: string
    trackedRules: string[]
    files: Record<string, Record<string, number>>
  }

describe("functype-eval baseline", () => {
  afterEach(() => vi.restoreAllMocks())

  it("writes per-file, per-rule counts with repo-relative POSIX paths", async () => {
    const dir = writeProject({ "src/a.ts": IMPERATIVE, "src/nested/b.ts": ONE_LET, "src/clean.ts": CLEAN })
    capture()

    expect(await runBaseline(["src"], dir)).toBe(0)
    const baseline = parsed(dir)
    expect(baseline.target).toBe("src")
    expect(baseline.files).toEqual({
      "src/a.ts": { "functype/no-imperative-loops": 1, "functype/no-let": 2 },
      "src/nested/b.ts": { "functype/no-let": 1 },
    })
    Object.keys(baseline.files).forEach((path) => {
      expect(path.startsWith("/")).toBe(false)
      expect(path.startsWith("..")).toBe(false)
      expect(path).not.toContain("\\")
    })
    removeProject(dir)
  })

  it("is byte-identical across runs and absolute or relative targets", async () => {
    const dir = writeProject({ "src/a.ts": IMPERATIVE, "src/b.ts": ONE_LET })
    capture()

    await runBaseline(["src"], dir)
    const first = readBaseline(dir)
    await runBaseline([join(dir, "src")], dir)
    expect(readBaseline(dir)).toBe(first)
    expect(first).not.toContain(dir)
    expect(first.endsWith("}\n")).toBe(true)
    removeProject(dir)
  })

  it("counts each file once and skips test files, like score", async () => {
    const dir = writeProject({ "src/a.ts": ONE_LET, "src/a.test.ts": IMPERATIVE, "src/a.spec.ts": IMPERATIVE })
    capture()

    await runBaseline(["src"], dir)
    expect(parsed(dir).files).toEqual({ "src/a.ts": { "functype/no-let": 1 } })
    removeProject(dir)
  })

  it("exits 2 and writes nothing for an unknown rule in the config", async () => {
    const dir = writeProject({
      "src/a.ts": ONE_LET,
      "functype-eval.config.json": JSON.stringify({ trackedRules: ["no-such-rule"] }),
    })
    const output = capture()

    expect(await runBaseline(["src"], dir)).toBe(2)
    expect(output.err()).toContain("unknown rule(s) in trackedRules: no-such-rule")
    expect(() => readBaseline(dir)).toThrow()
    removeProject(dir)
  })

  it("exits 2 for malformed config JSON", async () => {
    const dir = writeProject({ "src/a.ts": ONE_LET, "functype-eval.config.json": "{ not json" })
    const output = capture()

    expect(await runBaseline(["src"], dir)).toBe(2)
    expect(output.err()).toContain("functype-eval.config.json")
    removeProject(dir)
  })

  it("exits 2 and writes nothing when there are no TypeScript sources", async () => {
    const dir = writeProject({ "src/readme.md": "no ts" })
    const output = capture()

    expect(await runBaseline(["src"], dir)).toBe(2)
    expect(output.err()).toContain("no TypeScript sources found")
    expect(() => readBaseline(dir)).toThrow()
    removeProject(dir)
  })

  it("tracks the rules in functype-eval.config.json, with or without the prefix", async () => {
    const dir = writeProject({
      "src/a.ts": IMPERATIVE,
      "functype-eval.config.json": JSON.stringify({ trackedRules: ["functype/no-imperative-loops"] }),
    })
    capture()

    await runBaseline(["src"], dir)
    const baseline = parsed(dir)
    expect(baseline.trackedRules).toEqual(["functype/no-imperative-loops"])
    expect(baseline.files).toEqual({ "src/a.ts": { "functype/no-imperative-loops": 1 } })
    removeProject(dir)
  })
})

describe("functype-eval check", () => {
  afterEach(() => vi.restoreAllMocks())

  it("passes when nothing changed", async () => {
    const dir = writeProject({ "src/a.ts": IMPERATIVE })
    const output = capture()
    await runBaseline(["src"], dir)

    expect(await runCheck(["src"], dir)).toBe(0)
    expect(output.out()).toContain("no regressions")
    removeProject(dir)
  })

  it("fails on a rise, naming file, rule and old → new", async () => {
    const dir = writeProject({ "src/a.ts": ONE_LET })
    const output = capture()
    await runBaseline(["src"], dir)
    writeFileSync(join(dir, "src/a.ts"), IMPERATIVE)

    expect(await runCheck(["src"], dir)).toBe(1)
    expect(output.err()).toMatch(/src\/a\.ts\s+no-let\s+1 → 2/)
    expect(output.err()).toMatch(/src\/a\.ts\s+no-imperative-loops\s+0 → 1/)
    removeProject(dir)
  })

  it("fails on a new file with findings", async () => {
    const dir = writeProject({ "src/a.ts": ONE_LET })
    const output = capture()
    await runBaseline(["src"], dir)
    writeFileSync(join(dir, "src/new.ts"), ONE_LET)

    expect(await runCheck(["src"], dir)).toBe(1)
    expect(output.err()).toMatch(/src\/new\.ts\s+no-let\s+0 → 1 {2}\(not in baseline\)/)
    removeProject(dir)
  })

  it("passes a new clean file", async () => {
    const dir = writeProject({ "src/a.ts": ONE_LET })
    capture()
    await runBaseline(["src"], dir)
    writeFileSync(join(dir, "src/new.ts"), CLEAN)

    expect(await runCheck(["src"], dir)).toBe(0)
    removeProject(dir)
  })

  it("reports a reduction but leaves the baseline alone without --update", async () => {
    const dir = writeProject({ "src/a.ts": IMPERATIVE, "src/b.ts": ONE_LET })
    const output = capture()
    await runBaseline(["src"], dir)
    const before = readBaseline(dir)
    writeFileSync(join(dir, "src/b.ts"), CLEAN)

    expect(await runCheck(["src"], dir)).toBe(0)
    expect(output.out()).toContain("1 finding down across 1 file")
    expect(readBaseline(dir)).toBe(before)
    removeProject(dir)
  })

  it("--update accepts a reduction", async () => {
    const dir = writeProject({ "src/a.ts": IMPERATIVE, "src/b.ts": ONE_LET })
    const output = capture()
    await runBaseline(["src"], dir)
    writeFileSync(join(dir, "src/b.ts"), CLEAN)

    expect(await runCheck(["src", "--update"], dir)).toBe(0)
    expect(output.out()).toContain(`Updated ${BASELINE_FILE}`)
    expect(Object.keys(parsed(dir).files)).toEqual(["src/a.ts"])
    removeProject(dir)
  })

  it("--update refuses a regression and leaves the file untouched", async () => {
    const dir = writeProject({ "src/a.ts": IMPERATIVE, "src/b.ts": ONE_LET })
    const output = capture()
    await runBaseline(["src"], dir)
    const before = readBaseline(dir)
    // One file improves, another regresses: the improvement must not let --update through.
    writeFileSync(join(dir, "src/a.ts"), CLEAN)
    writeFileSync(join(dir, "src/b.ts"), IMPERATIVE)

    expect(await runCheck(["src", "--update"], dir)).toBe(1)
    expect(output.err()).toContain("Refusing to update")
    expect(readBaseline(dir)).toBe(before)
    removeProject(dir)
  })

  it("exits 2 when there is no baseline, and --update doesn't create one", async () => {
    const dir = writeProject({ "src/a.ts": ONE_LET })
    const output = capture()

    expect(await runCheck(["src", "--update"], dir)).toBe(2)
    expect(output.err()).toContain(`no ${BASELINE_FILE}`)
    expect(() => readBaseline(dir)).toThrow()
    removeProject(dir)
  })

  it("exits 2 for a different target, so a narrower check can't wipe the baseline", async () => {
    const dir = writeProject({ "src/a.ts": ONE_LET, "src/sub/b.ts": CLEAN })
    const output = capture()
    await runBaseline(["src"], dir)
    const before = readBaseline(dir)

    expect(await runCheck(["src/sub", "--update"], dir)).toBe(2)
    expect(output.err()).toContain("was written for src, not src/sub")
    expect(readBaseline(dir)).toBe(before)
    removeProject(dir)
  })

  it("exits 2 when the target has no sources, without touching the baseline", async () => {
    const dir = writeProject({ "src/a.ts": ONE_LET })
    capture()
    await runBaseline(["src"], dir)
    const before = readBaseline(dir)
    rmSync(join(dir, "src/a.ts"))

    expect(await runCheck(["src", "--update"], dir)).toBe(2)
    expect(readBaseline(dir)).toBe(before)
    removeProject(dir)
  })

  it("exits 2 when a file can't be parsed, rather than reading it as clean", async () => {
    const dir = writeProject({ "src/a.ts": ONE_LET })
    const output = capture()
    await runBaseline(["src"], dir)
    writeFileSync(join(dir, "src/a.ts"), "export const = = ;\n")

    expect(await runCheck(["src", "--update"], dir)).toBe(2)
    expect(output.err()).toContain("couldn't parse src/a.ts")
    removeProject(dir)
  })

  it("ignores rules no longer tracked and drops them on --update", async () => {
    const dir = writeProject({ "src/a.ts": IMPERATIVE })
    const output = capture()
    await runBaseline(["src"], dir)
    writeFileSync(join(dir, "functype-eval.config.json"), JSON.stringify({ trackedRules: ["no-let"] }))

    expect(await runCheck(["src", "--update"], dir)).toBe(0)
    expect(output.err()).toContain("ignoring rules no longer tracked: no-imperative-loops")
    expect(parsed(dir).trackedRules).toEqual(["functype/no-let"])
    expect(parsed(dir).files).toEqual({ "src/a.ts": { "functype/no-let": 2 } })
    removeProject(dir)
  })

  it("compares a newly tracked rule against 0 and says how to start tracking it", async () => {
    const dir = writeProject({
      "src/a.ts": IMPERATIVE,
      "functype-eval.config.json": JSON.stringify({ trackedRules: ["no-let"] }),
    })
    const output = capture()
    await runBaseline(["src"], dir)
    writeFileSync(
      join(dir, "functype-eval.config.json"),
      JSON.stringify({ trackedRules: ["no-let", "no-imperative-loops"] }),
    )

    expect(await runCheck(["src"], dir)).toBe(1)
    expect(output.err()).toContain("no-imperative-loops not in the baseline")
    expect(output.err()).toMatch(/src\/a\.ts\s+no-imperative-loops\s+0 → 1/)
    removeProject(dir)
  })
})
