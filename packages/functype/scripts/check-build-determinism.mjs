#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// Determinism monitor for the rolldown renamer bug guarded by build-verified.mjs.
//
// Builds functype N times and reports how often the output is unloadable
// (`Companion$2 is not defined` and friends). Use it to decide whether the
// build-guard is still needed — e.g. after a rolldown/tsdown bump:
//
//   pnpm -F functype build:check-determinism            # default N, native cores
//   ITER=30 pnpm -F functype build:check-determinism    # more samples
//
// The bug is contention-sensitive, so on a many-core dev box it may rarely fire.
// To approximate a CI runner (where it fires reliably), constrain cores/threads:
//
//   RAYON_NUM_THREADS=4 taskset -c 0-3 ITER=20 pnpm -F functype build:check-determinism
//
// REMOVE the guard once this reports 0 failures across a representative window
// (ideally under the constrained invocation above) on a fixed rolldown version.
// ─────────────────────────────────────────────────────────────────────────────

import { execFileSync } from "node:child_process"
import { existsSync, readdirSync, rmSync } from "node:fs"
import { resolve } from "node:path"
import { pathToFileURL } from "node:url"

const ITER = Number(process.env.ITER ?? "20")

// Emitted entry files (root + one-level module entries, minus the executable CLI),
// which transitively load every shared chunk where the renamer bug lands.
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

const loads = () => {
  const probe = distEntries().map((e) => pathToFileURL(e).href)
  if (probe.length === 0) return false
  const code = `await Promise.all(${JSON.stringify(probe)}.map((u) => import(u)))`
  try {
    execFileSync(process.execPath, ["--input-type=module", "-e", code], { stdio: "ignore" })
    return true
  } catch {
    return false
  }
}

let broken = 0
for (let i = 1; i <= ITER; i++) {
  rmSync(resolve("dist"), { recursive: true, force: true })
  execFileSync("ts-builds", ["build"], { stdio: "ignore" })
  const ok = loads()
  if (!ok) broken++
  process.stdout.write(ok ? "." : "x")
}

const rate = ((broken / ITER) * 100).toFixed(0)
console.log(`\n[determinism] ${broken}/${ITER} builds unloadable (${rate}%).`)
console.log(
  broken === 0
    ? "[determinism] 0 failures — if this holds across a window, the build-guard can be removed."
    : "[determinism] rolldown renamer race still present — build-guard is still required.",
)
process.exit(0)
