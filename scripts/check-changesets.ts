#!/usr/bin/env tsx
/**
 * Validates queued changesets against the family-cadence rule before they
 * reach the release workflow.
 *
 * The rule (see docs/RELEASE.md "Mirror invariant"): every non-empty
 * changeset must list all 7 publishable packages at the SAME bump level.
 * `eslint-{config,plugin}-functype` mirror functype's minor/patch position;
 * mixed-level or per-package changesets break the mirror and cause
 * `version-packages` to fail mid-release with a `check-eslint-mirror` error
 * — by which point the Version Packages PR is in a broken state.
 *
 * This script runs in `pnpm validate` (and therefore CI) so the violation
 * surfaces at PR time instead. Failure modes it catches:
 *   1. Changeset declares only a subset of the 7 packages.
 *   2. Changeset declares packages with mismatched bump levels.
 *   3. Changeset declares unknown package names (typo or rename drift).
 */

import { readdirSync, readFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..")
const changesetDir = join(repoRoot, ".changeset")

const PUBLISHABLE = [
  "functype",
  "functype-os",
  "functype-log",
  "functype-react",
  "functype-mcp-server",
  "eslint-config-functype",
  "eslint-plugin-functype",
] as const

const PUBLISHABLE_SET: ReadonlySet<string> = new Set(PUBLISHABLE)

interface ChangesetParse {
  file: string
  packages: Map<string, string>
}

const parseChangeset = (file: string): ChangesetParse | null => {
  const content = readFileSync(join(changesetDir, file), "utf8")
  const match = /^---\r?\n([\s\S]*?)\r?\n---/.exec(content)
  if (!match || !match[1]) return null

  const packages = new Map<string, string>()
  for (const line of match[1].split(/\r?\n/)) {
    // Frontmatter shape: `"package-name": bump-level` (quotes optional but
    // always present in changesets-cli output).
    const m = /^\s*"?([^":\s]+)"?\s*:\s*(\w+)\s*$/.exec(line)
    if (m && m[1] && m[2]) packages.set(m[1], m[2])
  }
  return { file, packages }
}

interface Violation {
  file: string
  detail: string
}

const violations: Violation[] = []

for (const file of readdirSync(changesetDir).sort()) {
  if (!file.endsWith(".md") || file === "README.md") continue

  const parsed = parseChangeset(file)
  if (!parsed) continue
  if (parsed.packages.size === 0) continue // description-only changeset

  const missing = PUBLISHABLE.filter((p) => !parsed.packages.has(p))
  if (missing.length > 0) {
    violations.push({ file, detail: `missing packages — ${missing.join(", ")}` })
  }

  const unknown = [...parsed.packages.keys()].filter((p) => !PUBLISHABLE_SET.has(p))
  if (unknown.length > 0) {
    violations.push({ file, detail: `unknown packages — ${unknown.join(", ")}` })
  }

  const levels = new Set(parsed.packages.values())
  if (levels.size > 1) {
    const breakdown = [...parsed.packages].map(([p, l]) => `${p}=${l}`).join(", ")
    violations.push({ file, detail: `mismatched bump levels — ${breakdown}` })
  }
}

if (violations.length > 0) {
  console.error("✗ check-changesets: family-cadence rule violations")
  for (const v of violations) {
    console.error(`    ${v.file}: ${v.detail}`)
  }
  console.error(
    `\n  Every non-empty changeset must list all 7 publishable packages at the same\n  bump level. See docs/RELEASE.md "Mirror invariant" for the why.\n\n  Packages: ${PUBLISHABLE.join(", ")}`,
  )
  process.exit(1)
}

console.log(`✓ check-changesets: family-cadence rule satisfied`)
