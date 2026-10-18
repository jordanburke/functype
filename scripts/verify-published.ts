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
 * For each package this checks, until all pass or the deadline:
 *
 *   1. `registry.npmjs.org/<name>/<version>` answers 200.
 *   2. The `dist.tarball` URL it names answers 200.
 *   3. The dist-tag (`NPM_DIST_TAG`, default `latest`) points at <version>.
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

const seconds = (envName: string, fallback: number): number => {
  const raw = process.env[envName]
  const parsed = raw === undefined || raw === "" ? fallback : Number(raw)
  if (!Number.isFinite(parsed) || parsed < 0) {
    console.error(`✗ verify-published: ${envName} must be a non-negative number of seconds, got "${raw}"`)
    process.exit(2)
  }
  return parsed
}

const distTag = process.env.NPM_DIST_TAG || "latest"
const timeoutMs = seconds("VERIFY_TIMEOUT_SECONDS", 30 * 60) * 1000
const intervalMs = seconds("VERIFY_INTERVAL_SECONDS", 30) * 1000

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

/** Asks the registry's CDN not to serve a cached 404. It may not honor that; the retry loop is the real safeguard. */
const noCache = { headers: { "cache-control": "no-cache" } }

const check = async ({ name, version }: Target): Promise<Check> => {
  const metaRes = await fetch(`${REGISTRY}/${name}/${version}`, noCache)
  if (metaRes.status !== 200) return { ok: false, reason: `version metadata ${metaRes.status}` }
  const meta = (await metaRes.json()) as {
    readonly dist?: { readonly tarball?: string }
  }
  const tarball = meta.dist?.tarball
  if (tarball === undefined) return { ok: false, reason: "version metadata has no dist.tarball" }

  const tgzRes = await fetch(tarball, { ...noCache, method: "HEAD" })
  if (tgzRes.status !== 200) return { ok: false, reason: `tarball ${tgzRes.status}` }

  const tagsRes = await fetch(`${REGISTRY}/-/package/${name}/dist-tags`, noCache)
  if (tagsRes.status !== 200) return { ok: false, reason: `dist-tags ${tagsRes.status}` }
  const tags = (await tagsRes.json()) as Readonly<Record<string, string>>
  const tagged = tags[distTag]
  if (tagged !== version) return { ok: false, reason: `dist-tag ${distTag} is ${tagged ?? "unset"}` }

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
