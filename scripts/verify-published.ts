#!/usr/bin/env tsx
/**
 * Post-publish gate: a release counts as landed only when every package
 * installs from npm.
 *
 * `pnpm -r publish` prints "Published" and exits 0 once the registry accepts
 * the upload, but npm can serve the version for minutes after that as
 * half-written. In 1.16.1 and 1.17.0, three of the 8 packages had `latest`
 * pointing at the new version while its metadata and tarball returned 404,
 * so a clean `npm install` failed for about 6 minutes. Both cleared on their
 * own, without a republish.
 *
 * For each package this checks, until all pass or the deadline, the same
 * document `npm install` reads: the abbreviated packument at
 * `registry.npmjs.org/<name>`. The CDN caches it apart from the per-version
 * and dist-tags URLs, so those can be current while it isn't.
 *
 *   1. It lists <version>.
 *   2. Its dist-tag (`NPM_DIST_TAG`, default `latest`) points at <version>.
 *   3. The `dist.tarball` URL it gives for <version> answers 200.
 *
 * Packages that pass are not re-checked. The deadline defaults to 30 minutes
 * (`VERIFY_TIMEOUT_SECONDS`), because a staged version has been seen to
 * finish or roll back within about 25. Interval: `VERIFY_INTERVAL_SECONDS`,
 * default 30.
 *
 * Runs in `publish.yml` after `pnpm -r publish`, and locally via
 * `pnpm verify-published`. With no arguments it checks every workspace
 * package at its local version. Arguments of the form `name@version` check
 * just those, e.g. `pnpm verify-published functype@1.16.1`.
 */

import { readFileSync } from "node:fs"
import { join, dirname } from "node:path"
import { fileURLToPath } from "node:url"

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..")
const REGISTRY = "https://registry.npmjs.org"

/** Keep in sync with `PACKAGE_DIRS` in `scripts/check-publish-safety.ts`. */
const PACKAGE_DIRS = [
  "packages/functype",
  "packages/functype-os",
  "packages/functype-log",
  "packages/functype-react",
  "packages/functype-eval",
  "packages/mcp-server",
  "packages/eslint-config-functype",
  "packages/eslint-plugin-functype",
] as const

type Target = { readonly name: string; readonly version: string }

type Check = { readonly ok: true } | { readonly ok: false; readonly reason: string }

const seconds = (envName: string, fallback: number, min: number): number => {
  const raw = process.env[envName]
  const parsed = raw === undefined || raw === "" ? fallback : Number(raw)
  if (!Number.isFinite(parsed) || parsed < min) {
    console.error(`✗ verify-published: ${envName} must be a number of seconds >= ${min}, got "${raw}"`)
    process.exit(2)
  }
  return parsed
}

const distTag = process.env.NPM_DIST_TAG || "latest"
const timeoutMs = seconds("VERIFY_TIMEOUT_SECONDS", 30 * 60, 0) * 1000
// At least 1s, so a 0 can't turn the retry loop into a tight loop against the registry.
const intervalMs = seconds("VERIFY_INTERVAL_SECONDS", 30, 1) * 1000
/** Per request, so one hung connection fails that attempt instead of stalling the run past its deadline. */
const REQUEST_TIMEOUT_MS = 15_000

const readTarget = (dir: string): Target => {
  const pkg = JSON.parse(readFileSync(join(repoRoot, dir, "package.json"), "utf8")) as Target
  return { name: pkg.name, version: pkg.version }
}

const parseArg = (arg: string): Target => {
  const at = arg.lastIndexOf("@")
  if (at <= 0 || at === arg.length - 1) {
    console.error(`✗ verify-published: expected name@version, got "${arg}"`)
    process.exit(2)
  }
  return { name: arg.slice(0, at), version: arg.slice(at + 1) }
}

/**
 * `cache-control` asks the registry's CDN not to serve a cached 404. It may not honor that; the retry loop is
 * the real safeguard. The `accept` value is the one npm sends, which selects the abbreviated packument.
 */
