import recommendedRules from "./recommended"

const strictRules = {
  ...recommendedRules,
  "functype/prefer-option": "error",
  "functype/prefer-either": "error",
  "functype/no-get-unsafe": "error",
  "functype/prefer-list": "warn",
}

export default strictRules
