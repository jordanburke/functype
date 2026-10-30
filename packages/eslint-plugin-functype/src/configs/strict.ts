import recommendedRules from "./recommended"

const strictRules = {
  ...recommendedRules,
  "functype/prefer-option": "error",
  "functype/prefer-either": "error",
  "functype/prefer-try": "error",
  "functype/no-get-unsafe": "error",
  "functype/prefer-list": "warn",
  "functype/no-array-mutation": "error",
  "functype/no-floating-io": "warn",
  "functype/no-floating-result": "error",
  "functype/no-getOrThrow-in-render": "warn",
  "functype/must-fold-on-component-return": "warn",
  "functype/prefer-functype-map": "error",
  "functype/prefer-functype-set": "error",
  "functype/no-imperative-loops": "error",
}

export default strictRules
