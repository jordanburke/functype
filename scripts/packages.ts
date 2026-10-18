/**
 * The one list of published workspace packages. `release.ts`, `check-publish-safety.ts`,
 * `verify-published.ts` and `sync-eslint-mirror.ts` all read it, so adding a package means
 * adding it here once. `check-publish-safety` fails if a public workspace package is
 * missing from it.
 */

import { spawnSync } from "node:child_process"
import { relative } from "node:path"

/** The functype family: 6 packages on the `1.x` line, bumped together by `release.ts`. */
export const FAMILY_PACKAGE_DIRS = [
  "packages/functype",
  "packages/functype-os",
  "packages/functype-log",
  "packages/functype-react",
  "packages/functype-eval",
  "packages/mcp-server",
] as const

/** The eslint pair, whose version mirrors the family's (see `sync-eslint-mirror.ts`). */
export const ESLINT_PACKAGE_DIRS = ["packages/eslint-config-functype", "packages/eslint-plugin-functype"] as const

/** Every package the release publishes. */
export const PACKAGE_DIRS = [...FAMILY_PACKAGE_DIRS, ...ESLINT_PACKAGE_DIRS] as const

/**
 * Workspace packages that are not `private` but which no list above names. Asks pnpm for the
 * workspace, the same set `pnpm -r publish` walks, so it covers every glob in
 * `pnpm-workspace.yaml`, not just `packages/`.
 */
export const unlistedPublicPackageDirs = (repoRoot: string): readonly string[] => {
  const result = spawnSync("pnpm", ["-r", "ls", "--json", "--depth", "-1"], { cwd: repoRoot, encoding: "utf8" })
  if (result.status !== 0) throw new Error(`pnpm -r ls failed: ${result.stderr}`)
  const workspace = JSON.parse(result.stdout) as ReadonlyArray<{ readonly path: string; readonly private?: boolean }>
  const listed = new Set<string>(PACKAGE_DIRS)
  return workspace
    .filter((pkg) => pkg.private !== true)
    .map((pkg) => relative(repoRoot, pkg.path))
    .filter((dir) => !listed.has(dir))
}
