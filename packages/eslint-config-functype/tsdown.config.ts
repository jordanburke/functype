import type { UserConfig } from "tsdown"

const peerDeps = [
  "eslint",
  "@eslint/eslintrc",
  "@eslint/js",
  "@typescript-eslint/eslint-plugin",
  "@typescript-eslint/parser",
  "eslint-plugin-prettier",
  "eslint-plugin-simple-import-sort",
  "prettier",
]

const library: UserConfig = {
  entry: {
    index: "src/index.ts",
    "configs/recommended": "src/configs/recommended.ts",
    "configs/strict": "src/configs/strict.ts",
    "configs/test-overrides": "src/configs/test-overrides.ts",
    "utils/dependency-validator": "src/utils/dependency-validator.ts",
  },
  format: ["esm"],
  dts: true,
  sourcemap: true,
  clean: true,
  target: "es2020",
  outDir: "dist",
  external: peerDeps,
  outExtensions: () => ({ js: ".js", dts: ".d.ts" }),
}

const cli: UserConfig = {
  entry: {
    "cli/list-rules": "src/cli/list-rules.ts",
  },
  format: ["esm"],
  dts: false,
  sourcemap: true,
  clean: false,
  target: "es2020",
  outDir: "dist",
  external: peerDeps,
  banner: { js: "#!/usr/bin/env node" },
  outExtensions: () => ({ js: ".js", dts: ".d.ts" }),
}

export default [library, cli]
