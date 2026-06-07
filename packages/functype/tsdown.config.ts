import { defineConfig } from "tsdown"

const isProduction = process.env.NODE_ENV === "production"

// Build entry points. One entry per published `exports` subpath in package.json —
// every `./x` → `dist/x/index.js` must have a matching entry here, or the subpath
// resolves to an unbuilt file (ERR_MODULE_NOT_FOUND). Kept as an explicit map so a
// new subpath can't silently drift out of the build (see #180).
const entries = {
  index: "src/index.ts",
  "cli/index": "src/cli/index.ts",
  "cli/exports": "src/cli/exports.ts",
  // Core types — entry points target each type's main file (not its barrel index.ts,
  // whose surface intentionally differs, e.g. list/index re-exports LazyList too).
  "option/index": "src/option/Option.ts",
  "either/index": "src/either/Either.ts",
  "try/index": "src/try/Try.ts",
  "list/index": "src/list/List.ts",
  "map/index": "src/map/Map.ts",
  "set/index": "src/set/Set.ts",
  "tuple/index": "src/tuple/Tuple.ts",
  "branded/index": "src/branded/Brand.ts",
  "do/index": "src/do/index.ts",
  "logger/index": "src/logger/Logger.ts",
  // Subpaths advertised in `exports` but previously never built (#180) — each maps to
  // its module barrel, matching what the top barrel re-exports (`export * from "@/io"` …).
  "conditional/index": "src/conditional/index.ts",
  "decoder/index": "src/decoder/index.ts",
  "lazy/index": "src/lazy/index.ts",
  "core/task/index": "src/core/task/index.ts",
  "io/index": "src/io/index.ts",
  "functype/index": "src/functype/index.ts",
  "typeclass/index": "src/typeclass/index.ts",
  "obj/index": "src/obj/index.ts",
  "companion/index": "src/companion/index.ts",
  "serialization/index": "src/serialization/index.ts",
  "util/index": "src/util/index.ts",
  "fetch/index": "src/fetch/index.ts",
}

export default defineConfig({
  entry: entries,
  format: ["esm"],
  dts: true,
  sourcemap: false,
  clean: true,
  minify: isProduction,
  target: "es2020",
  outDir: "dist",
  platform: "neutral",
  treeshake: true,
  outExtensions: () => ({
    js: ".js",
    dts: ".d.ts",
  }),
})
