#!/usr/bin/env tsx
/**
 * Sync the eslint pair version to mirror the functype family version per
 * the encoding rule:
 *
 *   eslint.major = 2 (fixed offset from functype's 1.x line)
 *   eslint.minor = functype.major * 100 + functype.minor
 *   eslint.patch = functype.patch
 *
 * Examples:
 *   functype 1.0.1   →  eslint 2.100.1
 *   functype 1.1.0   →  eslint 2.101.0
 *   functype 1.1.1   →  eslint 2.101.1
 *   functype 1.20.1  →  eslint 2.120.1   (3-digit minor headroom)
 *   functype 2.0.0   →  eslint 2.200.0
 *
 * The `100` multiplier is intentional: it reserves two digits of headroom for
 * the functype minor so 1.99 → 2.199 (still 3 digits, sortable). When functype
 * eventually reaches a major where both lines can be aligned (e.g. a 3.x reset
 * for both packages), this script will need an updated formula — until then,
 * the formula is stable for the functype 1.x → eslint 2.1xx line.
 *
 * Usage:
 *   pnpm sync:eslint-mirror          — writes computed eslint versions to package.json
 *   pnpm sync:eslint-mirror --check  — fails if eslint versions don't match the encoding
 *
 * Wired into `pnpm run version-packages` so it runs after `changeset version`
 * bumps the functype family. Also called from `scripts/check-publish-safety.ts`
 * as a pre-publish gate.
 */

import { readFileSync, writeFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..")

const FUNCTYPE_REF_PKG = "packages/functype/package.json"
const ESLINT_PKGS = ["packages/eslint-config-functype/package.json", "packages/eslint-plugin-functype/package.json"]

const ESLINT_MAJOR = 2 // fixed offset; see header for context

const checkMode = process.argv.includes("--check")

const readPkg = (relPath: string): { name: string; version: string; [k: string]: unknown } =>
  JSON.parse(readFileSync(join(repoRoot, relPath), "utf8")) as {
    name: string
    version: string
    [k: string]: unknown
  }

const writePkg = (relPath: string, pkg: object): void => {
  writeFileSync(join(repoRoot, relPath), JSON.stringify(pkg, null, 2) + "\n")
}

const computeEslintVersion = (functypeVersion: string): string => {
  const parts = functypeVersion.split(".").map(Number)
  if (parts.length !== 3 || parts.some(Number.isNaN)) {
    throw new Error(`Cannot parse functype version: ${functypeVersion}`)
  }
  const [major, minor, patch] = parts as [number, number, number]
  const eslintMinor = major * 100 + minor
  return `${ESLINT_MAJOR}.${eslintMinor}.${patch}`
}

const functype = readPkg(FUNCTYPE_REF_PKG)
const expectedEslint = computeEslintVersion(functype.version)

console.log(`functype@${functype.version} → eslint pair should be @${expectedEslint}`)

const drifts: Array<{ path: string; name: string; actual: string }> = []
for (const relPath of ESLINT_PKGS) {
  const pkg = readPkg(relPath)
  if (pkg.version !== expectedEslint) {
    drifts.push({ path: relPath, name: pkg.name, actual: pkg.version })
  }
}

if (drifts.length === 0) {
  console.log(`✓ eslint mirror in sync (both at ${expectedEslint})`)
  process.exit(0)
}

if (checkMode) {
  console.error(`\n✗ eslint mirror out of sync with functype@${functype.version} (expected ${expectedEslint}):`)
  for (const d of drifts) {
    console.error(`    ${d.name.padEnd(25)}  ${d.actual}  (expected ${expectedEslint})`)
  }
  console.error(`\n  Run \`pnpm sync:eslint-mirror\` to fix, or update the encoding formula in scripts/sync-eslint-mirror.ts.`)
  process.exit(1)
}

console.log(`\nSyncing ${drifts.length} eslint package(s) to ${expectedEslint}:`)
for (const d of drifts) {
  const pkg = readPkg(d.path)
  pkg.version = expectedEslint
  writePkg(d.path, pkg)
  console.log(`    ${d.name.padEnd(25)}  ${d.actual}  →  ${expectedEslint}`)
}

console.log(`\n✓ eslint mirror synced`)
