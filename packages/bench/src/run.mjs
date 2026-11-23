// functype against Effect: times the cases in cases.mjs across several fresh processes, measures
// bundle sizes, and writes one JSON file that functype.org/performance and the home page read.
//
//   node src/run.mjs                          # print a summary
//   node src/run.mjs --out results.json       # also write the results
//   node src/run.mjs --base <dist> --md r.md  # also time another functype build, as a PR comment
//   node src/run.mjs --smoke                  # check every case's answers agree, quickly; writes nothing
//
// Options: --functype <dist> (default ../functype/dist), --processes <n> (5), --rounds <n> (7).
import { execFileSync, spawnSync } from "node:child_process"
import { existsSync, readFileSync, writeFileSync } from "node:fs"
import { cpus, platform, arch } from "node:os"
import { dirname, resolve } from "node:path"
import { fileURLToPath, pathToFileURL } from "node:url"

import { measureBundles } from "./bundles.mjs"
import { makeCases, SETUP } from "./cases.mjs"
import { renderMarkdown } from "./report.mjs"

const here = dirname(fileURLToPath(import.meta.url))

const args = process.argv.slice(2)
const opt = (name, fallback) => {
  const i = args.indexOf(`--${name}`)
  return i >= 0 ? args[i + 1] : fallback
}
const smoke = args.includes("--smoke")
const functypeDist = resolve(opt("functype", resolve(here, "../../functype/dist")))
const baseDist = opt("base") && resolve(opt("base"))
const processes = smoke ? 1 : Number(opt("processes", 5))
const rounds = Number(opt("rounds", 7))

const variants = [{ key: "functype", dist: functypeDist }, ...(baseDist ? [{ key: "base", dist: baseDist }] : [])]
for (const v of variants) {
  if (!existsSync(`${v.dist}/index.js`)) throw new Error(`No build at ${v.dist}: run pnpm -F functype build`)
}

const median = (xs) => [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)]
const spread = (xs) => ({ median: median(xs), min: Math.min(...xs), max: Math.max(...xs) })

// Faster or slower only when every process agrees (by 3%) and the median moves at least 10%. The two
// sides mirror each other: slower uses the reciprocals of faster's thresholds.
const verdict = (ratio) =>
  ratio.min > 1.03 && ratio.median >= 1.1
    ? "faster"
    : ratio.max < 1 / 1.03 && ratio.median <= 1 / 1.1
      ? "slower"
      : "same"

// Each process times two implementations: functype against Effect. With --base, the base build
// is timed against Effect in processes of its own, and the two are compared through Effect: two
// functype builds in one process slowed both builds' few-nanosecond cases by over half.
const work = (spec, p) => {
  const child = spawnSync(
    process.execPath,
    [resolve(here, "worker.mjs"), JSON.stringify({ ...spec, rounds, shift: p, smoke })],
    // Production behaviour, whatever the shell says: functype freezes collections in development.
    { encoding: "utf8", env: { ...process.env, FUNCTYPE_FREEZE: "0" } },
  )
  if (child.status !== 0) throw new Error(`worker ${p} failed:\n${child.stderr}`)
  return JSON.parse(child.stdout.trim().split("\n").at(-1)).results
}
const perProcess = []
const perBaseProcess = []
for (let p = 0; p < processes; p++) {
  perProcess.push(work({ variants: variants.slice(0, 1), withEffect: true }, p))
  if (baseDist) perBaseProcess.push(work({ variants: variants.slice(1), withEffect: true }, p))
  if (!smoke) process.stderr.write(`process ${p + 1} of ${processes} done\n`)
}

// Case code and names come from the module itself, so the published code is the timed code.
const shapes = makeCases(await import(pathToFileURL(`${functypeDist}/index.js`).href), await import("effect"))
const cases = shapes.map((c) => {
  const timings = {
    functype: spread(perProcess.map((r) => r[c.id].functype)),
    effect: spread(perProcess.map((r) => r[c.id].effect)),
    ...(baseDist ? { base: spread(perBaseProcess.map((r) => r[c.id].base)) } : {}),
  }
  const vsEffect = spread(perProcess.map((r) => r[c.id].effect / r[c.id].functype))
  // (Effect / this build) over (Effect / base) is base / this build, measured against the same yardstick.
  const vsBase = baseDist
    ? spread(
        perProcess.map(
          (r, p) => r[c.id].effect / r[c.id].functype / (perBaseProcess[p][c.id].effect / perBaseProcess[p][c.id].base),
        ),
      )
    : undefined
  return {
    id: c.id,
    group: c.group,
    name: c.name,
    async: Boolean(c.async),
    code: { functype: c.functype.toString(), effect: c.effect.toString() },
    ns: timings,
    vsEffect: { ...vsEffect, verdict: verdict(vsEffect) },
    ...(vsBase ? { vsBase: { ...vsBase, verdict: verdict(vsBase) } } : {}),
  }
})

const bundles = await measureBundles(Object.fromEntries(variants.map((v) => [v.key, v.dist])))

const packageVersion = (start, name) => {
  let dir = start
  while (dir !== dirname(dir)) {
    const file = resolve(dir, "package.json")
    if (existsSync(file)) {
      const pkg = JSON.parse(readFileSync(file, "utf8"))
      if (pkg.name === name) return pkg.version
    }
    dir = dirname(dir)
  }
  return "unknown"
}
const gitCommit = () => {
  try {
    return execFileSync("git", ["rev-parse", "HEAD"], { cwd: here, encoding: "utf8" }).trim()
  } catch {
    return "unknown"
  }
}

const results = {
  generated: new Date().toISOString(),
  commit: process.env.GITHUB_SHA ?? gitCommit(),
  machine: {
    cpu: cpus()[0]?.model.trim() ?? "unknown",
    cores: cpus().length,
    os: `${platform()} ${arch()}`,
    ci: process.env.GITHUB_ACTIONS === "true",
  },
  versions: {
    node: process.version,
    functype: packageVersion(functypeDist, "functype"),
    effect: packageVersion(fileURLToPath(import.meta.resolve("effect")), "effect"),
  },
  method: { processes, rounds },
  setup: SETUP,
  cases,
  bundles,
}

if (smoke) {
  console.log(`smoke: ${cases.length} cases agree across functype and Effect; ${bundles.length} bundles built`)
  process.exit(0)
}

const out = opt("out")
if (out) writeFileSync(out, `${JSON.stringify(results, null, 2)}\n`)
const md = opt("md")
if (md) writeFileSync(md, renderMarkdown(results))
if (!out && !md) console.log(renderMarkdown(results))
