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
 *   pnpm sync:eslint-mirror --test   — runs self-test cases for the encoding (no I/O)
 *
 * Wired into `pnpm run version-packages` so it runs after `changeset version`
 * bumps the functype family. Also called from `scripts/check-publish-safety.ts`
 * as a pre-publish gate. The `--test` mode runs in `pnpm validate` as a CI gate.
 */

import { readFileSync, writeFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..")

const FUNCTYPE_REF_PKG = "packages/functype/package.json"
const ESLINT_PKGS = ["packages/eslint-config-functype/package.json", "packages/eslint-plugin-functype/package.json"]

const ESLINT_MAJOR = 2 // fixed offset; see header for context

const checkMode = process.argv.includes("--check")
const testMode = process.argv.includes("--test")

const readPkg = (relPath: string): { name: string; version: string; [k: string]: unknown } =>
  JSON.parse(readFileSync(join(repoRoot, relPath), "utf8")) as {
    name: string
    version: string
    [k: string]: unknown
  }

const writePkg = (relPath: string, pkg: object): void => {
  writeFileSync(join(repoRoot, relPath), JSON.stringify(pkg, null, 2) + "\n")
}

/**
 * The encoding requires `functype.minor < 100`. Above that, the formula
 * collides: e.g. `functype@1.100.0` and `functype@2.0.0` would both encode
 * to `eslint@2.200.0`. If you ever genuinely need functype.minor >= 100,
 * the formula must change (e.g. bump ESLINT_MAJOR to 3 and restart the
 * encoding, or rebase eslint onto a different scheme entirely). See the
 * "Mirror encoding" section of docs/RELEASE.md for the planned transition.
 */
const FUNCTYPE_MINOR_MAX = 99

/** Soft ceiling: at functype.major >= 10 the encoded eslint.minor exceeds 3 digits (e.g. 1000+). */
const FUNCTYPE_MAJOR_SOFT_MAX = 9

export const computeEslintVersion = (functypeVersion: string): string => {
  const parts = functypeVersion.split(".").map(Number)
  if (parts.length !== 3 || parts.some(Number.isNaN)) {
    throw new Error(`Cannot parse functype version: ${functypeVersion}`)
  }
  const [major, minor, patch] = parts as [number, number, number]

  if (minor > FUNCTYPE_MINOR_MAX) {
    throw new Error(
      `Encoding collision: functype.minor=${minor} exceeds ${FUNCTYPE_MINOR_MAX}. ` +
        `The mirror formula \`eslint.minor = major*100 + minor\` collides at minor>=100 ` +
        `(e.g. functype@${major}.100.x and functype@${major + 1}.0.x both encode to eslint@2.${(major + 1) * 100}.x). ` +
        `Update the formula in scripts/sync-eslint-mirror.ts and see docs/RELEASE.md "Mirror encoding" for the planned transition.`,
    )
  }
  if (major > FUNCTYPE_MAJOR_SOFT_MAX) {
    console.warn(
      `⚠  functype.major=${major} produces a 4-digit eslint.minor (${major * 100 + minor}). ` +
        `Encoding still works but is getting awkward — consider re-aligning the two version lines.`,
    )
  }

  const eslintMinor = major * 100 + minor
  return `${ESLINT_MAJOR}.${eslintMinor}.${patch}`
}

// --- self-test mode ---------------------------------------------------------

if (testMode) {
  type Case = { input: string; expected: string }
  type ThrowCase = { input: string; expectMessage: RegExp }

  const cases: Case[] = [
    // Patches within a minor
    { input: "1.0.0", expected: "2.100.0" },
    { input: "1.0.1", expected: "2.100.1" },
    { input: "1.0.99", expected: "2.100.99" },
    // Minor bumps in the 1.x line
    { input: "1.1.0", expected: "2.101.0" },
    { input: "1.1.1", expected: "2.101.1" },
    { input: "1.10.0", expected: "2.110.0" },
    { input: "1.20.1", expected: "2.120.1" },
    { input: "1.99.99", expected: "2.199.99" },
    // Future majors
    { input: "2.0.0", expected: "2.200.0" },
    { input: "2.99.0", expected: "2.299.0" },
    { input: "3.0.0", expected: "2.300.0" },
    { input: "9.99.0", expected: "2.999.0" },
  ]

  const throwCases: ThrowCase[] = [
    // Collision boundary — functype.minor >= 100
    { input: "1.100.0", expectMessage: /Encoding collision.*minor=100/ },
    { input: "2.150.0", expectMessage: /Encoding collision.*minor=150/ },
    // Malformed
    { input: "1.0", expectMessage: /Cannot parse/ },
    { input: "not.a.version", expectMessage: /Cannot parse/ },
  ]

  let passed = 0
  let failed = 0
  for (const c of cases) {
    try {
      const got = computeEslintVersion(c.input)
      if (got === c.expected) {
        passed++
      } else {
        failed++
        console.error(`  ✗ functype@${c.input} → expected ${c.expected}, got ${got}`)
      }
    } catch (e) {
      failed++
      console.error(`  ✗ functype@${c.input} → expected ${c.expected}, threw: ${(e as Error).message}`)
    }
  }
  for (const c of throwCases) {
    try {
      const got = computeEslintVersion(c.input)
      failed++
      console.error(`  ✗ functype@${c.input} → expected throw matching ${c.expectMessage}, got ${got}`)
    } catch (e) {
      if (c.expectMessage.test((e as Error).message)) {
        passed++
      } else {
        failed++
        console.error(`  ✗ functype@${c.input} → threw but message didn't match ${c.expectMessage}: ${(e as Error).message}`)
      }
    }
  }

  console.log(
    `\n${failed === 0 ? "✓" : "✗"} sync-eslint-mirror self-test: ${passed} passed, ${failed} failed (${cases.length + throwCases.length} total)`,
  )
  process.exit(failed === 0 ? 0 : 1)
}

// --- normal mode (read package.json, compute, optionally write) -------------

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
