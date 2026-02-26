import { defineConfig, mergeConfig } from "vitest/config"
import baseConfig from "ts-builds/vitest"

export default mergeConfig(baseConfig, defineConfig({}))
