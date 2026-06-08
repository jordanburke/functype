import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { dirname, join } from "node:path"

/** Write a throwaway project (relative path → file contents) to a fresh temp dir and return its path. */
export const writeProject = (files: Record<string, string>): string => {
  const dir = mkdtempSync(join(tmpdir(), "functype-eval-"))
  Object.entries(files).forEach(([rel, content]) => {
    const path = join(dir, rel)
    mkdirSync(dirname(path), { recursive: true })
    writeFileSync(path, content)
  })
  return dir
}

export const removeProject = (dir: string): void => rmSync(dir, { recursive: true, force: true })

/** Total violations across a RuleCounts map. */
export const totalViolations = (counts: ReadonlyMap<string, number>): number =>
  [...counts.values()].reduce((sum, n) => sum + n, 0)
