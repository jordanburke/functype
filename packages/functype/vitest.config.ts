import path from "node:path"

import { defineConfig } from "vitest/config"

export default defineConfig({
  test: {
    // Enable multi-threading
    //threads: true,

    // Configure globals
    globals: true,

    // Environment setup
    environment: "node",

    // Include patterns
    include: ["**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}"],

    // Exclude workspace packages (they run their own tests)
    exclude: ["node_modules", "dist", "mcp-server/**", "site/**"],

    // Coverage settings. CI (GitHub sets CI=true) runs the suite once, with coverage on, and fails below
    // the floor; locally `pnpm test` skips coverage, and `pnpm test:coverage` checks the same floor.
    coverage: {
      enabled: process.env.CI === "true",
      provider: "v8",
      reporter: ["text", "json", "html"],
      exclude: ["node_modules/", "dist/", "**/*.d.ts", "**/*.test.{js,ts}", "**/*.config.{js,ts}"],
      // A point under the measured level, rounded down, so run-to-run noise doesn't fail CI. Measured on
      // 2026-11-21: statements 85.05%, branches 76.79%, functions 84.7%, lines 85.92%. To raise the floor,
      // run `pnpm -F functype test:coverage`, read the "All files" row, and set each value a point under it.
      thresholds: {
        statements: 84,
        branches: 75,
        functions: 83,
        lines: 84,
      },
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
})
