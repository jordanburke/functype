#!/usr/bin/env tsx
/**
 * Pre-publish safety gate.
 *
 * Refuses to proceed if any of the following holds, unless explicitly
 * authorized:
 *
 *   1. Major version bump (e.g. 0.60.7 → 1.0.0) — set
 *      `ALLOW_MAJOR=<pkg>,<pkg>` env var to authorize specific packages.
 *   2. Downgrade (local < npm) — never auto-authorized. Will not publish.
 *   3. Family-cadence drift: the 5 functype-* packages (in the Changesets
 *      `fixed` group) must publish at the same version. Drift here means
 *      something bypassed the Changesets bump step (manual edit, conflict
 *      resolution, snapshot leakage, dependabot, etc.).
 *   4. Side-file drift: `packages/mcp-server/server.json` (the MCP registry
 *      manifest) must match the package.json version.
 *
 * Background: on 2026-05-30 a `workspace:^` peerDependency caused
 * functype-os/-log/-react to silently force-major-bump from 0.60.7 →
 * 1.0.0 when functype published 0.61.0. Three permanent 1.0.0 versions
 * landed on npm before the cascade was noticed. The family-cadence check
 * (rule 3) plus the Changesets `fixed` group restored in PR #167 prevent
 * the inverse problem (one package drifting out of family alignment).
 *
 * Runs in `publish.yml` before `pnpm -r publish` and locally via
 * `pnpm check-publish-safety`.
 */

import { readFileSync } from "node:fs"
import { join, dirname } from "node:path"
import { fileURLToPath } from "node:url"
import { spawnSync } from "node:child_process"

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..")

const PACKAGE_DIRS = [
  "packages/functype",
  "packages/functype-os",
  "packages/functype-log",
  "packages/functype-react",
  "packages/mcp-server",
  "packages/eslint-config-functype",
  "packages/eslint-plugin-functype",
] as const

/**
 * The 5 functype-* packages are in a Changesets `fixed` group and must always
 * publish at the same version. This list mirrors `fixed` in `.changeset/config.json`.
 * Eslint packages (`eslint-config-functype`, `eslint-plugin-functype`) release
 * independently on the `2.100.x` line and are NOT in this group.
 */
const FAMILY_CADENCE_GROUP = new Set<string>([
  "functype",
  "functype-os",
  "functype-log",
  "functype-react",
  "functype-mcp-server",
])

const allowMajor = new Set(
  (process.env.ALLOW_MAJOR ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean),
)

type BumpKind = "patch" | "minor" | "major" | "downgrade" | "same" | "new"

interface Plan {
  name: string
  local: string
  npm: string | null
  bump: BumpKind
}

const readPkg = (dir: string): { name: string; version: string } => {
  const raw = readFileSync(join(repoRoot, dir, "package.json"), "utf8")
  return JSON.parse(raw) as { name: string; version: string }
}

const getNpmVersion = (name: string): string | null => {
  const result = spawnSync("npm", ["view", name, "version"], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  })
  if (result.status !== 0) return null
  const out = result.stdout.trim()
  return out.length > 0 ? out : null
}

const classify = (local: string, npm: string | null): BumpKind => {
  if (!npm) return "new"
  if (local === npm) return "same"
  const [lMaj = 0, lMin = 0, lPat = 0] = local.split(".").map(Number)
  const [nMaj = 0, nMin = 0, nPat = 0] = npm.split(".").map(Number)
  if (lMaj > nMaj) return "major"
  if (lMaj < nMaj) return "downgrade"
  if (lMin > nMin) return "minor"
  if (lMin < nMin) return "downgrade"
  if (lPat > nPat) return "patch"
  return "downgrade"
}

const plans: Plan[] = PACKAGE_DIRS.map((dir) => {
  const { name, version } = readPkg(dir)
  const npm = getNpmVersion(name)
  return { name, local: version, npm, bump: classify(version, npm) }
})

