import recommendedRules from "./recommended"

/**
 * recommended, with the rules that still fire on some correct code at `error`.
 *
 * prefer-fold also checks guards here (`checkGuards`): `if (e.isLeft()) return …` followed by an unwrap.
 * A pass-through guard is a hand-written flatMap. A guard that returns a fallback is closer to a style
 * choice, since TypeScript narrows `Either` after it, so `recommended` leaves this check off.
 */
const strictRules = {
  ...recommendedRules,
  "functype/prefer-fold": ["error", { checkGuards: true }],
  "functype/prefer-option": "error",
  "functype/prefer-either": "error",
  "functype/prefer-try": "error",
  "functype/no-get-unsafe": "error",
  "functype/no-floating-io": "warn",
  "functype/no-floating-result": "error",
  "functype/no-serialize-container": "error",
  "functype/no-getOrThrow-in-render": "warn",
  "functype/must-fold-on-component-return": "warn",
  "functype/prefer-functype-map": "error",
  "functype/prefer-functype-set": "error",
  "functype/no-imperative-loops": "error",
}

export default strictRules
