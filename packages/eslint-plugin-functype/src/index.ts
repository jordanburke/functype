import recommendedRules from "./configs/recommended"
import strictRules from "./configs/strict"
import rules from "./rules"

const plugin = {
  rules,
  meta: {
    name: "eslint-plugin-functype",
    version: "2.0.0",
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
}

export default plugin
