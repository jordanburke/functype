import type { Option } from "functype"
import { Option as OptionCompanion } from "functype"

/**
 * A database call failed: a driver error, a constraint violation, a lost connection, or a
 * transaction that couldn't begin or commit.
 *
 * `code` is the driver's error code when it has one: the SQLSTATE on Postgres (`"23505"`), the
 * error name on MySQL (`"ER_DUP_ENTRY"`) and SQLite (`"SQLITE_CONSTRAINT_UNIQUE"`). `message` is
 * the driver's text, which can carry table names and values, so keep it out of anything a user
 * sees. `cause` is the original error.
 */
export type DbError = {
  readonly _tag: "DbError"
  readonly code: Option<string>
  readonly message: string
  readonly cause: unknown
}

const codeOf = (e: unknown): Option<string> => {
  if (typeof e !== "object" || e === null || !("code" in e)) return OptionCompanion.none()
  const { code } = e
  return typeof code === "string" ? OptionCompanion(code) : OptionCompanion.none()
}

const messageOf = (e: unknown): string => (e instanceof Error ? e.message : String(e))

/** Turns whatever a Kysely call threw into a {@link DbError}. */
export const toDbError = (e: unknown): DbError => ({
  _tag: "DbError",
  code: codeOf(e),
  message: messageOf(e),
  cause: e,
})

const UNIQUE_VIOLATION_CODES: ReadonlySet<string> = new Set(["23505", "ER_DUP_ENTRY", "SQLITE_CONSTRAINT_UNIQUE"])

/**
 * True when the error is a unique-constraint violation: SQLSTATE `23505` on Postgres,
 * `ER_DUP_ENTRY` on MySQL, `SQLITE_CONSTRAINT_UNIQUE` on SQLite.
 *
 * @example
 * ```ts
 * createUser(input).recoverWith((e) => (isUniqueViolation(e) ? IO.fail(emailTaken()) : IO.fail(e)))
 * ```
 */
export const isUniqueViolation = (error: DbError): boolean =>
  error.code.fold(
    () => false,
    (code) => UNIQUE_VIOLATION_CODES.has(code),
  )
