#!/usr/bin/env tsx
/**
 * Sync server.json with package.json.
 *
 * MCP registry manifests (server.json) must keep two version fields aligned
 * with the npm package they advertise:
 *   server.json.version              ← package.json.version
 *   server.json.packages[0].version  ← package.json.version
 *
 * Plus the identity fields:
 *   server.json.name                 ← package.json.mcpName
 *   server.json.packages[0].identifier ← package.json.name
 *
 * Modes:
 *   sync-server-json.ts           Write package.json values into server.json.
 *   sync-server-json.ts --check   Exit non-zero if any of the four pairs drift.
 *                                 Intended for prepublishOnly so a release
 *                                 that bypasses the version step fails loudly.
 *
 * Wired into the release flow at the workspace root via `version-packages`,
 * which runs `pnpm changeset version` followed by this script. That puts
 * the server.json bump in the same "Version Packages" PR diff as the
 * package.json bump, so reviewers see both.
 */

import { readFileSync, writeFileSync } from "node:fs"
import { dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"

const here = dirname(fileURLToPath(import.meta.url))
const pkgRoot = resolve(here, "..")
const pkgJsonPath = resolve(pkgRoot, "package.json")
const serverJsonPath = resolve(pkgRoot, "server.json")

type Pkg = { name: string; version: string; mcpName?: string }
type ServerManifest = {
  name: string
  version: string
  packages: Array<{ identifier: string; version: string; [k: string]: unknown }>
  [k: string]: unknown
}

const pkg = JSON.parse(readFileSync(pkgJsonPath, "utf-8")) as Pkg
const server = JSON.parse(readFileSync(serverJsonPath, "utf-8")) as ServerManifest

const expected = {
  serverVersion: pkg.version,
  serverPackageVersion: pkg.version,
  serverName: pkg.mcpName ?? server.name,
  serverIdentifier: pkg.name,
} as const

const actual = {
  serverVersion: server.version,
  serverPackageVersion: server.packages[0]?.version,
  serverName: server.name,
  serverIdentifier: server.packages[0]?.identifier,
} as const

const drift = Object.entries(expected).filter(([k, v]) => actual[k as keyof typeof actual] !== v)

const check = process.argv.includes("--check")

if (drift.length === 0) {
  console.log(`✓ server.json already in sync with package.json (version=${pkg.version})`)
  process.exit(0)
}

if (check) {
  console.error("✗ server.json drift detected:")
  for (const [field, want] of drift) {
    console.error(
      `  ${field}: server.json=${JSON.stringify(actual[field as keyof typeof actual])}, expected=${JSON.stringify(want)}`,
    )
  }
  console.error("Run `pnpm -F functype-mcp-server sync:registry` to sync.")
  process.exit(1)
}

// Apply sync.
server.version = expected.serverVersion
if (server.packages[0]) {
  server.packages[0].version = expected.serverPackageVersion
  server.packages[0].identifier = expected.serverIdentifier
}
server.name = expected.serverName

writeFileSync(serverJsonPath, JSON.stringify(server, null, 2) + "\n", "utf-8")
console.log(
  `✓ Synced server.json (version=${pkg.version}, ${drift.length} field${drift.length === 1 ? "" : "s"} updated)`,
)
