import { PGlite } from "@electric-sql/pglite"
import type { IOType } from "functype"
import { IO, Tag } from "functype"
import type { QueryResult } from "kysely"
import { Kysely, sql } from "kysely"
import { PGliteDialect } from "kysely-pglite-dialect"
import { afterAll, beforeAll, beforeEach, describe, expect, expectTypeOf, it } from "vitest"

import type { DbError } from "../src"
import { isUniqueViolation, KyselyDb } from "../src"

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

beforeAll(async () => {
  await sql`create table account (id text primary key, balance integer not null)`.execute(db)
})

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
