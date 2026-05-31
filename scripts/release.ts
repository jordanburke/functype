#!/usr/bin/env tsx
/**
 * Local release script — bumps the functype family at the requested semver
 * level, runs the eslint mirror sync + mcp-server registry sync, validates,
 * commits, and creates an annotated git tag. Push the tag to trigger CI
 * publish (`.github/workflows/publish.yml`).
 *
 * Usage:
 *   pnpm release patch
 *   pnpm release minor
 *   pnpm release major   # requires ALLOW_MAJOR env (see check-publish-safety)
 *
 * Flow:
 *   1. Verify clean working tree, on main, in sync with origin/main
 *   2. Run `pnpm validate` (full workspace lint + typecheck + test + build)
 *   3. Compute new functype version from current + bump level
 *   4. Apply to all 5 family package.jsons
 *   5. Run `pnpm sync:eslint-mirror` → eslint pair = 2.{major*100+minor}.{patch}
 *   6. Run `pnpm -F functype-mcp-server sync:registry` → server.json tracks pkg.version
 *   7. Cut `## Unreleased` section in packages/functype/CHANGELOG.md to `## {version} - {date}`
 *   8. Run `pnpm check-publish-safety` (last safety gate before commit)
 *   9. `git commit -m "release: v{version}"` and `git tag v{version}`
 *  10. Print push instructions
 *
 * CI on tag push runs validate + check-publish-safety + `pnpm -r publish`. The
 * 4 OIDC-trusted-publisher packages (functype, -os, -log, -react) get
 * provenance attestations; functype-mcp-server publishes with NPM_TOKEN.
 *
 * Implementation note: uses spawnSync with argument arrays (not exec/execSync
 * with shell strings) so command arguments aren't subject to shell
 * interpolation. Some args (e.g. the new version in `git commit -m`) are
 * derived from package.json and could theoretically carry odd characters
 * through a compromised file; arg-array form makes that a non-issue.
 */

