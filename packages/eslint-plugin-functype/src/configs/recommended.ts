/**
 * The one preset. Code here is written by coding agents, and an agent acts on what fails its build
 * and passes over a warning, so every rule is `error` or `off`, never `warn`. A rule is `error` once it
 * is right on ~95–99% of real code with its known false-positive classes closed (#325); until it is
 * measured, it is `off`, because at `error` it would teach an agent to write `eslint-disable`.
 *
 * In 1.x this was `agent`; `recommended` and `strict` warned on rules still being measured. 2.0 has
 * one preset, and tests.ts relaxes it for test files.
 *
 * `off`, and why:
 * - prefer-flatmap / prefer-do-notation: heuristics without type information; precision unmeasured.
 *
 * `error`, with what it was measured on:
 * - prefer-fold checks functype predicate calls (`isSome()`, `isLeft()`), and guards followed by an
 *   unwrap (`checkGuards`): a pass-through guard is a hand-written flatMap. Its null-check heuristic
 *   is opt-in (`checkNullable`) because it fired on plain nullables: 31 of 31 hits in a private app
 *   monorepo. Inside a React component, a guard followed by an unwrap is also reported by
 *   must-fold-on-component-return.
 * - prefer-map leaves loops to no-imperative-loops (`checkForLoops` off), so one loop is one error.
 * - collection-naming is a convention, not a heuristic, so it has no false-positive class.
 * - no-array-mutation: 91 hits across five consumers, every one a real in-place mutation.
 * - prefer-list: about 96% precise on five consumers (#362). Supabase's generated types are skipped
 *   by shape. A local array changed by a method or an index write is reported once, by
 *   no-array-mutation; a mutated field is still reported by both.
 * - prefer-option / prefer-either / prefer-try: at a real boundary the code marks it instead
 *   (`@interop <reason>` or `invariant()` for a throw, `Wire<T>` for a data shape).
 * - no-floating-io: 0 false positives across ~1,340 IO-typed calls in five codebases.
 * - no-floating-result: on agent-todo's API it found the 20 drops that project fixed by hand as real
 *   bugs, and in functype it found an async `bracket` that dropped a failed release.
 * - no-serialize-container: 4 calls on agent-todo's API, each a bug that project fixed.
 * - no-uncalled-method: 0 hits on 1,126 files of seven consumers on 1.x and 2.x; it finds the
 *   `Option(list.head)` a published library shipped against 2.0 (#603).
 * - no-container-mutation: 0 hits on 1,128 files of seven consumers. A write to a functype value
 *   needs a cast, and since 2.2 nothing else stops it: collections no longer freeze each value.
 * - no-getOrThrow-in-render and must-fold-on-component-return fire only inside a React component or
 *   hook, and reported nothing on 1,403 files of React code.
 * - no-get-unsafe: an unwrap outside an `@interop` boundary; allowed in test files.
 *
 * no-array-mutation, no-floating-io, no-floating-result, no-serialize-container, no-uncalled-method
 * and no-container-mutation are type-aware:
 * without `parserOptions.projectService` they report nothing.
 */
const recommendedRules = {
  "functype/no-let": "error",
  "functype/no-imperative-loops": "error",
  "functype/prefer-functype-map": "error",
  "functype/prefer-functype-set": "error",
  "functype/prefer-map": "error",
  "functype/prefer-fold": ["error", { checkGuards: true }],
  "functype/collection-naming": "error",
  "functype/prefer-list": "error",
  "functype/no-array-mutation": "error",
  "functype/prefer-option": "error",
  "functype/prefer-either": "error",
  "functype/prefer-try": "error",
  "functype/no-get-unsafe": "error",
  "functype/no-floating-io": "error",
  "functype/no-floating-result": "error",
  "functype/no-serialize-container": "error",
  "functype/no-uncalled-method": "error",
  "functype/no-container-mutation": "error",
  "functype/no-getOrThrow-in-render": "error",
  "functype/must-fold-on-component-return": "error",
  "functype/prefer-flatmap": "off",
  "functype/prefer-do-notation": "off",
}

export default recommendedRules
