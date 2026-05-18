import recommendedRules from "./recommended"

const strictRules = {
  ...recommendedRules,
  "functype/prefer-option": "error",
  "functype/prefer-either": "error",
  "functype/no-get-unsafe": "error",
  "functype/prefer-list": "warn",
  "functype/prefer-functype-map": "error",
  "functype/prefer-functype-set": "error",
  "functype/no-imperative-loops": "error",
}

export default strictRules
