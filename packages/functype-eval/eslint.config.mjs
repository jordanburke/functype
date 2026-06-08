import baseConfig from "ts-builds/eslint-functype"

export default [
  ...baseConfig,
  {
    // functype-eval is a static-analysis tool with ZERO functype runtime dependency by design — it
    // scores code that *uses* functype but must not require functype itself (so consumers don't pull
    // it in transitively). The "prefer the functype API" rules therefore don't apply to its own
    // source; we still keep no-let / no-imperative-loops, which need no runtime dependency.
    rules: {
      "functype/prefer-option": "off",
      "functype/prefer-either": "off",
      "functype/prefer-fold": "off",
      "functype/prefer-map": "off",
      "functype/prefer-flatmap": "off",
      "functype/prefer-list": "off",
      "functype/prefer-functype-map": "off",
      "functype/prefer-functype-set": "off",
      "functype/prefer-do-notation": "off",
      "functype/no-get-unsafe": "off",
    },
  },
]
