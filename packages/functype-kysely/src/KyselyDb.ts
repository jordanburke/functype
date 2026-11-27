import type { IOType, TagType } from "functype"
import { IO, Option, Tag } from "functype"
import type { ControlledTransaction, Kysely } from "kysely"
import { sql } from "kysely"

import type { DbError } from "./DbError"
import { toDbError } from "./DbError"
import type { Scope } from "./Scope"
import {
  childHandle,
  lockedQuery,
  markFailed,
  QUERY_FAILED,
  RELEASED_THEN_GIVEN_UP,
  SAVEPOINT_ROLLBACK_FAILED,
  scopeOf,
  withLock,
} from "./Scope"

/**
 * A Kysely database as a functype service: a {@link TagType | Tag} to provide it under, queries
 * that return IO, and transactions that wrap an IO program.
 *
 * Make one per database with {@link KyselyDb}, and provide the `Kysely` instance once, at the edge:
 * `program.provideService(Db.tag, db).run()`.
 */
export type KyselyDb<DB> = {
  /** The service tag. Provide a `Kysely<DB>` under it. */
  readonly tag: TagType<Kysely<DB>>

  /**
   * Runs one Kysely call as an IO. A throw becomes a typed {@link DbError}, or `toError`'s value.
   *
   * `f` gets the current database, which is the open transaction inside
   * {@link KyselyDb.transaction}, and the run's abort signal. Pass the signal to `execute` so a
   * cancelled run stops waiting for the query; Kysely's `inflightQueryAbortStrategy` decides
   * whether the server cancels it too.
   *
   * @example
   * ```ts
   * const findUser = (id: string) =>
   *   Db.query((db, signal) => db.selectFrom("user").selectAll().where("id", "=", id).executeTakeFirst({ signal }))
   * ```
   */
  readonly query: {
    <A>(f: (db: Kysely<DB>, signal?: AbortSignal) => Promise<A>): IOType<Kysely<DB>, DbError, A>
    <A, E>(
      f: (db: Kysely<DB>, signal?: AbortSignal) => Promise<A>,
      toError: (error: unknown) => E,
    ): IOType<Kysely<DB>, E, A>
  }

  /**
   * Runs `program` in a transaction. It commits when `program` succeeds. It rolls back when
   * `program` fails with its own error, dies, or is cancelled, and that outcome passes through
   * unchanged. A failure to begin or commit is a {@link DbError}.
   *
   * Inside, every `Db.query` and `IO.service(Db.tag)` sees the transaction, so the steps are
   * ordinary IO: compose them with `flatMap` and `IO.gen`, and fail with your own typed errors;
   * nothing needs to throw to roll back.
   *
   * **A failed or abandoned query can't be recovered in place.** Postgres aborts a transaction on
   * any failed statement, and its COMMIT then rolls back without an error; a write a `timeout` gave
   * up on may still land. So when a `Db.query` fails, or a timeout or cancel gives up on it, and the
   * program carries on, the commit fails with a {@link DbError} rather than report a commit that
   * didn't happen. Run a query you may need to recover from in a nested `transaction`.
   *
   * **Steps run one at a time.** The transaction is one connection: its queries, nested
   * transactions and commit wait for each other, even under `IO.all`.
   *
   * Both rules cover `Db.query` only. Any rejection of its function counts as a failed query,
   * except Kysely's `NoResultError`, after which the commit first checks the transaction with
   * `select 1`. A statement run on the handle directly, or on one derived from
   * it with `withSchema` or `withPlugin`, isn't serialized or checked.
   *
   * **Nesting uses a savepoint.** A `transaction` inside another one opens a savepoint, not a
   * second transaction. When the inner program fails, its writes roll back to the savepoint and the
   * outer transaction stays usable, so an outer `recover` can carry on. This needs a dialect with
   * `SAVEPOINT` (Postgres, MySQL, SQLite; not MSSQL).
   *
   * **A cancel waits for the query in flight.** A cancelled run stops before its next step and rolls
   * back once the current query settles. A nested transaction that a `timeout` or `race` gave up on
   * still finishes its rollback before the outer transaction's next step; if it was given up on
   * after its savepoint was released, the outer commit is refused instead. A commit that has
   * already started when the run is cancelled still commits, though the run reports the cancel.
   *
   * The provided service can also be a transaction you opened with Kysely itself, such as the
   * `trx` in `db.transaction().execute(callback)`. Then `transaction` opens a savepoint in it, but
   * Kysely owns the commit, so neither the one-at-a-time lock nor the refused commit covers it.
   *
   * Inside a nested transaction, don't re-provide an outer handle captured earlier: the nested
   * transaction holds the outer one's lock, so a query on it waits forever.
   *
   * @example
   * ```ts
   * const transfer = (from: string, to: string, amount: number) =>
   *   Db.transaction(
   *     IO.gen(function* () {
   *       const balance = yield* balanceOf(from)
   *       if (balance < amount) return yield* IO.fail(insufficientFunds(from))
   *       yield* debit(from, amount)
   *       yield* credit(to, amount)
   *     }),
   *   )
   * // IO<Kysely<Database>, DbError | InsufficientFunds, void>
   * ```
   */
  readonly transaction: <R, E, A>(program: IOType<R, E, A>) => IOType<R | Kysely<DB>, E | DbError, A>
}

