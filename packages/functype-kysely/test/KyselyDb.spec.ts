import { PGlite } from "@electric-sql/pglite"
import type { IOType } from "functype"
import { IO, Tag } from "functype"
import type { DatabaseConnection, Dialect, QueryResult } from "kysely"
import { Kysely, sql } from "kysely"
import { PGliteDialect } from "kysely-pglite-dialect"
import { afterAll, beforeAll, beforeEach, describe, expect, expectTypeOf, it } from "vitest"

import type { DbError } from "../src"
import { isUniqueViolation, KyselyDb } from "../src"
import { recoveredQueryError } from "../src/KyselyDb"

type Database = {
  readonly account: { readonly id: string; readonly balance: number }
}

type Overdrawn = { readonly _tag: "Overdrawn"; readonly id: string }
const overdrawn = (id: string): Overdrawn => ({ _tag: "Overdrawn", id })

const Db = KyselyDb<Database>()

const pglite = new PGlite()
const db = new Kysely<Database>({ dialect: new PGliteDialect(pglite) })

const insert = (id: string, balance = 0) =>
  Db.query((d) => d.insertInto("account").values({ id, balance }).execute()).map(() => undefined)

const ids = async (): Promise<readonly string[]> =>
  (await db.selectFrom("account").select("id").orderBy("id").execute()).map((row) => row.id)

const settle = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

// PGlite starts its WASM Postgres on the first query, which can take a while on a busy CI runner.
beforeAll(async () => {
  await sql`create table account (id text primary key, balance integer not null)`.execute(db)
}, 60_000)

beforeEach(async () => {
  await db.deleteFrom("account").execute()
})

afterAll(async () => {
  await db.destroy()
})

describe("Db.query", () => {
  it("runs a Kysely call as an IO", async () => {
    await insert("a", 5).provideService(Db.tag, db).run()
    const rows = await Db.query((d) => d.selectFrom("account").selectAll().execute())
      .provideService(Db.tag, db)
      .run()
    expect(rows.orThrow()).toEqual([{ id: "a", balance: 5 }])
  })

  it("turns a driver error into a DbError with the SQLSTATE", async () => {
    const result = await insert("a")
      .flatMap(() => insert("a"))
      .provideService(Db.tag, db)
      .run()
    const error = result.fold(
      (e) => e,
      () => undefined,
    )
    expect(error?._tag).toBe("DbError")
    expect(error?.code.orUndefined()).toBe("23505")
    expect(error !== undefined && isUniqueViolation(error)).toBe(true)
  })

  it("maps the error with toError when given", async () => {
    const io = Db.query(
      (d) => sql`select * from missing_table`.execute(d),
      () => "query failed" as const,
    )
    expectTypeOf(io).toEqualTypeOf<IOType<Kysely<Database>, "query failed", QueryResult<unknown>>>()
    const result = await io.provideService(Db.tag, db).run()
    expect(result.isLeft() && result.value).toBe("query failed")
  })
})

