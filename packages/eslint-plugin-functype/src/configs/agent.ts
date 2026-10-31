import strictRules from "./strict"

/**
 * The preset for code a coding agent writes. An agent acts on what fails its build and passes over a
 * warning, so this preset has none: every rule is `error` or `off`.
 *
 * `error`: everything `strict` errors on, plus three rules `strict` still warns on while they are
 * measured. no-floating-io has had 0 false positives across ~1,340 IO-typed calls, and the two React
 * rules none across 1,403 files. A forgotten `.run()` or a throw in render is the kind of mistake an
 * agent makes and a human reviewer misses. prefer-option, prefer-either and prefer-try are `error` here
 * as in `strict`: at a real boundary an agent marks it (`@interop <reason>` or `invariant()` for a
 * throw, `Wire<T>` for a data shape) instead of leaving the reader to guess.
 *
 * `off`: prefer-flatmap and prefer-do-notation, whose precision is unmeasured. At `error` they would
 * teach an agent to write `eslint-disable`; each moves to `error` here once it is measured. Also
 * prefer-list: with type-aware linting, its in-place-change case is no-array-mutation's, which is `error`
 * here, and the rest asks for `ReadonlyArray<T>` types, a typing choice `strict` keeps at `warn`.
 *
 * no-array-mutation, no-floating-io, no-floating-result and no-serialize-container are type-aware:
 * without `parserOptions.projectService` they report nothing.
 */
const agentRules = {
  ...strictRules,
  "functype/no-floating-io": "error",
  "functype/no-getOrThrow-in-render": "error",
  "functype/must-fold-on-component-return": "error",
  "functype/no-serialize-container": "error",
  "functype/prefer-flatmap": "off",
  "functype/prefer-do-notation": "off",
  "functype/prefer-list": "off",
}

export default agentRules
