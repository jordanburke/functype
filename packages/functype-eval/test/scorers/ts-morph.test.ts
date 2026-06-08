import { afterAll, describe, expect, it } from "vitest"

import { scoreTsMorph } from "../../src/scorers/ts-morph"
import { removeProject, writeProject } from "../helpers/tmp"

const SRC = `export const first = (x: string | null): string => x!
export const second = (y: string | null): string => y!
export const third = (z: number): number => z
`

const dir = writeProject({ "sample.ts": SRC })

afterAll(() => removeProject(dir))

describe("scoreTsMorph", () => {
  it("counts non-null assertion expressions", () => {
    const result = scoreTsMorph(dir)
    expect(result.nonNull).toBe(2)
  })

  it("counts non-blank lines of code and files", () => {
    const result = scoreTsMorph(dir)
    expect(result.loc).toBe(3)
    expect(result.fileCount).toBe(1)
  })

  it("returns zeros for a directory with no TypeScript sources", () => {
    const emptyDir = writeProject({ "notes.md": "nothing here" })
    const result = scoreTsMorph(emptyDir)
    expect(result).toEqual({ nonNull: 0, loc: 0, fileCount: 0 })
    removeProject(emptyDir)
  })
})
