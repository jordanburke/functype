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
  Db.query((d) => d.selectFrom("account").select("balance").where("id", "=", id).executeTakeFirst())

declare const db: Kysely<Database> // your Kysely instance, below

const result = await balance("alice").provideService(Db.tag, db).run()
// Either<DbError, { balance: number } | undefined>
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

`f` also gets the run's `AbortSignal`. Pass it to `execute`, and a cancelled run cancels the query on the dialects that support it:

```ts
const accounts = Db.query((d, signal) => d.selectFrom("account").selectAll().execute({ signal }))
```

Pass a second argument to map the error yourself: `Db.query(f, (e) => myError(e))`. `isUniqueViolation(error)` checks for a unique-constraint violation on Postgres, MySQL or SQLite.

## Transactions

`Db.transaction(program)` runs an IO program in a transaction. Inside it, every `Db.query` sees the transaction, so the steps are ordinary IO. They compose with `flatMap`, `recover` and `IO.gen`, and fail with your own errors:

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
// IO<Kysely<Database>, DbError | Overdrawn, void>
```

- **Success commits.** A failed commit, such as a deferred constraint, is a `DbError`.
- **A typed failure rolls back** and passes through unchanged: `transfer` fails with `Overdrawn`, not a wrapper.
- **A defect rolls back**, and the run still dies.
- **A cancel rolls back.** The run stops before its next step and rolls back once the query in flight settles. A commit that has already started when the run is cancelled still commits, though the run reports the cancel.
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

Savepoints need a dialect with `SAVEPOINT`: Postgres, MySQL and SQLite have it, MSSQL doesn't. A transaction opened with Kysely itself, such as the `trx` in `db.transaction().execute(callback)`, works as the outer one too: provide it under `Db.tag`, and `Db.transaction` opens a savepoint in it.

## Testing

[PGlite](https://pglite.dev) runs Postgres in process, so a test can use a real database with no server. This package's own tests run on it with [`kysely-pglite-dialect`](https://www.npmjs.com/package/kysely-pglite-dialect):

```ts ignore
import { PGlite } from "@electric-sql/pglite"
import { PGliteDialect } from "kysely-pglite-dialect"

const db = new Kysely<Database>({ dialect: new PGliteDialect(new PGlite()) })
```

## License

MIT
