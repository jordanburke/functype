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
 *   3. Alignment-group drift: each Changesets `fixed` group must publish at
 *      the same version. Two groups today:
 *        - Functype family (5 packages): functype, functype-os, functype-log,
 *          functype-react, functype-mcp-server — all on the `1.x` line.
 *        - Eslint pair: eslint-config-functype, eslint-plugin-functype —
 *          both on the `2.100.x` line (intentional offset from functype).
 *      Drift here means something bypassed the Changesets bump step (manual
 *      edit, conflict resolution, snapshot leakage, dependabot, etc.).
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
 * Packages that must publish in lockstep. Each inner group is a `fixed` group
 * in `.changeset/config.json` — every member of a group must have the same
 * version at publish time.
 *
 * - Functype family: 5 packages on the `1.x` line, bumped together.
 * - Eslint pair: config + plugin on the `2.100.x` line, bumped together but
 *   independent from the functype family (intentional version-line offset).
 *
 * **Sync rule:** if you change this list, you MUST also update `fixed` in
 * `.changeset/config.json`. Both lists must mirror each other.
 */
const ALIGNMENT_GROUPS: ReadonlyArray<{ readonly label: string; readonly members: ReadonlySet<string> }> = [
  {
    label: "functype-* family",
    members: new Set<string>(["functype", "functype-os", "functype-log", "functype-react", "functype-mcp-server"]),
  },
  {
    label: "eslint pair",
    members: new Set<string>(["eslint-config-functype", "eslint-plugin-functype"]),
  },
]

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

// Alignment groups: each `fixed` Changesets group must publish in lockstep.
// The `fixed` config enforces this at the version-bump step, but drift can
// be introduced by other paths (manual edits, conflict resolution, snapshot
// leakage, dependabot bumps, etc.). This check catches drift at publish
// time before any group member lands out of sync on npm.
const driftedGroups = ALIGNMENT_GROUPS.flatMap((group) => {
  const members = plans.filter((p) => group.members.has(p.name))
  const versions = new Set(members.map((p) => p.local))
  return versions.size > 1 ? [{ group, members }] : []
})
if (driftedGroups.length > 0) {
  for (const { group, members } of driftedGroups) {
    console.error(`\n✗ check-publish-safety: ${group.label} (${members.length} packages) is out of alignment.`)
    for (const p of members) {
      console.error(`    ${p.name.padEnd(colName)}  ${p.local}`)
    }
  }
  console.error(
    `\n  Aligned groups must publish at the same version. Restore alignment with \`pnpm changeset version\``,
  )
  console.error(`  (which respects the \`fixed\` groups in .changeset/config.json) and commit.`)
  console.error(`  See docs/RELEASE.md "Independent cadence" rule (1) for the family-cadence policy.`)
  process.exit(1)
}

// Eslint mirror encoding: the eslint pair version is derived from the functype
// family version per a fixed formula (eslint.minor = functype.major*100 + functype.minor,
// eslint.patch = functype.patch). The `version-packages` script runs sync:eslint-mirror
// after `changeset version` to maintain the encoding automatically, but drift here
// can be introduced by anything that bypasses that script. Verify it.
console.log(`\nRunning eslint-mirror encoding check...`)
const mirrorCheck = spawnSync("pnpm", ["sync:eslint-mirror:check"], {
  stdio: "inherit",
  cwd: repoRoot,
})
if (mirrorCheck.status !== 0) {
  console.error(
    `\n✗ check-publish-safety: eslint pair version is not the encoded mirror of functype.\n  See scripts/sync-eslint-mirror.ts for the formula and \`pnpm sync:eslint-mirror\` to fix.`,
  )
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
  `\n✓ check-publish-safety: no surprise majors or downgrades; all alignment groups in sync — safe to publish`,
)