const request = (accept: string, method = "GET"): RequestInit => ({
  method,
  headers: { "cache-control": "no-cache", accept },
  signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
})
const INSTALL_ACCEPT = "application/vnd.npm.install-v1+json; q=1.0, application/json; q=0.8, */*"

type Packument = {
  readonly "dist-tags"?: Readonly<Record<string, string>>
  readonly versions?: Readonly<Record<string, { readonly dist?: { readonly tarball?: string } }>>
}

const check = async ({ name, version }: Target): Promise<Check> => {
  const docRes = await fetch(`${REGISTRY}/${name}`, request(INSTALL_ACCEPT))
  if (docRes.status !== 200) return { ok: false, reason: `packument ${docRes.status}` }
  const doc = (await docRes.json()) as Packument

  const entry = doc.versions?.[version]
  if (entry === undefined) return { ok: false, reason: "packument does not list the version yet" }
  const tagged = doc["dist-tags"]?.[distTag]
  if (tagged !== version) return { ok: false, reason: `dist-tag ${distTag} is ${tagged ?? "unset"}` }
  const tarball = entry.dist?.tarball
  if (tarball === undefined) return { ok: false, reason: "packument has no dist.tarball for the version" }

  const tgzRes = await fetch(tarball, request("*/*", "HEAD"))
  if (tgzRes.status !== 200) return { ok: false, reason: `tarball ${tgzRes.status}` }

  return { ok: true }
}

/** A network error is a failed attempt, not a crash: retry it like a 404. */
const safeCheck = (target: Target): Promise<Check> =>
  check(target).catch((error: unknown) => ({
    ok: false as const,
    reason: `request failed: ${error instanceof Error ? error.message : String(error)}`,
  }))

const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms))

const label = ({ name, version }: Target): string => `${name}@${version}`

const main = async (): Promise<void> => {
  const args = process.argv.slice(2)
  const targets = args.length > 0 ? args.map(parseArg) : PACKAGE_DIRS.map(readTarget)
  const started = Date.now()
  const elapsed = (): string => `${Math.round((Date.now() - started) / 1000)}s`

  console.log(`Verifying ${targets.length} package(s) install from npm (dist-tag ${distTag}):`)

  let pending = targets
  let lastReasons = new Map<string, string>()

  for (let attempt = 1; ; attempt++) {
    const results = await Promise.all(pending.map(async (t) => ({ target: t, result: await safeCheck(t) })))
    for (const { target, result } of results) {
      if (result.ok) console.log(`  ✓ ${label(target)}  (${elapsed()})`)
    }
    const failed = results.flatMap(({ target, result }) => (result.ok ? [] : [{ target, reason: result.reason }]))
    pending = failed.map((f) => f.target)
    lastReasons = new Map(failed.map((f) => [label(f.target), f.reason]))

    if (pending.length === 0) {
      console.log(`\n✓ verify-published: all ${targets.length} package(s) installable after ${elapsed()}.`)
      return
    }
    if (Date.now() - started + intervalMs > timeoutMs) break

    console.log(
      `  … attempt ${attempt}: ${pending.length} not yet installable (${[...lastReasons]
        .map(([pkg, reason]) => `${pkg}: ${reason}`)
        .join("; ")}). Retrying in ${intervalMs / 1000}s.`,
    )
    await sleep(intervalMs)
  }

  console.error(`\n✗ verify-published: ${pending.length} package(s) still not installable after ${elapsed()}:`)
  for (const [pkg, reason] of lastReasons) console.error(`    ${pkg}: ${reason}`)
  console.error(`\n  npm accepted the upload but isn't serving it. Don't republish yet: a staged version can`)
  console.error(`  finish or roll back on its own. Re-check with \`pnpm verify-published\`, then see`)
  console.error(`  docs/RELEASE.md "Verify the release installs".`)
  process.exit(1)
}

await main()