describe("Db.transaction", () => {
  it("commits when the program succeeds", async () => {
    const result = await Db.transaction(insert("a").flatMap(() => insert("b")))
      .provideService(Db.tag, db)
      .run()
    expect(result.isRight()).toBe(true)
    expect(await ids()).toEqual(["a", "b"])
  })

  it("rolls back on a typed failure and keeps the error exact", async () => {
    const program = Db.transaction(insert("a").flatMap(() => IO.fail(overdrawn("a"))))
    expectTypeOf(program).toEqualTypeOf<IOType<Kysely<Database>, Overdrawn | DbError, never>>()
    const result = await program.provideService(Db.tag, db).run()
    expect(result.isLeft() && result.value).toEqual(overdrawn("a"))
    expect(await ids()).toEqual([])
  })

  it("rolls back on a defect", async () => {
    const exit = await Db.transaction(insert("a").flatMap(() => IO.die(new Error("boom"))))
      .provideService(Db.tag, db)
      .runExit()
    expect(exit.isDie()).toBe(true)
    expect(await ids()).toEqual([])
  })

  it("rolls back on a SQL error inside the program", async () => {
    const result = await Db.transaction(insert("a").flatMap(() => insert("a")))
      .provideService(Db.tag, db)
      .run()
    expect(result.isLeft()).toBe(true)
    expect(await ids()).toEqual([])
  })

  it("rolls back when the run is cancelled", async () => {
    const controller = new AbortController()
    const running = Db.transaction(insert("a").flatMap(() => IO.sleep(5_000)))
      .provideService(Db.tag, db)
      .runExit({ signal: controller.signal })
    await settle(50)
    controller.abort()
    expect((await running).isInterrupted()).toBe(true)
    expect(await ids()).toEqual([])
  })

  it("rolls back after a timeout, once the query in flight settles", async () => {
    const result = await Db.transaction(
      insert("a").flatMap(() => Db.query((d) => settle(200).then(() => sql`select 1`.execute(d)))),
    )
      .timeout(50)
      .provideService(Db.tag, db)
      .run()
    expect(result.isLeft()).toBe(true)
    await settle(400)
    expect(await ids()).toEqual([])
  })

  it("turns a failed commit into a DbError and frees the connection", async () => {
    await sql`create table deferred (id text, constraint deferred_unique unique (id) deferrable initially deferred)`.execute(
      db,
    )
    const add = (id: string) => Db.query((d) => sql`insert into deferred (id) values (${id})`.execute(d))
    const result = await Db.transaction(add("x").flatMap(() => add("x")))
      .provideService(Db.tag, db)
      .run()
    const error = result.fold(
      (e) => e,
      () => undefined,
    )
    expect(error?.code.orUndefined()).toBe("23505")
    const after = await sql<{ readonly n: number }>`select count(*)::int as n from deferred`.execute(db)
    expect(after.rows[0]?.n).toBe(0)
    await sql`drop table deferred`.execute(db)
  })

  it("keeps the program's other services in R", async () => {
    type Clock = { readonly now: () => number }
    const ClockTag = Tag<Clock>("Clock")
    const program = Db.transaction(IO.service(ClockTag).flatMap((clock) => insert(`t${clock.now()}`)))
    expectTypeOf(program).toEqualTypeOf<IOType<Clock | Kysely<Database>, DbError, undefined>>()
    const result = await program
      .provideService(ClockTag, { now: () => 1 })
      .provideService(Db.tag, db)
      .run()
    expect(result.isRight()).toBe(true)
    expect(await ids()).toEqual(["t1"])
  })

  it("opens a savepoint inside a transaction from Kysely's callback form", async () => {
    await db.transaction().execute(async (trx) => {
      await insert("a").provideService(Db.tag, trx).run()
      const inner = await Db.transaction(insert("b").flatMap(() => IO.fail(overdrawn("b"))))
        .provideService(Db.tag, trx)
        .run()
      expect(inner.isLeft()).toBe(true)
    })
    expect(await ids()).toEqual(["a"])
  })
})

describe("nested Db.transaction", () => {
  it("commits the inner writes with the outer ones", async () => {
    await Db.transaction(insert("a").flatMap(() => Db.transaction(insert("b"))))
      .provideService(Db.tag, db)
      .run()
    expect(await ids()).toEqual(["a", "b"])
  })

  it("rolls the inner writes back to the savepoint and lets the outer recover", async () => {
    const inner = Db.transaction(insert("b").flatMap(() => IO.fail(overdrawn("b"))))
    const result = await Db.transaction(
      insert("a")
        .flatMap(() => inner.recover(() => undefined))
        .flatMap(() => insert("c")),
    )
      .provideService(Db.tag, db)
      .run()
    expect(result.isRight()).toBe(true)
    expect(await ids()).toEqual(["a", "c"])
  })

  it("keeps the outer transaction usable after a SQL error in the inner one", async () => {
    const inner = Db.transaction(insert("a"))
    const result = await Db.transaction(
      insert("a")
        .flatMap(() => inner.recover(() => undefined))
        .flatMap(() => insert("c")),
    )
      .provideService(Db.tag, db)
      .run()
    expect(result.isRight()).toBe(true)
    expect(await ids()).toEqual(["a", "c"])
  })

  it("rolls everything back when the inner failure isn't recovered", async () => {
    const result = await Db.transaction(
      insert("a").flatMap(() => Db.transaction(insert("b").flatMap(() => IO.fail(overdrawn("b"))))),
    )
      .provideService(Db.tag, db)
      .run()
    expect(result.isLeft() && result.value).toEqual(overdrawn("b"))
    expect(await ids()).toEqual([])
  })
})