/** The parts of a controlled transaction this module calls. */
type Controlled<DB> = Kysely<DB> & {
  readonly isCommitted: boolean
  readonly isRolledBack: boolean
  readonly commit: () => { readonly execute: () => Promise<void> }
  readonly rollback: () => { readonly execute: () => Promise<void> }
}

const controlled = <DB>(trx: ControlledTransaction<DB>): Controlled<DB> => trx as unknown as Controlled<DB>

/**
 * Savepoints are issued as SQL rather than through Kysely's `savepoint()`, which only a controlled
 * transaction has and some drivers (PGlite's) don't implement. Postgres, MySQL and SQLite share
 * this syntax.
 */
const savepointSql = <DB>(
  trx: Kysely<DB>,
  command: "savepoint" | "release savepoint" | "rollback to savepoint",
  name: string,
) => sql`${sql.raw(command)} ${sql.id(name)}`.execute(trx)

const step = <A>(f: () => Promise<A>): IOType<never, DbError, A> => IO.tryAsync(f, toDbError)

/**
 * A rollback after the program already failed. Its own failure is dropped so the program's outcome
 * stands; Kysely frees the connection either way. `onFailure` notes the lost rollback.
 */
const rollbackQuietly = (
  f: () => Promise<unknown>,
  onFailure: () => void = () => undefined,
): IOType<never, never, void> =>
  IO.async(f)
    .map(() => undefined)
    .recoverWith(() => IO.sync(onFailure))

const refused = (message: string): DbError => ({ _tag: "DbError", code: Option.none(), message, cause: undefined })

/** What a commit fails with when a query in its scope failed, or was given up on, and the program carried on. */
export const recoveredQueryError = (): DbError => refused(QUERY_FAILED)

/**
 * After a `NoResultError`, checks that the transaction still runs statements: an aborted Postgres
 * transaction rejects `select 1`.
 */
const healthCheck = <DB>(scope: Scope, handle: Kysely<DB>): IOType<never, DbError, void> =>
  scope.check.value
    ? IO.tryAsync(
        () => sql`select 1`.execute(handle),
        () => refused(QUERY_FAILED),
      ).map(() => undefined)
    : IO.succeed(undefined)

/** Commits, or releases a savepoint, unless something on the scope went wrong. */
const finish = <DB>(scope: Scope, handle: Kysely<DB>, f: () => Promise<unknown>): IOType<never, DbError, void> =>
  IO.sync(() => scope.failed.value).flatMap((failed) =>
    failed.fold(
      () => healthCheck(scope, handle).flatMap(() => step(f).map(() => undefined)),
      (reason) => IO.fail(refused(reason)),
    ),
  )

/**
 * IO's type parameters are invariant, so an IO that needs fewer services or fails in fewer ways
 * doesn't widen on its own. Widening is sound: such an IO fits anywhere the wider one does.
 */
const widen = <R, E, A>(io: object): IOType<R, E, A> => io as IOType<R, E, A>

const savepointName = (): string => `functype_sp_${Math.random().toString(36).slice(2, 10)}`

