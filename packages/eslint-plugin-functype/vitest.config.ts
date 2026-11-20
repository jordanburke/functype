import { readFileSync } from "node:fs"

import { defineConfig, mergeConfig } from "vitest/config"
import baseConfig from "ts-builds/vitest"

const pkg = JSON.parse(readFileSync(new URL("./package.json", import.meta.url), "utf-8")) as { version: string }

export default mergeConfig(baseConfig, defineConfig({ define: { __VERSION__: JSON.stringify(pkg.version) } }))
