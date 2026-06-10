import { afterEach, describe, expect, it, vi } from "vitest"

import { runScore } from "../../src/cli/score"
import { removeProject, writeProject } from "../helpers/tmp"

describe("runScore", () => {
  afterEach(() => vi.restoreAllMocks())

  it("exits 2 and reports when no TypeScript sources are found", async () => {
    const dir = writeProject({ "readme.md": "no ts here" })
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => undefined)
    vi.spyOn(console, "log").mockImplementation(() => undefined)

    const code = await runScore([dir])

    expect(code).toBe(2)
    expect(errSpy).toHaveBeenCalledWith(expect.stringContaining("no TypeScript sources found"))
    removeProject(dir)
  })

  it("scores a real directory (exit 0) and gates on --threshold (exit 1)", async () => {
    const dir = writeProject({ "good.ts": "export const add = (a: number, b: number): number => a + b\n" })
    vi.spyOn(console, "log").mockImplementation(() => undefined)
    vi.spyOn(console, "error").mockImplementation(() => undefined)

    expect(await runScore([dir])).toBe(0)
    // No real codebase reaches 101, so this always trips the gate → exit 1 (distinct from the
    // empty-input exit 2).
    expect(await runScore([dir, "--threshold", "101"])).toBe(1)
    removeProject(dir)
  })

  it("exits 1 with a usage message when no target is given", async () => {
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => undefined)
    const code = await runScore([])
    expect(code).toBe(1)
    expect(errSpy).toHaveBeenCalledWith(expect.stringContaining("Usage:"))
  })
})
