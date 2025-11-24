import { defineConfig } from "tsdown"

const isProduction = process.env.NODE_ENV === "production"

// Define the modules we want to expose as separate entry points
const modules = ["option", "either", "try", "list", "fpromise", "map", "set", "tuple", "branded", "do"]

// Create entry points for each module
const entries = {
  index: "src/index.ts",
  ...Object.fromEntries(
    modules.map((module) => {
      // Special case for task which is in core/task
      if (module === "task") {
        return [`core/task/index`, `src/core/task/Task.ts`]
      }
      // Special case for fpromise (casing issue)
      if (module === "fpromise") {
        return [`${module}/index`, `src/${module}/FPromise.ts`]
      }
      // Special case for branded module
      if (module === "branded") {
        return [`${module}/index`, `src/${module}/Brand.ts`]
      }
      // Special case for do module (just index.ts)
      if (module === "do") {
        return [`${module}/index`, `src/${module}/index.ts`]
      }
      // Handle regular modules
      const path = module.includes("/") ? module : `${module}/${module.charAt(0).toUpperCase() + module.slice(1)}`
      return [`${module}/index`, `src/${path}.ts`]
    }),
  ),
}

export default defineConfig({
  entry: entries,
  format: ["esm"],
  dts: true,
  sourcemap: isProduction,
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