describe("Db.transaction with steps that overlap", () => {
  it("runs sibling nested transactions one at a time under IO.all", async () => {
    const t1 = Db.transaction(
      insert("x1")
        .flatMap(() => Db.query(() => settle(100)))
        .flatMap(() => insert("x2")),
    )
    const t2 = Db.transaction(
      Db.query(() => settle(30))
        .flatMap(() => insert("y1"))
        .flatMap(() => IO.fail(overdrawn("y1"))),
    ).recover(() => undefined)
    for (const pair of [
      [t1, t2],
      [t2, t1],
    ] as const) {
      await db.deleteFrom("account").execute()
      const result = await Db.transaction(insert("a").flatMap(() => IO.all([...pair])))
        .provideService(Db.tag, db)
        .run()
      expect(result.isRight()).toBe(true)
      expect(await ids()).toEqual(["a", "x1", "x2"])
    }
  })

  it("rolls a timed-out nested transaction back before the outer one goes on", async () => {
    const slow = Db.transaction(insert("n1").flatMap(() => Db.query(() => settle(200))))
    const result = await Db.transaction(
      insert("a")
        .flatMap(() => slow.timeout(50).recover(() => undefined))
        .flatMap(() => insert("b"))
        .flatMap(() => IO.sleep(300))
        .flatMap(() => insert("c")),
    )
      .provideService(Db.tag, db)
      .run()
    expect(result.isRight()).toBe(true)
    expect(await ids()).toEqual(["a", "b", "c"])
  })

  it("doesn't commit a timed-out nested transaction's writes", async () => {
    const slow = Db.transaction(insert("n1").flatMap(() => Db.query(() => settle(200))))
    const result = await Db.transaction(
      insert("a")
        .flatMap(() => slow.timeout(50).recover(() => undefined))
        .flatMap(() => insert("b")),
    )
      .provideService(Db.tag, db)
      .run()
    expect(result.isRight()).toBe(true)
    expect(await ids()).toEqual(["a", "b"])
  })
})

describe("Db.transaction after a failed query", () => {
  it("fails the commit when the program recovered a failed query itself", async () => {
    const result = await Db.transaction(
      insert("a")
        .flatMap(() => insert("a"))
        .recover(() => undefined)
        .flatMap(() => IO.succeed("done")),
    )
      .provideService(Db.tag, db)
      .run()
    expect(result.isLeft() && result.value).toEqual(recoveredQueryError())
    expect(await ids()).toEqual([])
  })

  it("fails the savepoint's release the same way, and the outer transaction can recover", async () => {
    const inner = Db.transaction(insert("a").recover(() => undefined))
    const result = await Db.transaction(
      insert("a")
        .flatMap(() => inner)
        .recover(() => undefined)
        .flatMap(() => insert("c")),
    )
      .provideService(Db.tag, db)
      .run()
    expect(result.isRight()).toBe(true)
    expect(await ids()).toEqual(["a", "c"])
  })
})

