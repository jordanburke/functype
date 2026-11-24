// Bundles small consumer programs against the built dist and fails when one outgrows its ceiling.
//
// What an app ships depends on how well its bundler can drop the parts of functype it doesn't use,
// so this measures that directly: esbuild, minified for the browser, then gzip -9. A dist that
// tree-shakes badly (for example, every type in one shared chunk) fails here even when no single
// file grew.
//
// Usage: tsx scripts/check-bundle-size.ts [--report <file.md>]
import { writeFileSync } from "node:fs"
import { dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"
import { gzipSync } from "node:zlib"

import { build } from "esbuild"

const packageDir = resolve(dirname(fileURLToPath(import.meta.url)), "..")

type Program = {
  readonly name: string
  readonly source: string
  // Gzipped bytes. Each sits about 15% above the size measured when it was set; raise one only on
  // purpose, and say why in the PR.
  readonly ceiling: number
}

const programs: readonly Program[] = [
  {
    name: "Option only, from functype/option",
    source: `import { Option } from "./dist/option/index.js"
console.log(Option(1).map((x) => x + 1).getOrElse(() => 0))`,
    ceiling: 6_500,
  },
  {
    name: "Option only, from functype/core",
    source: `import { Option } from "./dist/core/index.js"
console.log(Option(1).map((x) => x + 1).getOrElse(() => 0))`,
    ceiling: 6_500,
  },
  {
    name: "Option only, from the root import",
    source: `import { Option } from "./dist/index.js"
console.log(Option(1).map((x) => x + 1).getOrElse(() => 0))`,
    ceiling: 6_500,
  },
  {
    name: "IO.gen, catchTag and runSync, plus Either, Option and List",
    source: `import { IO, Either, Option, List } from "./dist/index.js"
const p = IO.gen(function* () { const a = yield* IO.succeed(1); return a + 1 }).catchTag("X", () => IO.succeed(0))
console.log(p.runSyncOrThrow(), Either.right(1).map((x) => x), Option(1), List([1]).map((x) => x))`,
    ceiling: 13_500,
  },
]

const measure = async (program: Program): Promise<{ minified: number; gzipped: number }> => {
  const result = await build({
    stdin: { contents: program.source, resolveDir: packageDir, loader: "js" },
    bundle: true,
    minify: true,
    format: "esm",
    platform: "browser",
    write: false,
    logLevel: "silent",
  })
  const code = result.outputFiles[0]?.contents ?? new Uint8Array()
  return { minified: code.byteLength, gzipped: gzipSync(code, { level: 9 }).byteLength }
}

const kb = (bytes: number): string => `${(bytes / 1000).toFixed(1)} KB`

const results = await Promise.all(programs.map(async (program) => ({ program, ...(await measure(program)) })))

const table = [
  "| Program | Minified | Gzipped | Ceiling (gzipped) |",
  "| --- | --: | --: | --: |",
  ...results.map(
    ({ program, minified, gzipped }) =>
      `| ${program.name} | ${kb(minified)} | ${kb(gzipped)} | ${kb(program.ceiling)}${gzipped > program.ceiling ? " ❌" : ""} |`,
  ),
].join("\n")

console.log(table)

const reportIndex = process.argv.indexOf("--report")
const reportPath = reportIndex === -1 ? undefined : process.argv[reportIndex + 1]
if (reportPath !== undefined) {
  writeFileSync(
    resolve(packageDir, reportPath),
    `# Bundle size (packages/functype)\n\nEach program bundled with esbuild, minified for the browser, then gzip -9. 1 KB is 1,000 bytes.\n\n${table}\n`,
  )
}

const over = results.filter(({ program, gzipped }) => gzipped > program.ceiling)
if (over.length > 0) {
  console.error(
    `\n${over.length} program(s) over their ceiling. Check that dist still builds one file per module (unbundle in tsdown.config.ts) and that no module gained a top-level side effect.`,
  )
  process.exit(1)
}
