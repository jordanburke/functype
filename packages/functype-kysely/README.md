# functype-kysely

[Kysely](https://kysely.dev) for [functype](https://functype.org): queries return typed `IO`, and a transaction wraps an `IO` program. The transaction commits when the program succeeds. It rolls back when the program fails with its own typed error, dies, or is cancelled. Nothing has to throw to roll back, and the error type stays exact.

```bash
pnpm add functype-kysely functype kysely
```

## Set up

Make one service per database, and provide your `Kysely` instance once, where the program runs:

```ts
import { KyselyDb } from "functype-kysely"
import type { Kysely } from "kysely"

type Database = {
  readonly account: { readonly id: string; readonly balance: number }
}

export const Db = KyselyDb<Database>()

const balance = (id: string) =>
  Db.queryOption((d) => d.selectFrom("account").select("balance").where("id", "=", id).executeTakeFirst())

declare const db: Kysely<Database> // your Kysely instance, below

const result = await balance("alice").provideService(Db.tag, db).run()
// Either<DbError, Option<{ balance: number }>>
```

`db` is an ordinary Kysely instance, with any dialect:

```ts ignore
import { Kysely, PostgresDialect } from "kysely"
import { Pool } from "pg"

const db = new Kysely<Database>({ dialect: new PostgresDialect({ pool: new Pool() }) })
```

## Queries

`Db.query(f)` runs one Kysely call as an `IO<Kysely<DB>, DbError, A>`. A throw becomes a `DbError`:

```ts
type DbError = {
  readonly _tag: "DbError"
  readonly code: Option<string> // the SQLSTATE on Postgres, e.g. "23505"
  readonly message: string // the driver's text: keep it out of what users see
  readonly cause: unknown // the original error
}
```

`f` also gets the run's `AbortSignal`. Pass it to `execute` (Kysely 0.29 and later), and a cancelled run stops waiting for the query. By default the query keeps running on the server; add `inflightQueryAbortStrategy: "cancel query"` to cancel it there, on dialects that support that:

```ts
const accounts = Db.query((d, signal) =>
  d.selectFrom("account").selectAll().execute({ signal, inflightQueryAbortStrategy: "cancel query" }),
)
```

`Db.queryOption(f)` is `Db.query` for a row that may be missing. It gives `Some` for a row and `None` when `f` resolves to `undefined` or `null`, so pair it with `executeTakeFirst`:

```ts
const findAccount = (id: string) =>
  Db.queryOption((d, signal) => d.selectFrom("account").selectAll().where("id", "=", id).executeTakeFirst({ signal }))
// IO<Kysely<Database>, DbError, Option<{ id: string; balance: number }>>
```

Use it instead of `executeTakeFirstOrThrow` inside a transaction. There a rejected query refuses the commit, below, and a missing row is a rejection under `...OrThrow`, but `None` under `queryOption`.

Pass a second argument to map the error yourself: `Db.query(f, (e) => myError(e))`, and the same for `Db.queryOption`. `isUniqueViolation(error)` checks for a unique-constraint or primary-key violation on Postgres, MySQL or SQLite.

## Transactions

`Db.transaction(program)` runs an IO program in a transaction. Inside it, every `Db.query` sees the transaction, so the steps are ordinary IO. They compose with `flatMap` and `IO.gen`, and fail with your own errors:

```ts
import { IO } from "functype"

type Overdrawn = { readonly _tag: "Overdrawn"; readonly id: string }

const setBalance = (id: string, balance: number) =>
  Db.query((d) => d.updateTable("account").set({ balance }).where("id", "=", id).execute())

const transfer = (from: string, to: string, amount: number) =>
  Db.transaction(
    IO.gen(function* () {
      const source = yield* balance(from)
      const target = yield* balance(to)
      const left = (source?.balance ?? 0) - amount
      if (left < 0) return yield* IO.fail<Overdrawn>({ _tag: "Overdrawn", id: from })
      yield* setBalance(from, left)
      yield* setBalance(to, (target?.balance ?? 0) + amount)
    }),
  )
// IO<Kysely<Database>, DbError | Overdrawn, undefined>
```

- **Success commits.** A failed commit, such as a deferred constraint, is a `DbError`.
- **A typed failure rolls back** and passes through unchanged: `transfer` fails with `Overdrawn`, not a wrapper.
- **A defect rolls back**, and the run still dies.
- **A cancel rolls back.** The run stops before its next step and rolls back once the query in flight settles. If you pass the signal to `execute`, Kysely stops waiting at once and the statement may still be running on the connection; the rollback then queues behind it. A commit that has already started when the run is cancelled still commits, though the run reports the cancel.
- **A failed or abandoned query can't be recovered in place.** On Postgres, any failed statement aborts the transaction, and a later `COMMIT` silently rolls back. A write that a `timeout` gave up on may still land. So when a query fails, or a `timeout` or cancel gives up on it, and the program carries on, the commit fails with a `DbError` instead of reporting success. To carry on after a query that may fail or time out, run it in a nested `Db.transaction`, below: the savepoint waits for that query to settle, then undoes it. Any rejection of the function you give `Db.query` counts, `executeTakeFirstOrThrow`'s not-found error included, because a callback can run several statements and that error could hide one that failed. To look up a row that may be missing, use `Db.queryOption` with `executeTakeFirst`, above, and fail with `IO.fail` when the program needs the row.
- **Steps run one at a time.** A transaction is one connection, so its queries, nested transactions and commit wait for each other, even under `IO.all`. A nested transaction that a `timeout`, `race`, `IO.all` failing fast or `interruptOn` gave up on still finishes its rollback before the next step runs. If that lands after the nested transaction's savepoint was already released, there's nothing left to roll back to and its writes are the outer transaction's, so the outer commit is refused instead. So racing two queries in one transaction always fails the commit: the loser still runs, and the race gives up on it.
- **Both guards cover `Db.query` and `Db.queryOption`.** The one-at-a-time lock and the refused commit only see queries run through them on the handle they give you. A statement run on the transaction handle directly, such as `IO.service(Db.tag)` followed by `trx.insertInto(…).execute()`, or on a handle derived from it with `withSchema` or `withPlugin`, isn't serialized or checked.
- **Other services stay in `R`.** A program that also needs a `Clock` gives a transaction that needs `Clock | Kysely<Database>`.

### Nesting

A transaction inside another one opens a savepoint. When the inner program fails, its writes roll back to the savepoint and the outer transaction carries on, even after a SQL error, which on Postgres would otherwise abort the whole transaction:

```ts
const audit = (id: string) => Db.query((d) => d.insertInto("account").values({ id, balance: 0 }).execute())

const transferAndAudit = (from: string, to: string, amount: number) =>
  Db.transaction(
    transfer(from, to, amount).flatMap(() =>
      // A failed audit row doesn't undo the transfer.
      Db.transaction(audit(`audit-${from}`)).recover(() => undefined),
    ),
  )
```

When the inner failure isn't recovered, it fails the outer transaction too, and everything rolls back.

Savepoints are issued as `SAVEPOINT` SQL, which Postgres, MySQL and SQLite accept and MSSQL doesn't. A transaction opened with Kysely itself, such as the `trx` in `db.transaction().execute(callback)`, can be the outer one too: provide it under `Db.tag`, and `Db.transaction` opens a savepoint in it. Kysely then owns the commit, so neither guard covers it, neither the one-at-a-time lock nor the refused commit: Kysely commits when your callback returns, even after a query failed and the program carried on, and even while a nested transaction a `timeout` gave up on is still running. Prefer `Db.transaction` for the outer transaction.

Inside a nested transaction, use the handle `Db.query` gives you. Re-providing an outer transaction's handle captured earlier, with `provideService(Db.tag, trx)`, waits for the nested transaction to finish, which never happens: the run hangs. So does a run started inside a `Db.query` callback on the handle that callback got.

## Two databases

Each `KyselyDb` names its service, `"Db"` by default, so give a second database its own name: `KyselyDb<Database>("Replica")`. `R` names the schema type, not the service, so two services over the same schema look alike in `R`. Providing only one of them still compiles, and the run dies with a missing-service error.

## Testing

[PGlite](https://pglite.dev) runs Postgres in process, so a test can use a real database with no server. This package's own tests run on it with [`kysely-pglite-dialect`](https://www.npmjs.com/package/kysely-pglite-dialect), whose 1.4 release supports PGlite up to 0.5:

```ts ignore
import { PGlite } from "@electric-sql/pglite"
import { PGliteDialect } from "kysely-pglite-dialect"

const db = new Kysely<Database>({ dialect: new PGliteDialect(new PGlite()) })
```

## License

MIT
