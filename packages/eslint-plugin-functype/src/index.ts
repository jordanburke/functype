import agentRules from "./configs/agent"
import recommendedRules from "./configs/recommended"
import strictRules from "./configs/strict"
import testRules, { testFiles } from "./configs/tests"
import rules from "./rules"

/** Set from package.json at build time by tsdown.config.ts, and in tests by vitest.config.ts. */
declare const __VERSION__: string

const plugin = {
  rules,
  meta: {
    name: "eslint-plugin-functype",
    version: typeof __VERSION__ === "undefined" ? "0.0.0-dev" : __VERSION__,
  },
  configs: {} as Record<string, unknown>,
}

// Self-referencing plugin in configs (ESLint flat config pattern)
plugin.configs = {
  recommended: {
    name: "functype-plugin/recommended",
    plugins: { functype: plugin },
    rules: recommendedRules,
  },
  strict: {
    name: "functype-plugin/strict",
    plugins: { functype: plugin },
    rules: strictRules,
  },
  agent: {
    name: "functype-plugin/agent",
    plugins: { functype: plugin },
    rules: agentRules,
  },
  tests: {
    name: "functype-plugin/tests",
    plugins: { functype: plugin },
    files: testFiles,
    rules: testRules,
  },
}

export default plugin