console.log("\nPublish plan (local → npm):")
const colName = Math.max(...plans.map((p) => p.name.length))
for (const p of plans) {
  const npmStr = p.npm ?? "(new)"
  const arrow = p.bump === "same" ? "=" : p.bump === "downgrade" ? "↓" : "→"
  console.log(`  ${p.name.padEnd(colName)}  ${npmStr.padStart(10)} ${arrow} ${p.local.padEnd(10)}  [${p.bump}]`)
}

const downgrades = plans.filter((p) => p.bump === "downgrade")
const surpriseMajors = plans.filter((p) => p.bump === "major" && !allowMajor.has(p.name))
const allowedMajors = plans.filter((p) => p.bump === "major" && allowMajor.has(p.name))

if (allowedMajors.length > 0) {
  console.log(`\nℹ️  Authorized major bumps via ALLOW_MAJOR: ${allowedMajors.map((p) => p.name).join(", ")}`)
}

if (downgrades.length > 0) {
  console.error(`\n✗ check-publish-safety: ${downgrades.length} downgrade(s) detected (local < npm)`)
  for (const p of downgrades) {
    console.error(`    ${p.name}: ${p.local} < ${p.npm}`)
  }
  console.error(
    `\n  Downgrades are never auto-approved — npm tooling treats publishing a lower version as a real (but quiet) event.`,
  )
  console.error(`  If intentional (e.g. correcting an accidental major jump), revert the version field and republish.`)
  process.exit(1)
}

if (surpriseMajors.length > 0) {
  console.error(`\n✗ check-publish-safety: ${surpriseMajors.length} unauthorized major bump(s)`)
  for (const p of surpriseMajors) {
    console.error(`    ${p.name}: ${p.npm} → ${p.local} (major)`)
  }
  console.error(
    `\n  If intentional, set ALLOW_MAJOR=${surpriseMajors.map((p) => p.name).join(",")} on the publish step and retry.`,
  )
  console.error(`  See docs/RELEASE.md "Independent cadence" for the post-mortem on the 0.60.7 → 1.0.0 cascade.`)
  process.exit(1)
}

// Family-cadence alignment: the 5 functype-* packages share a Changesets
// `fixed` group and must publish at the same version. The `fixed` group
// enforces this at the version-bump step, but drift can be introduced by
// other paths (manual edits, conflict resolution, snapshot leakage,
// dependabot bumps, etc.). This check catches drift at publish time before
// the family lands at inconsistent versions on npm.
const familyMembers = plans.filter((p) => FAMILY_CADENCE_GROUP.has(p.name))
const familyVersions = new Set(familyMembers.map((p) => p.local))
if (familyVersions.size > 1) {
  console.error(
    `\n✗ check-publish-safety: ${familyMembers.length} functype-* packages are not at the same version.`,
  )
  for (const p of familyMembers) {
    console.error(`    ${p.name.padEnd(colName)}  ${p.local}`)
  }
  console.error(
    `\n  These packages are in a Changesets \`fixed\` group and must publish together at the same version.`,
  )
  console.error(`  Restore alignment with \`pnpm changeset version\` (which respects the fixed group) and commit.`)
  console.error(`  See docs/RELEASE.md "Independent cadence" rule (1) for the family-cadence policy.`)
  process.exit(1)
}

// Side-file consistency: functype-mcp-server bakes its version into
// server.json (MCP registry manifest) in addition to package.json. The
// package's `prepublishOnly` runs `sync:registry:check` which catches
// drift, but that fires DURING `pnpm publish` — too late, after this
// safety gate has already greenlit the release. Invoke it here so a
// missed `pnpm -F functype-mcp-server sync:registry` after a manual
// version bump fails the gate up front instead of mid-publish.
console.log(`\nRunning functype-mcp-server side-file sync check...`)
const syncCheck = spawnSync("pnpm", ["-F", "functype-mcp-server", "sync:registry:check"], {
  stdio: "inherit",
  cwd: repoRoot,
})
if (syncCheck.status !== 0) {
  console.error(
    `\n✗ check-publish-safety: functype-mcp-server server.json is out of sync with package.json.\n  Run \`pnpm -F functype-mcp-server sync:registry\` and commit the result.`,
  )
  process.exit(1)
}

console.log(
  `\n✓ check-publish-safety: no surprise majors or downgrades; functype-* family aligned — safe to publish`,
)
