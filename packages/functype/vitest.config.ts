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

    // Collections freeze each value under NODE_ENV=development (src/internal/freeze.ts). Vitest only sets
    // NODE_ENV=test when it's unset, so a shell with NODE_ENV=development would freeze them here too. Pin it
    // off unless FUNCTYPE_FREEZE is set explicitly; CI runs the suite a second time with FUNCTYPE_FREEZE=1.
    env: { FUNCTYPE_FREEZE: process.env.FUNCTYPE_FREEZE ?? "0" },

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
      // 2026-11-21: statements 85.34%, branches 76.8%, functions 84.86%, lines 86.27%. To raise the floor,
      // run `pnpm -F functype test:coverage`, read the "All files" row, and set each value a point under it.
      thresholds: {
        statements: 84,
        branches: 75,
        functions: 83,
        lines: 85,
      },
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
})
