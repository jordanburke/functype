// Bundle size: what an app ships for the same small program in each library. esbuild bundles it,
// minified for the browser, and gzip -9 measures it, the same method as functype's size:check.
import { dirname } from "node:path"
import { fileURLToPath } from "node:url"
import { gzipSync } from "node:zlib"

import { build } from "esbuild"

const here = dirname(fileURLToPath(import.meta.url))

/** `{F}` is replaced with the path to a functype dist's root module. */
export const PROGRAMS = [
  {
    id: "option",
    name: "An Option-only app",
    functype: `import { Option } from "{F}"
console.log(Option(1).map((x) => x + 1).getOrElse(() => 0))`,
    effect: `import { Option } from "effect"
console.log(Option.getOrElse(Option.map(Option.some(1), (x) => x + 1), () => 0))`,
  },
  {
    id: "io-app",
    name: "An app with effects, Either, Option and List",
    functype: `import { IO, Either, Option, List } from "{F}"
const p = IO.gen(function* () { const a = yield* IO.succeed(1); return a + 1 }).catchTag("X", () => IO.succeed(0))
console.log(p.runSyncOrThrow(), Either.right(1).map((x) => x), Option(1), List([1]).map((x) => x))`,
    effect: `import { Effect, Result, Option, Array as Arr } from "effect"
const p = Effect.catchTag(Effect.gen(function* () { const a = yield* Effect.succeed(1); return a + 1 }), "X", () => Effect.succeed(0))
console.log(Effect.runSync(p), Result.map(Result.succeed(1), (x) => x), Option.some(1), Arr.map([1], (x) => x))`,
  },
]

const measure = async (contents) => {
  const result = await build({
    stdin: { contents, resolveDir: here, loader: "js" },
    bundle: true,
    minify: true,
    format: "esm",
    platform: "browser",
    write: false,
    logLevel: "silent",
  })
  const code = result.outputFiles[0].contents
  return { minified: code.byteLength, gzipped: gzipSync(code, { level: 9 }).byteLength }
}

/** @param {Record<string, string>} dists functype dist directories by key, such as { functype, base } */
export const measureBundles = async (dists) => {
  const out = []
  for (const program of PROGRAMS) {
    const sizes = {}
    for (const [key, dist] of Object.entries(dists)) {
      sizes[key] = await measure(program.functype.replace("{F}", `${dist}/index.js`))
    }
    sizes.effect = await measure(program.effect)
    out.push({
      id: program.id,
      name: program.name,
      code: { functype: program.functype.replace("{F}", "functype"), effect: program.effect },
      sizes,
    })
  }
  return out
}