/** PGlite, with a rollback that runs and then throws. */
const flakyDialect = (inner: Dialect): Dialect => ({
  createAdapter: () => inner.createAdapter(),
  createIntrospector: (d) => inner.createIntrospector(d),
  createQueryCompiler: () => inner.createQueryCompiler(),
  createDriver: () => {
    const driver = inner.createDriver()
    return {
      init: () => driver.init(),
      acquireConnection: () => driver.acquireConnection(),
      beginTransaction: (c, s) => driver.beginTransaction(c, s),
      commitTransaction: (c) => driver.commitTransaction(c),
      rollbackTransaction: async (c) => {
        await driver.rollbackTransaction(c)
        throw new Error("rollback lost")
      },
      releaseConnection: (c) => driver.releaseConnection(c),
      destroy: () => driver.destroy(),
    }
  },
})

describe("Db.transaction when the rollback fails", () => {
  it("keeps the program's own failure", async () => {
    const flaky = new Kysely<Database>({ dialect: flakyDialect(new PGliteDialect(pglite)) })
    const result = await Db.transaction(insert("a").flatMap(() => IO.fail(overdrawn("a"))))
      .provideService(Db.tag, flaky)
      .run()
    expect(result.isLeft() && result.value).toEqual(overdrawn("a"))
    expect(await ids()).toEqual([])
  })
})

describe("KyselyDb names", () => {
  it("doesn't share a tag with a plain Tag of the same name", () => {
    expect(Db.tag.id).not.toBe(Tag<Database>("Db").id)
    expect(KyselyDb<Database>("Replica").tag.id).not.toBe(Db.tag.id)
  })
})

describe("Db.transaction after a query a timeout gave up on", () => {
  const late = (id: string) =>
    Db.query((d) => settle(100).then(() => d.insertInto("account").values({ id, balance: 0 }).execute()))

  it("refuses to commit when the query then fails", async () => {
    const result = await Db.transaction(
      insert("a")
        .flatMap(() =>
          late("a")
            .timeout(30)
            .recover(() => undefined),
        )
        .flatMap(() => IO.succeed("done")),
    )
      .provideService(Db.tag, db)
      .run()
    expect(result.isLeft() && result.value).toEqual(recoveredQueryError())
    expect(await ids()).toEqual([])
  })

  it("refuses to commit when the write lands after the program gave up on it", async () => {
    const result = await Db.transaction(
      insert("a").flatMap(() =>
        late("b")
          .timeout(30)
          .recover(() => undefined),
      ),
    )
      .provideService(Db.tag, db)
      .run()
    expect(result.isLeft() && result.value).toEqual(recoveredQueryError())
    expect(await ids()).toEqual([])
  })

  it("rolls a savepoint back only after the query in it settles", async () => {
    const inner = Db.transaction(
      late("n1")
        .timeout(30)
        .recover(() => undefined)
        .flatMap(() => IO.fail(overdrawn("n1"))),
    )
    const result = await Db.transaction(
      insert("a")
        .flatMap(() => inner.recover(() => undefined))
        .flatMap(() => IO.sleep(150))
        .flatMap(() => insert("b")),
    )
      .provideService(Db.tag, db)
      .run()
    expect(result.isRight()).toBe(true)
    expect(await ids()).toEqual(["a", "b"])
  })
})

