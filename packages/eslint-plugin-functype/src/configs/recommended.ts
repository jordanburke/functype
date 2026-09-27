/**
 * Severity policy (#325): a rule is `error` once it is right on ~95–99% of real code and its known
 * false-positive classes are closed; it stays `warn` only while those classes are still open. FP here
 * is governance — a rule that is reliably right should fail the build, not print advice nobody reads
 * (CivalaOS shipped 85 new violations under "lint OK" because every rule but `no-let` warned).
 *
 * Still `warn`, and why:
 * - prefer-option / prefer-either / prefer-try: fire on correct code at serialization boundaries
 *   (JSON rows, DTOs) and on documented invariant throws — #325 B/D close those.
 * - prefer-flatmap / prefer-do-notation: heuristics without type information; precision unmeasured.
 *
 * Graduated with a precision condition: prefer-fold checks functype predicate calls (`isSome()`,
 * `isLeft()`) only; its null-check heuristic is opt-in (`checkNullable`) because it fired on plain
 * nullables — 31 of 31 hits in CivalaOS. prefer-map leaves loops to no-imperative-loops (`checkForLoops`
 * off), so one loop is one error.
 */
const recommendedRules = {
  "functype/no-let": "error",
  "functype/no-imperative-loops": "error",
  "functype/prefer-functype-map": "error",
  "functype/prefer-functype-set": "error",
  "functype/prefer-map": "error",
  "functype/prefer-fold": "error",
  "functype/prefer-option": "warn",
  "functype/prefer-either": "warn",
  "functype/prefer-try": "warn",
  "functype/prefer-flatmap": "warn",
  "functype/prefer-do-notation": "warn",
  "functype/no-get-unsafe": "off",
  "functype/prefer-list": "off",
}

export default recommendedRules