/**
 * Makes the {@link KyselyDb} service for one database.
 *
 * @param name - names the service, `"Db"` by default. Its tag's id is `functype-kysely:<name>`,
 * so two databases need two names.
 *
 * @example
 * ```ts
 * import { KyselyDb } from "functype-kysely"
 *
 * export const Db = KyselyDb<Database>()
 *
 * const program = Db.transaction(createOrder(input))
 * const result = await program.provideService(Db.tag, db).run()
 * ```
 */
export const KyselyDb = <DB>(name = "Db"): KyselyDb<DB> => {
  const tag = Tag<Kysely<DB>>(`functype-kysely:${name}`)

  const query = <A, E>(
    f: (db: Kysely<DB>, signal?: AbortSignal) => Promise<A>,
    toError?: (error: unknown) => E,
  ): IOType<Kysely<DB>, E | DbError, A> =>
    IO.service(tag).flatMap((db) => {
      const mapError = toError ?? ((e: unknown): E | DbError => toDbError(e))
      if (!db.isTransaction) return IO.tryAsync((signal) => f(db, signal), mapError)
      return lockedQuery(scopeOf(db), (signal) => f(db, signal), mapError)
    })

  const inTopLevel = <R, E, A>(db: Kysely<DB>, program: IOType<R, E, A>): IOType<R, E | DbError, A> =>
    IO.bracketExit(
      widen<R, E | DbError, Controlled<DB>>(step(() => db.startTransaction().execute()).map((t) => controlled<DB>(t))),
      (trx) =>
        widen<R, E | DbError, A>(
          program.provideService(tag, trx).flatMap((a) =>
            withLock(
              scopeOf(trx),
              finish(scopeOf(trx), trx, () => trx.commit().execute()),
            ).map(() => a),
          ),
        ),
      (trx) =>
        widen<R, never, void>(
          trx.isCommitted || trx.isRolledBack
            ? IO.succeed(undefined)
            : withLock(
                scopeOf(trx),
                rollbackQuietly(() => trx.rollback().execute()),
              ),
        ),
    )

  const inSavepoint = <R, E, A>(parent: Kysely<DB>, program: IOType<R, E, A>): IOType<R, E | DbError, A> => {
    const parentScope = scopeOf(parent)
    const inner = childHandle(parent)
    const innerScope = scopeOf(inner)
    const savepoint = savepointName()
    // Set once RELEASE SAVEPOINT succeeds. A cancel can still land after it, and then there is no
    // savepoint left to roll back to: its writes are already the parent's.
    const released = { value: false }
    // Release and rollback take the savepoint's own lock, so they wait for a query in it that a
    // timeout gave up on: its write lands before the rollback, which then undoes it.
    const rollback = (): IOType<never, never, void> =>
      withLock(
        innerScope,
        rollbackQuietly(
          () => savepointSql(inner, "rollback to savepoint", savepoint),
          () => markFailed(parentScope, SAVEPOINT_ROLLBACK_FAILED),
        ),
      )
    // The savepoint holds its parent's lock for its whole life, so no sibling statement lands
    // between its open and its release or rollback.
    return withLock(
      parentScope,
      IO.bracketExit(
        widen<R, E | DbError, Kysely<DB>>(
          step(() => savepointSql(parent, "savepoint", savepoint))
            .mapError((e) => {
              markFailed(parentScope, QUERY_FAILED)
              return e
            })
            .map(() => inner),
        ),
        (handle) =>
          widen<R, E | DbError, A>(
            program.provideService(tag, handle).flatMap((a) =>
              withLock(
                innerScope,
                finish(innerScope, handle, () =>
                  savepointSql(handle, "release savepoint", savepoint).then(() => {
                    released.value = true
                  }),
                ),
              ).map(() => a),
            ),
          ),
        (_handle, exit) => {
          const undo = (): IOType<never, never, void> =>
            released.value ? IO.sync(() => markFailed(parentScope, RELEASED_THEN_GIVEN_UP)) : rollback()
          return widen<R, never, void>(exit.fold(undo, () => IO.succeed(undefined), undo, undo))
        },
      ),
    )
  }

  const transaction = <R, E, A>(program: IOType<R, E, A>): IOType<R | Kysely<DB>, E | DbError, A> =>
    widen<R | Kysely<DB>, E | DbError, A>(
      IO.service(tag).flatMap((db) => (db.isTransaction ? inSavepoint(db, program) : inTopLevel(db, program))),
    )

  return { tag, query, transaction } as KyselyDb<DB>
}
