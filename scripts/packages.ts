/**
 * The one list of published workspace packages. `release.ts`, `check-publish-safety.ts`,
 * `verify-published.ts` and `sync-eslint-mirror.ts` all read it, so adding a package means
 * adding it here once. `check-publish-safety` fails if a public package under `packages/`
 * is missing from it.
 */

import { readdirSync, readFileSync, existsSync } from "node:fs"
import { join } from "node:path"

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

/** Directories under `packages/` whose package.json is not `private` but which no list above names. */
export const unlistedPublicPackageDirs = (repoRoot: string): readonly string[] => {
  const listed = new Set<string>(PACKAGE_DIRS)
  return readdirSync(join(repoRoot, "packages"), { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => `packages/${entry.name}`)
    .filter((dir) => existsSync(join(repoRoot, dir, "package.json")))
    .filter((dir) => {
      const pkg = JSON.parse(readFileSync(join(repoRoot, dir, "package.json"), "utf8")) as {
        readonly private?: boolean
      }
      return pkg.private !== true && !listed.has(dir)
    })
}
