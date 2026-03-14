import { tsdown } from "ts-builds/tsdown"
import { defineConfig } from "tsdown"

export default defineConfig({
  ...tsdown,
  external: [
    "eslint",
    "@typescript-eslint/eslint-plugin",
    "@typescript-eslint/parser",
    "@typescript-eslint/rule-tester",
    "prettier",
  ],
})
