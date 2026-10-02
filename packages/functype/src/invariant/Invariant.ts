/**
 * The error `invariant()` throws: a programmer error, never an expected failure. Tagged so a top-level
 * handler can tell "a bug fired" apart from a failure that should have been an `Either`.
 */
export type InvariantViolation = Error & {
  readonly name: "InvariantViolation"
  readonly _tag: "InvariantViolation"
}

/**
 * Builds an {@link InvariantViolation}. Use it directly where a branch can only be reached by a bug and
 * there is no condition to assert, e.g. `throw InvariantViolation("unreachable: unknown variant")`.
 */
export const InvariantViolation = (message: string): InvariantViolation =>
  Object.assign(new Error(message), {
    name: "InvariantViolation" as const,
    _tag: "InvariantViolation" as const,
  })

/**
 * Asserts a condition that can only be false because of a bug, and narrows it for the code after it.
 *
 * Expected failures return `Either`; `invariant` is for the other kind — "upsert returned no row",
 * "step must be non-negative", "AUTH_PROVIDER is required in production". It covers one statement, so a
 * function can mix bug checks with `Either`-returning failure paths, and `functype/prefer-either` never
 * sees a `throw` to report.
 *
 * ```ts
 * invariant(row, "upsert returned no row")          // row: Row from here on
 * invariant(teamDomain && aud, "requires CF_ACCESS_TEAM_DOMAIN and CF_ACCESS_AUD")
 * invariant(n >= 0, () => `step must be non-negative, got ${n}`)  // message built only on failure
 * ```
 *
 * @param condition - Must be truthy. Narrowed to truthy after the call.
 * @param message - The error message, or a thunk that builds it only when the check fails.
 * @throws {@link InvariantViolation} when `condition` is falsy.
 */
export function invariant(condition: unknown, message: string | (() => string)): asserts condition {
  if (!condition) {
    throw InvariantViolation(typeof message === "function" ? message() : message)
  }
}