import { spawnSync } from "node:child_process"
import { existsSync, readFileSync, writeFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..")

const FAMILY_PACKAGE_DIRS = [
  "packages/functype",
  "packages/functype-os",
  "packages/functype-log",
  "packages/functype-react",
  "packages/mcp-server",
] as const

type BumpLevel = "patch" | "minor" | "major"

const bumpLevel = process.argv[2] as BumpLevel | undefined
if (!bumpLevel || !["patch", "minor", "major"].includes(bumpLevel)) {
  console.error("Usage: pnpm release patch|minor|major")
  process.exit(1)
}

const run = (cmd: string, args: readonly string[] = []): void => {
  console.log(`\n▶ ${cmd}${args.length ? " " + args.join(" ") : ""}`)
  const result = spawnSync(cmd, args, { cwd: repoRoot, stdio: "inherit" })
  if (result.status !== 0) {
    console.error(`✗ Command failed: ${cmd} ${args.join(" ")}`)
    process.exit(result.status ?? 1)
  }
}

const capture = (cmd: string, args: readonly string[] = []): string => {
  const result = spawnSync(cmd, args, { cwd: repoRoot, encoding: "utf8" })
  if (result.status !== 0) {
    console.error(`✗ Command failed: ${cmd} ${args.join(" ")}\n${result.stderr ?? ""}`)
    process.exit(result.status ?? 1)
  }
  return result.stdout.toString().trim()
}

const readPkg = (dir: string): { name: string; version: string; [k: string]: unknown } => {
  const path = join(repoRoot, dir, "package.json")
  return JSON.parse(readFileSync(path, "utf8")) as { name: string; version: string; [k: string]: unknown }
}

const writePkg = (dir: string, pkg: object): void => {
  writeFileSync(join(repoRoot, dir, "package.json"), JSON.stringify(pkg, null, 2) + "\n")
}

// 1. Preflight
const dirty = capture("git", ["status", "--porcelain"])
if (dirty) {
  console.error("✗ Working tree is not clean. Commit or stash changes first.\n" + dirty)
  process.exit(1)
}
const branch = capture("git", ["rev-parse", "--abbrev-ref", "HEAD"])
if (branch !== "main") {
  console.error(`✗ Not on main (currently on ${branch}). Release from main.`)
  process.exit(1)
}
run("git", ["fetch", "origin", "main", "--quiet"])
const local = capture("git", ["rev-parse", "HEAD"])
const remote = capture("git", ["rev-parse", "origin/main"])
if (local !== remote) {
  console.error(`✗ Local main is not in sync with origin/main.\n  local=${local}\n  remote=${remote}`)
  process.exit(1)
}

// 2. Validate
run("pnpm", ["validate"])

// 3. Compute new version
const current = readPkg("packages/functype").version
const parts = current.split(".").map(Number)
if (parts.length !== 3 || parts.some(Number.isNaN)) {
  console.error(`✗ Cannot parse current functype version: ${current}`)
  process.exit(1)
}
const [major, minor, patch] = parts as [number, number, number]
const next =
  bumpLevel === "major"
    ? `${major + 1}.0.0`
    : bumpLevel === "minor"
      ? `${major}.${minor + 1}.0`
      : `${major}.${minor}.${patch + 1}`

// Validate computed version shape — no shell metachars possible from semver,
// but guard the assumption explicitly so a corrupted package.json can't
// inject odd content through later argument interpolation.
if (!/^\d+\.\d+\.\d+$/.test(next)) {
  console.error(`✗ Computed version ${next} doesn't look like semver.`)
  process.exit(1)
}

console.log(`\nReleasing functype family: ${current} → ${next} (${bumpLevel})`)

// 4. Bump all 5 family packages
for (const dir of FAMILY_PACKAGE_DIRS) {
  const pkg = readPkg(dir)
  pkg.version = next
  writePkg(dir, pkg)
  console.log(`  ${(pkg.name as string).padEnd(22)} ${current} → ${next}`)
}

// 5. Mirror sync (eslint pair)
run("pnpm", ["sync:eslint-mirror"])

// 6. server.json sync (mcp-server)
run("pnpm", ["-F", "functype-mcp-server", "sync:registry"])

// 7. Cut CHANGELOG `## Unreleased` → `## {version} - {date}`
const changelogPath = join(repoRoot, "packages/functype/CHANGELOG.md")
if (!existsSync(changelogPath)) {
  console.warn(`⚠  ${changelogPath} not found — skipping CHANGELOG cut.`)
} else {
  const changelog = readFileSync(changelogPath, "utf8")
  const unreleasedRegex = /## Unreleased\s*\n+([\s\S]*?)(?=\n## |\n$)/
  const m = changelog.match(unreleasedRegex)
  if (!m || !m[1] || !m[1].trim()) {
    console.error(
      `✗ No content in \`## Unreleased\` section of packages/functype/CHANGELOG.md.\n` +
        `  Write release notes there before running \`pnpm release\`.`,
    )
    process.exit(1)
  }
  const unreleasedContent = m[1].trim()
  const today = capture("date", ["+%Y-%m-%d"])
  const replacement = `## Unreleased\n\n## ${next} - ${today}\n\n${unreleasedContent}\n`
  const updated = changelog.replace(unreleasedRegex, replacement)
  writeFileSync(changelogPath, updated)
  console.log(`\n  Cut Unreleased → ## ${next} - ${today}`)
}

// 8. Final safety gate
run("pnpm", ["check-publish-safety"])

// 9. Commit + tag (arg-array form avoids shell interpolation of `next`)
run("git", ["add", "-A"])
run("git", ["commit", "-m", `release: v${next}`])
run("git", ["tag", "-a", `v${next}`, "-m", `Release v${next}`])

// 10. Instructions
console.log(`\n✓ Released v${next} locally (commit + tag).`)
console.log(`\nNext steps:`)
console.log(`  git push --follow-tags`)
console.log(`\nCI on tag push will:`)
console.log(`  1. Re-run validate + check-publish-safety`)
console.log(`  2. pnpm -r publish --no-git-checks (publishes packages with version differing from npm latest)`)
console.log(`  3. Create GitHub releases per published package`)
