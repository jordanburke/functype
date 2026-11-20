import { readFileSync } from "node:fs"

import { tsdown } from "ts-builds/tsdown"
import { defineConfig } from "tsdown"

const pkg = JSON.parse(readFileSync(new URL("./package.json", import.meta.url), "utf-8")) as { version: string }

export default defineConfig({
  ...tsdown,
  external: [
    "eslint",
    "@typescript-eslint/eslint-plugin",
    "@typescript-eslint/parser",
    "@typescript-eslint/rule-tester",
    "prettier",
  ],
  define: {
    __VERSION__: JSON.stringify(pkg.version),
  },
})
