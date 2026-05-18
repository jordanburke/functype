#!/usr/bin/env tsx
/**
 * Verifies the eslint packages mirror functype's minor and patch.
 *
 * Rule: `eslint-config-functype` and `eslint-plugin-functype` versions
 * must be exactly `2.<functype-minor>.<functype-patch>` (until functype
 * 1.0, at which point the major catches up too and this script will
 * need an update).
 *
 * Hooked into the root `version-packages` script so a release PR that
 * misses an eslint bump (or uses a mismatched level) fails before
 * `pnpm -r publish` runs. Also run on every PR via CI for early signal.
 */

import { readFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..")

const readVersion = (pkgPath: string): string => {
  const json = JSON.parse(readFileSync(join(repoRoot, pkgPath, "package.json"), "utf8")) as { version: string }
  return json.version
}

const functypeVersion = readVersion("packages/functype")
const [functypeMajor, functypeMinor, functypePatch] = functypeVersion.split(".")

if (!functypeMajor || functypeMinor === undefined || functypePatch === undefined) {
  console.error(`✗ check-eslint-mirror: could not parse functype version ${functypeVersion}`)
  process.exit(1)
}

if (functypeMajor !== "0") {
  console.error(
    `✗ check-eslint-mirror: functype is at ${functypeVersion} — the mirror rule assumes functype 0.x. Update this script for the 1.0 catch-up: eslint packages should move to 3.0.0 and from then on share the full version.`,
  )
  process.exit(1)
}

const expected = `2.${functypeMinor}.${functypePatch}`

const targets = [
  { pkg: "eslint-config-functype", path: "packages/eslint-config-functype" },
  { pkg: "eslint-plugin-functype", path: "packages/eslint-plugin-functype" },
]

const drift = targets
  .map(({ pkg, path }) => ({ pkg, actual: readVersion(path) }))
  .filter(({ actual }) => actual !== expected)

if (drift.length > 0) {
  console.error(
    `✗ check-eslint-mirror: eslint packages drifted from functype@${functypeVersion} (expected ${expected}):`,
  )
  for (const { pkg, actual } of drift) {
    console.error(`    ${pkg}: ${actual} (expected ${expected})`)
  }
  console.error(
    `\n  To fix: include all 7 publishable packages in the changeset at the same bump level as functype. Per-package or mismatched-level changesets break the mirror.`,
  )
  process.exit(1)
}

console.log(`✓ check-eslint-mirror: functype@${functypeVersion} mirrored by eslint-{config,plugin}-functype@${expected}`)
