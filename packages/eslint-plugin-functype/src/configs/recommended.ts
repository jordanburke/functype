/**
 * Severity policy (#325): a rule is `error` once it is right on ~95–99% of real code and its known
 * false-positive classes are closed; it stays `warn` only while those classes are still open. FP here
 * is governance — a rule that is reliably right should fail the build, not print advice nobody reads
 * (CivalaOS shipped 85 new violations under "lint OK" because every rule but `no-let` warned).
 *
 * Still `warn`, and why:
 * - prefer-option / prefer-either / prefer-try: fire on correct code at serialization boundaries
 *   (JSON rows, DTOs) and on throws that are correct (bug checks, host contracts). Wire<T> (#325 B),
 *   invariant() and @interop (#342) close those; graduating them is a measured decision.
 * - prefer-flatmap / prefer-do-notation: heuristics without type information; precision unmeasured.
 *
 * Graduated with a precision condition: prefer-fold checks functype predicate calls (`isSome()`,
 * `isLeft()`) only; its null-check heuristic is opt-in (`checkNullable`) because it fired on plain
 * nullables — 31 of 31 hits in CivalaOS. prefer-map leaves loops to no-imperative-loops (`checkForLoops`
 * off), so one loop is one error.
 *
 * collection-naming is a convention, not a heuristic — functype's Map/Set imported under their own names,
 * the built-in spelled globalThis.Map — so it has no false-positive class and starts at error.
 *
 * no-array-mutation is off here only because turning a new error on in a 1.x minor would fail consumers'
 * builds on upgrade (91 hits across five consumers, every one a real in-place mutation). It's `error` in
 * strict, and planned for `error` here in 2.0. It is type-aware: without type information it reports nothing.
 *
 * no-floating-io (1.17) is off here and `warn` in strict while it is measured: 0 false positives across
 * ~1,340 IO-typed calls in five codebases, but no real hits yet either. 2.0 decides `recommended` after
 * measuring it against functype-os, whose async methods return IO there. Type-aware, like no-array-mutation.
 *
 * no-getOrThrow-in-render and must-fold-on-component-return are React rules: they fire only inside a
 * component (a PascalCase function with JSX) or a hook (`use*`), so non-React code rarely trips them (a
 * non-React function named `use*` is read as a hook). Both are new and unmeasured on real React code, so
 * they start where no-floating-io did: off here, `warn` in strict. They work without type information and
 * are more precise with it.
 */
const recommendedRules = {
  "functype/no-let": "error",
  "functype/no-imperative-loops": "error",
  "functype/prefer-functype-map": "error",
  "functype/prefer-functype-set": "error",
  "functype/prefer-map": "error",
  "functype/prefer-fold": "error",
  "functype/collection-naming": "error",
  "functype/prefer-option": "warn",
  "functype/prefer-either": "warn",
  "functype/prefer-try": "warn",
  "functype/prefer-flatmap": "warn",
  "functype/prefer-do-notation": "warn",
  "functype/no-get-unsafe": "off",
  "functype/prefer-list": "off",
  "functype/no-array-mutation": "off",
  "functype/no-floating-io": "off",
  "functype/no-getOrThrow-in-render": "off",
  "functype/must-fold-on-component-return": "off",
}

export default recommendedRules
