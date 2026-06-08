import { fileURLToPath } from "node:url"

import { afterAll, describe, expect, it } from "vitest"

import { resolveTsconfig, scoreTypeCoverage } from "../../src/scorers/type-coverage"
import { removeProject, writeProject } from "../helpers/tmp"

const ownSrc = fileURLToPath(new URL("../../src/", import.meta.url))

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

  it("computes a coverage ratio against a real project (this package's own src)", () => {
    const result = scoreTypeCoverage(ownSrc)
    expect(result.skipped).toBe(false)
    expect(result.score).toBeGreaterThan(0)
    expect(result.score).toBeLessThanOrEqual(1)
    expect(result.tsconfigPath).toMatch(/tsconfig\.json$/)
  })
})
