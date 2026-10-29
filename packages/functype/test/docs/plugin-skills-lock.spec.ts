import { execFileSync } from "node:child_process"
import { posix } from "node:path"

import { describe, expect, it } from "vitest"

/**
 * An installed Claude plugin updates only when its version in `.claude-plugin/marketplace.json`
 * changes, so a skill edit without a version bump never reaches anyone who installed the plugin.
 * scripts/sync-plugin-lock.ts records each plugin's version and a hash of its skills; this runs its
 * check, so a skill change fails CI until the plugin's version is bumped and the lock is rewritten.
 */

const { join } = posix
const PACKAGE_ROOT = join(import.meta.dirname.split("\\").join("/"), "..", "..")
const REPO_ROOT = join(PACKAGE_ROOT, "..", "..")

describe("Claude plugin versions", () => {
  it("bumps a plugin's version whenever its skills change", () => {
    const run = (): string =>
      execFileSync(
        join(REPO_ROOT, "node_modules/.bin/tsx"),
        [join(REPO_ROOT, "scripts/sync-plugin-lock.ts"), "--check"],
        {
          cwd: REPO_ROOT,
          encoding: "utf8",
          stdio: "pipe",
        },
      )
    expect(run).not.toThrow()
  })
})
