import { afterAll, describe, expect, it } from "vitest"

import { resolveTsconfig, scoreTypeCoverage } from "../../src/scorers/type-coverage"
import { removeProject, writeProject } from "../helpers/tmp"

describe("resolveTsconfig", () => {
  const root = writeProject({ "tsconfig.json": "{}", "nested/deep/file.ts": "export const x = 1\n" })
  afterAll(() => removeProject(root))

  it("uses an explicit path when it exists", () => {
    expect(resolveTsconfig(root, `${root}/tsconfig.json`)).toBe(`${root}/tsconfig.json`)
  })

  it("returns undefined for an explicit path that does not exist", () => {
    expect(resolveTsconfig(root, `${root}/nope.json`)).toBeUndefined()
  })

  it("walks up from a nested target to the nearest tsconfig", () => {
    expect(resolveTsconfig(`${root}/nested/deep`)).toBe(`${root}/tsconfig.json`)
  })
})

describe("scoreTypeCoverage", () => {
  it("skips when no tsconfig can be resolved", () => {
    const dir = writeProject({ "loose.ts": "export const x = 1\n" })
    // A temp dir under the OS tmp root has no tsconfig ancestor.
    const result = scoreTypeCoverage(`${dir}/__no_tsconfig_here__`)
    expect(result.skipped).toBe(true)
    removeProject(dir)
  })

  it("computes a coverage ratio against a self-contained typed project", () => {
    // A standalone tsconfig (no `extends`, no external deps) keeps this deterministic across
    // environments — exercises resolve → parse → lintSync without depending on ts-builds resolution.
    const dir = writeProject({
      "tsconfig.json": JSON.stringify({
        compilerOptions: {
          strict: true,
          skipLibCheck: true,
          module: "esnext",
          moduleResolution: "bundler",
          target: "es2020",
        },
        files: ["index.ts"],
      }),
      "index.ts": [
        'export const greet = (name: string): string => "hi " + name',
        "export const answer: number = 42",
        "export const sum = (a: number, b: number): number => a + b",
        "",
      ].join("\n"),
    })
    const result = scoreTypeCoverage(dir)
    expect(result.skipped).toBe(false)
    expect(result.score).toBeGreaterThan(0)
    expect(result.score).toBeLessThanOrEqual(1)
    expect(result.tsconfigPath).toMatch(/tsconfig\.json$/)
    removeProject(dir)
  })
})
