import { defineConfig } from "tsup"

const isProduction = process.env.NODE_ENV === "production"

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm"], // Only ESM now
  dts: true,
  sourcemap: isProduction,
  clean: true,
  minify: isProduction,
  bundle: true,
  target: "es2020",
  outDir: "dist",
  platform: "neutral",
  treeshake: true,
  outExtension: () => ({
    js: ".mjs",
  }),
})
