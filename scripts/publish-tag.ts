#!/usr/bin/env tsx
/**
 * Decides, at publish time, how a tagged release reaches npm and GitHub. `publish.yml` runs it
 * before publishing and reads its outputs:
 *
 * - `tag`: the npm dist-tag. `latest`, unless functype's local major is below npm `latest`'s,
 *   as for a 1.x fix after 2.0.0: then `latest-1`, so the fix doesn't take `latest` back.
 * - `latest`: `true` or `false`, whether the GitHub release becomes the repo's "Latest release".
 * - `previous`: the tag the release notes start from, the highest earlier tag on the same major.
 *   Empty for a line's first release, where GitHub picks.
 *
 * Decided at run time, not written into the branch: the workflow runs on a tag push and doesn't
 * know its branch, and a tag fixed on `release/1.x` before 2.0.0 ships would publish 1.x fixes
 * away from `latest` while 1.x is still the current line.
 *
 * Usage: `tsx scripts/publish-tag.ts <git tag>`. Writes to `$GITHUB_OUTPUT` when set, and
 * always prints what it decided.
 */

import { appendFileSync, readFileSync } from "node:fs"
import { join, dirname } from "node:path"
import { fileURLToPath } from "node:url"
import { spawnSync } from "node:child_process"

import { distTagFor, previousTagFor } from "./publish-line.ts"

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..")

const gitTag = process.argv[2]
if (gitTag === undefined || !/^v\d+\.\d+\.\d+$/.test(gitTag)) {
  console.error(`publish-tag: expected a release tag such as v1.27.3, got ${gitTag ?? "nothing"}`)
  process.exit(1)
}

const local = (
  JSON.parse(readFileSync(join(repoRoot, "packages/functype/package.json"), "utf8")) as { version: string }
).version
if (`v${local}` !== gitTag) {
  console.error(`publish-tag: tag ${gitTag} doesn't match packages/functype's version ${local}`)
  process.exit(1)
}

const view = spawnSync("npm", ["view", "functype", "version"], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] })
if (view.status !== 0) {
  // Guessing `latest` here could hand a 1.x fix the `latest` tag, so stop instead.
  console.error(`publish-tag: \`npm view functype version\` failed:\n${view.stderr}`)
  process.exit(1)
}
const latest = view.stdout.trim()
if (latest === "") {
  // An empty answer is as unknown as a failed one; treating it as "no latest" would pick `latest`.
  console.error("publish-tag: `npm view functype version` printed nothing")
  process.exit(1)
}

const tags = spawnSync("git", ["tag", "--list", "v*"], { cwd: repoRoot, encoding: "utf8" })
if (tags.status !== 0) {
  console.error(`publish-tag: \`git tag --list\` failed:\n${tags.stderr}`)
  process.exit(1)
}

const tag = distTagFor(local, latest)
const outputs = {
  tag,
  latest: String(tag === "latest"),
  previous: previousTagFor(gitTag, tags.stdout.split("\n").filter(Boolean)) ?? "",
}

console.log(`functype ${local} (npm latest ${latest}):`)
for (const [key, value] of Object.entries(outputs)) console.log(`  ${key}=${value}`)

const githubOutput = process.env.GITHUB_OUTPUT
if (githubOutput)
  appendFileSync(
    githubOutput,
    Object.entries(outputs)
      .map(([k, v]) => `${k}=${v}\n`)
      .join(""),
  )
