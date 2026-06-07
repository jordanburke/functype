#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// functype build guard — works around a non-deterministic rolldown renamer bug.
//
// WHY THIS EXISTS
//   rolldown 1.1.0 (the bundler under tsdown) has a non-deterministic renamer
//   race: it can duplicate the shared `Companion` factory across split chunks and
//   emit a use-before-definition reference (`Companion$2 is not defined`) in the
//   output. It fires probabilistically — more often under CPU contention / low
//   core counts (i.e. CI) — and breaks `import { IO } from "functype"` for
//   downstream consumers. Source-shape and chunk-splitting workarounds only lower
//   the probability; they do not eliminate it. The defect is upstream in rolldown.
//
// WHAT IT DOES
//   Runs the real build, then loads EVERY published dist entry in a fresh process.
//   A bad build throws `ReferenceError` at import — the exact signature. On a bad
//   build it rebuilds, up to MAX_ATTEMPTS, until a clean, loadable output exists.
//   It fails (non-zero) if it cannot, so CI never ships a broken bundle.
//
// MONITORING / WHEN TO REMOVE  (see also: scripts/check-build-determinism.mjs)
//   • Each build prints `[build-guard] clean on attempt N`. If N is consistently 1
//     across CI for a while — especially after a rolldown bump — the upstream bug
//     is likely fixed.
//   • When the installed rolldown version differs from KNOWN_BAD_ROLLDOWN below,
//     the guard prints a REEVALUATE notice so the next Dependabot rolldown bump
//     surfaces a prompt to re-test determinism.
//   • To actively re-measure: `pnpm -F functype build:check-determinism`.
//     When it reports 0 failures across the window, this guard can be removed.
//   • REMOVAL: restore `"build": "ts-builds build"` in package.json, delete this
//     file and scripts/check-build-determinism.mjs, and restore the top-barrel
//     re-exports that were trimmed as earlier workarounds (Logger, see src/index.ts).
//   • Tracking: jordanburke/functype#179 (monitoring + removal checklist there).
//     Upstream: file/track at rolldown/rolldown (renamer determinism under
//     code-splitting) and link it from #179.
// ─────────────────────────────────────────────────────────────────────────────

import { execFileSync } from "node:child_process"
import { existsSync, readdirSync } from "node:fs"
import { createRequire } from "node:module"
import { resolve } from "node:path"
import { pathToFileURL } from "node:url"

const MAX_ATTEMPTS = Number(process.env.FUNCTYPE_BUILD_MAX_ATTEMPTS ?? "10")
const KNOWN_BAD_ROLLDOWN = "1.1.0"

const require = createRequire(import.meta.url)

// The emitted entry files (root + one-level module entries), which transitively
// load every shared chunk — where the renamer bug actually lands. The executable
// CLI entry is skipped (importing it would run the CLI).
const distEntries = () => {
  const dist = resolve("dist")
  if (!existsSync(dist)) return []
  const found = []
  if (existsSync(resolve(dist, "index.js"))) found.push(resolve(dist, "index.js"))
  for (const name of readdirSync(dist, { withFileTypes: true })) {
    if (!name.isDirectory() || name.name === "cli") continue
    const entry = resolve(dist, name.name, "index.js")
    if (existsSync(entry)) found.push(entry)
  }
  return found
}

// Verify in a FRESH node process so the ESM module cache can't mask a rebuild.
const verify = () => {
  const probe = distEntries().map((e) => pathToFileURL(e).href)
  if (probe.length === 0) return "build produced no loadable entry files"
  const code = `await Promise.all(${JSON.stringify(probe)}.map((u) => import(u)))`
  try {
    execFileSync(process.execPath, ["--input-type=module", "-e", code], { stdio: ["ignore", "ignore", "pipe"] })
    return null
  } catch (err) {
    return String(err.stderr ?? err.message ?? err)
      .split("\n")
      .slice(0, 4)
      .join("\n")
  }
}

try {
  const rolldownVersion = require("rolldown/package.json").version
  if (rolldownVersion !== KNOWN_BAD_ROLLDOWN) {
    console.warn(
      `[build-guard] rolldown ${rolldownVersion} differs from known-bad ${KNOWN_BAD_ROLLDOWN} — ` +
        `re-test determinism (pnpm -F functype build:check-determinism) and consider removing this guard.`,
    )
  }
} catch {
  /* rolldown not resolvable from here; non-fatal */
}

let lastError
for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
  execFileSync("ts-builds", ["build"], { stdio: "inherit" })
  lastError = verify()
  if (lastError === null) {
    console.log(
      attempt === 1
        ? "[build-guard] clean on attempt 1"
        : `[build-guard] clean on attempt ${attempt} (rolldown renamer race retried ${attempt - 1}x)`,
    )
    process.exit(0)
  }
  console.warn(
    `[build-guard] attempt ${attempt}/${MAX_ATTEMPTS} produced an unloadable build; rebuilding…\n${lastError}`,
  )
}

console.error(
  `[build-guard] FAILED after ${MAX_ATTEMPTS} attempts — every build produced an unloadable bundle.\n` +
    `This is the rolldown renamer race (see this file's header). Last error:\n${lastError}`,
)
process.exit(1)
