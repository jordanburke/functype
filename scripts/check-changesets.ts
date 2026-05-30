#!/usr/bin/env tsx
/**
 * Validates queued changesets reference known publishable packages — the
 * typo guard. That's it.
 *
 * History: an earlier version enforced a "family-cadence" rule (every non-
 * empty changeset must list ALL 7 publishable packages at the SAME bump
 * level) so the eslint-{config,plugin}-functype mirror stayed consistent.
 * That rule interacted disastrously with `workspace:^` peerDependencies
 * on functype-os/-log/-react — a minor functype bump pushed the peer
 * range out, Changesets force-major-bumped the dependents, and three
 * 1.0.0 versions landed on npm by accident. See packages/functype-* and
 * docs/RELEASE.md "Independent cadence" for the post-mortem.
 *
 * Going forward: each changeset bumps whatever it actually changes,
 * independently per package. This script only catches typos in package
 * names so a `"functype-osx": patch` (typo) doesn't silently no-op.
 */

import { readdirSync, readFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..")
const changesetDir = join(repoRoot, ".changeset")

const PUBLISHABLE = new Set<string>([
  "functype",
  "functype-os",
  "functype-log",
  "functype-react",
  "functype-mcp-server",
  "eslint-config-functype",
  "eslint-plugin-functype",
])

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

  const unknown = [...parsed.packages.keys()].filter((p) => !PUBLISHABLE.has(p))
  if (unknown.length > 0) {
    violations.push({ file, detail: `unknown packages — ${unknown.join(", ")}` })
  }
}

if (violations.length > 0) {
  console.error("✗ check-changesets: unknown package name(s)")
  for (const v of violations) {
    console.error(`    ${v.file}: ${v.detail}`)
  }
  console.error(
    `\n  Known publishable packages: ${[...PUBLISHABLE].sort().join(", ")}`,
  )
  process.exit(1)
}

console.log(`✓ check-changesets: no typos in package names`)
