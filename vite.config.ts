import path from "path"
import { defineConfig } from "vite"
import dts from "vite-plugin-dts"

const modules = ["option", "either", "try", "list", "fpromise", "map", "set", "tuple", "branded"]

// Create entry points for each module, matching the tsup config logic
const entries = {
  index: path.resolve(__dirname, "src/index.ts"),
  ...Object.fromEntries(
    modules.map((module) => {
      if (module === "task") {
        return [`core/task/index`, path.resolve(__dirname, `src/core/task/Task.ts`)]
      }
      if (module === "fpromise") {
        return [`${module}/index`, path.resolve(__dirname, `src/${module}/FPromise.ts`)]
      }
      if (module === "branded") {
        return [`${module}/index`, path.resolve(__dirname, `src/${module}/Brand.ts`)]
      }
      const modPath = module.includes("/") ? module : `${module}/${module.charAt(0).toUpperCase() + module.slice(1)}`
      return [`${module}/index`, path.resolve(__dirname, `src/${modPath}.ts`)]
    }),
  ),
}

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
  build: {
    lib: {
      entry: entries,
      formats: ["es"],
      fileName: (format, entryName) => `${entryName}.mjs`,
    },
    outDir: "dist",
    target: "es2020",
    sourcemap: process.env.NODE_ENV === "production",
    minify: process.env.NODE_ENV === "production",
    rollupOptions: {
      // Keep the output structure similar to tsup
      input: entries,
      output: {
        entryFileNames: "[name].mjs",
        chunkFileNames: "[name]-[hash].mjs",
        assetFileNames: "[name].[ext]",
        format: "es",
      },
      treeshake: true,
    },
    emptyOutDir: true,
  },
  plugins: [
    dts({
      entryRoot: "src",
      outDir: "dist",
      rollupTypes: false,
      exclude: ["test", "**/*.spec.ts"],
    }),
  ],
})
