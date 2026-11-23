// Times every case in one fresh Node process and prints one JSON line: the median ns per operation
// for each implementation. run.mjs starts several of these and combines them. A process times two
// implementations, functype and Effect, never more: a third library in the same process slowed
// functype's few-nanosecond cases by over half.
//
// Each round times every implementation once, and the order rotates every round and with the
// process index, so no library is always the first, warm-cache or after-GC one.
import { pathToFileURL } from "node:url"

import { makeCases } from "./cases.mjs"

const { variants, withEffect, rounds, shift, smoke } = JSON.parse(process.argv[2])

let sink = 0
const consume = (v) => {
  sink = (sink + (typeof v === "number" ? v : 1)) | 0
}
const median = (xs) => [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)]

const E = await import("effect")
const impls = [] // [{ key, cases }]
for (const v of variants) {
  const F = await import(pathToFileURL(`${v.dist}/index.js`).href)
  impls.push({ key: v.key, cases: makeCases(F, E), side: "functype" })
}
if (withEffect) impls.push({ key: "effect", cases: impls[0].cases, side: "effect" })

const fnOf = (impl, index) => impl.cases[index][impl.side]

// Same answers first.
const reference = impls[0].cases
for (let c = 0; c < reference.length; c++) {
  const answers = []
  for (const impl of impls) answers.push(await fnOf(impl, c)(3))
  if (new Set(answers).size !== 1) {
    throw new Error(`${reference[c].name}: answers differ: ${impls.map((m, k) => `${m.key}=${answers[k]}`).join(", ")}`)
  }
}

const timeOnce = async (f, n, async) => {
  const t0 = process.hrtime.bigint()
  if (async) for (let i = 0; i < n; i++) consume(await f(i))
  else for (let i = 0; i < n; i++) consume(f(i))
  return Number(process.hrtime.bigint() - t0) / n
}

// Warm every case in every implementation before timing any, so the first case doesn't pay for the
// JIT tiering up the library code the later cases share.
const warmCount = (ops, async) => (smoke ? 10 : Math.min(ops, async ? 5_000 : 50_000))
for (let pass = 0; pass < (smoke ? 1 : 2); pass++) {
  for (let c = 0; c < reference.length; c++) {
    for (const impl of impls)
      await timeOnce(fnOf(impl, c), warmCount(reference[c].ops, reference[c].async), reference[c].async)
  }
}

const results = {}
for (let c = 0; c < reference.length; c++) {
  const { id, ops, async } = reference[c]
  const n = smoke ? 50 : ops
  const samples = Object.fromEntries(impls.map((impl) => [impl.key, []]))
  const roundCount = smoke ? 1 : rounds
  for (let r = 0; r < roundCount; r++) {
    for (let k = 0; k < impls.length; k++) {
      const impl = impls[(k + r + shift) % impls.length]
      samples[impl.key].push(await timeOnce(fnOf(impl, c), n, async))
    }
  }
  results[id] = Object.fromEntries(Object.entries(samples).map(([key, xs]) => [key, median(xs)]))
}

console.log(JSON.stringify({ results, sink }))
