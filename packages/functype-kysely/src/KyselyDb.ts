import type { IOType, TagType } from "functype"
import { IO, Tag } from "functype"
import type { ControlledTransaction, Kysely } from "kysely"
import { sql } from "kysely"

import type { DbError } from "./DbError"
import { toDbError } from "./DbError"

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
   * cancelled run cancels the query on dialects that support it.
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
   * ordinary IO: compose them with `flatMap`, `recover` and `IO.gen`, and fail with your own
   * typed errors; nothing needs to throw to roll back.
   *
   * **Nesting uses a savepoint.** A `transaction` inside another one opens a savepoint, not a
   * second transaction. When the inner program fails, its writes roll back to the savepoint and the
   * outer transaction stays usable, so an outer `recover` can carry on. This needs a dialect with
   * `SAVEPOINT` (Postgres, MySQL, SQLite; not MSSQL).
   *
   * **A cancel waits for the query in flight.** A cancelled run stops before its next step and rolls
   * back once the current query settles. A commit that has already started when the run is
   * cancelled still commits, though the run reports the cancel.
   *
   * The provided service can also be a transaction you opened with Kysely itself, such as the
   * `trx` in `db.transaction().execute(callback)`. Then `transaction` opens a savepoint in it.
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

/** A cleanup step that can't fail as a typed error: a failure there is a defect. */
const cleanup = (f: () => Promise<unknown>): IOType<never, never, void> =>
  IO.async(f)
    .map(() => undefined)
    .recoverWith((e) => IO.die(e))

const step = <A>(f: () => Promise<A>): IOType<never, DbError, A> => IO.tryAsync(f, toDbError)

/**
 * IO's type parameters are invariant, so an IO that needs fewer services or fails in fewer ways
 * doesn't widen on its own. Widening is sound: such an IO fits anywhere the wider one does.
 */
const widen = <R, E, A>(io: object): IOType<R, E, A> => io as IOType<R, E, A>

const savepointName = (): string => `functype_sp_${Math.random().toString(36).slice(2, 10)}`

/**
 * Makes the {@link KyselyDb} service for one database.
 *
 * @param name - the tag's id, `"Db"` by default. Give each database its own name.
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
  const tag = Tag<Kysely<DB>>(name)

  const query = <A, E>(
    f: (db: Kysely<DB>, signal?: AbortSignal) => Promise<A>,
    toError?: (error: unknown) => E,
  ): IOType<Kysely<DB>, E | DbError, A> =>
    IO.service(tag).flatMap((db) =>
      IO.tryAsync((signal) => f(db, signal), toError ?? ((e: unknown): E | DbError => toDbError(e))),
    )

  const inTopLevel = <R, E, A>(db: Kysely<DB>, program: IOType<R, E, A>): IOType<R, E | DbError, A> =>
    IO.bracketExit(
      widen<R, E | DbError, Controlled<DB>>(step(() => db.startTransaction().execute()).map((t) => controlled<DB>(t))),
      (trx) =>
        widen<R, E | DbError, A>(
          program.provideService(tag, trx).flatMap((a) => step(() => trx.commit().execute()).map(() => a)),
        ),
      (trx) =>
        widen<R, never, void>(
          trx.isCommitted || trx.isRolledBack ? IO.succeed(undefined) : cleanup(() => trx.rollback().execute()),
        ),
    )

  const inSavepoint = <R, E, A>(trx: Kysely<DB>, program: IOType<R, E, A>): IOType<R, E | DbError, A> => {
    const savepoint = savepointName()
    return IO.bracketExit(
      widen<R, E | DbError, Kysely<DB>>(step(() => savepointSql(trx, "savepoint", savepoint)).map(() => trx)),
      (inner) =>
        widen<R, E | DbError, A>(
          program
            .provideService(tag, inner)
            .flatMap((a) => step(() => savepointSql(inner, "release savepoint", savepoint)).map(() => a)),
        ),
      (inner, exit) => {
        const rollback = (): IOType<never, never, void> =>
          cleanup(() => savepointSql(inner, "rollback to savepoint", savepoint))
        return widen<R, never, void>(exit.fold(rollback, () => IO.succeed(undefined), rollback, rollback))
      },
    )
  }

  const transaction = <R, E, A>(program: IOType<R, E, A>): IOType<R | Kysely<DB>, E | DbError, A> =>
    widen<R | Kysely<DB>, E | DbError, A>(
      IO.service(tag).flatMap((db) => (db.isTransaction ? inSavepoint(db, program) : inTopLevel(db, program))),
    )

  return { tag, query, transaction } as KyselyDb<DB>
}