describe("Db.transaction edge cases", () => {
  it("refuses to commit after a recovered executeTakeFirstOrThrow, which counts as a failed query", async () => {
    const missing = Db.query((d) =>
      d.selectFrom("account").selectAll().where("id", "=", "nobody").executeTakeFirstOrThrow(),
    )
    const result = await Db.transaction(insert("a").flatMap(() => missing.recover(() => undefined)))
      .provideService(Db.tag, db)
      .run()
    expect(result.isLeft() && result.value).toEqual(recoveredQueryError())
    expect(await ids()).toEqual([])
  })

  it("commits a not-found row read with executeTakeFirst", async () => {
    const missing = Db.query((d) => d.selectFrom("account").selectAll().where("id", "=", "nobody").executeTakeFirst())
    const result = await Db.transaction(insert("a").flatMap(() => missing))
      .provideService(Db.tag, db)
      .run()
    expect(result.isRight()).toBe(true)
    expect(await ids()).toEqual(["a"])
  })

  /** PGlite, with RELEASE SAVEPOINT held back 100 ms; `onRelease` runs as it starts. */
  const slowReleaseDialect = (inner: Dialect, onRelease: () => void): Dialect => ({
    createAdapter: () => inner.createAdapter(),
    createIntrospector: (d) => inner.createIntrospector(d),
    createQueryCompiler: () => inner.createQueryCompiler(),
    createDriver: () => {
      const driver = inner.createDriver()
      return {
        init: () => driver.init(),
        acquireConnection: async () => {
          const connection = await driver.acquireConnection()
          const wrapper: DatabaseConnection = {
            executeQuery: async (query) => {
              if (query.sql.startsWith("release savepoint")) {
                onRelease()
                await settle(100)
              }
              return connection.executeQuery(query)
            },
            streamQuery: (query, chunkSize) => connection.streamQuery(query, chunkSize),
          }
          inners.set(wrapper, connection)
          return wrapper
        },
        beginTransaction: (c, s) => driver.beginTransaction(unwrap(c), s),
        commitTransaction: (c) => driver.commitTransaction(unwrap(c)),
        rollbackTransaction: (c) => driver.rollbackTransaction(unwrap(c)),
        releaseConnection: (c) => driver.releaseConnection(unwrap(c)),
        destroy: () => Promise.resolve(),
      }
    },
  })
  const inners = new WeakMap<DatabaseConnection, DatabaseConnection>()
  const unwrap = (c: DatabaseConnection): DatabaseConnection => inners.get(c) ?? c

  it("refuses to commit when a cancel gives up on a nested transaction during its release", async () => {
    // The cancel fires as RELEASE SAVEPOINT starts, so the test doesn't depend on timing.
    const controller = new AbortController()
    const slow = new Kysely<Database>({
      dialect: slowReleaseDialect(new PGliteDialect(pglite), () => controller.abort()),
    })
    const result = await Db.transaction(
      insert("a")
        .flatMap(() => Db.transaction(insert("n")).interruptOn(controller.signal).recover(undefined))
        .flatMap(() => insert("b")),
    )
      .provideService(Db.tag, slow)
      .run()
    const error = result.fold(
      (e) => e,
      () => undefined,
    )
    expect(error?.message).toMatch(/after its savepoint was released/)
    expect(await ids()).toEqual([])
  })
})

describe("Db.transaction after a not-found error", () => {
  it("refuses to commit when the callback's other statement failed, even one sent later", async () => {
    const notFound = (d: Kysely<Database>) =>
      d.selectFrom("account").selectAll().where("id", "=", "nobody").executeTakeFirstOrThrow()
    const shapes = [
      Db.query((d) => Promise.all([notFound(d), d.insertInto("account").values({ id: "a", balance: 0 }).execute()])),
      Db.query((d) =>
        Promise.all([
          notFound(d),
          d
            .selectFrom("account")
            .select("id")
            .execute()
            .then(() => d.insertInto("account").values({ id: "a", balance: 0 }).execute()),
        ]),
      ),
    ]
    for (const both of shapes) {
      await db.deleteFrom("account").execute()
      const result = await Db.transaction(insert("a").flatMap(() => both.recover(() => undefined)))
        .provideService(Db.tag, db)
        .run()
      expect(result.isLeft() && result.value).toEqual(recoveredQueryError())
      expect(await ids()).toEqual([])
    }
  })
})

describe("Db.transaction with a race", () => {
  it("refuses to commit after racing two queries, since the race gives up on the loser", async () => {
    const result = await Db.transaction(IO.race([insert("w"), insert("l")]))
      .provideService(Db.tag, db)
      .run()
    expect(result.isLeft() && result.value).toEqual(recoveredQueryError())
    expect(await ids()).toEqual([])
  })
})
