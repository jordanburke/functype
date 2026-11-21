import { describe, expect, expectTypeOf, it } from "vitest"

import type { SpanTracer as SpanTracerType } from "@/io"
import { IO, Layer, SpanTracer, Tag } from "@/io"

/**
 * `IO.gen` records what its body reads (#277, the 2.0 tracking issue). It was typed
 * `IO<never, any, A>`, so it kept neither the services it `yield*`ed nor their errors, and
 * `provideLayer` had nothing to satisfy.
 */

type Database = { readonly find: (id: string) => Promise<string> }
const Database = Tag<Database>("Database")

type Clock = { readonly now: () => number }
const Clock = Tag<Clock>("Clock")

class DbError extends Error {
  readonly _tag = "DbError" as const
}
class ParseError extends Error {
  readonly _tag = "ParseError" as const
}

const db: Database = { find: (id) => Promise.resolve(`user-${id}`) }
const clock: Clock = { now: () => 7 }

describe("IO.gen typing", () => {
  it("is IO<never, never, A> when the body yields nothing", () => {
    const program = IO.gen(function* () {
      return 5
    })
    expectTypeOf(program).toEqualTypeOf<IO<never, never, number>>()
  })

  it("keeps IO<never, never, A> for pure yields", async () => {
    const program = IO.gen(function* () {
      const a = yield* IO.succeed(1)
      const b = yield* IO.succeed(2)
      return a + b
    })
    expectTypeOf(program).toEqualTypeOf<IO<never, never, number>>()
    expect(await program.runOrThrow()).toBe(3)
  })

  it("records every service it reads", () => {
    const program = IO.gen(function* () {
      const d = yield* IO.service(Database)
      const c = yield* IO.service(Clock)
      return `${typeof d.find}:${c.now()}`
    })
    expectTypeOf(program).toEqualTypeOf<IO<Database | Clock, never, string>>()
  })

  it("records the union of the errors it can fail with", () => {
    const program = IO.gen(function* () {
      const raw = yield* IO.tryPromise({ try: () => db.find("1"), catch: (e) => new DbError(String(e)) })
      const n = yield* raw.length > 0 ? IO.succeed(raw.length) : IO.fail(new ParseError("empty"))
      return n
    })
    expectTypeOf(program).toEqualTypeOf<IO<never, DbError | ParseError, number>>()
  })

  it("lets catchTag narrow the recorded errors", async () => {
    const program = IO.gen(function* () {
      return yield* IO.fail(new DbError("down"))
    }).catchTag("DbError", () => IO.succeed("fallback"))
    expectTypeOf(program).toEqualTypeOf<IO<never, never, string>>()
    expect(await program.runOrThrow()).toBe("fallback")
  })

  it("can't run until its services are provided", () => {
    const program = IO.gen(function* () {
      const d = yield* IO.service(Database)
      return d
    })
    // @ts-expect-error R is Database, and running needs R = never
    void (() => program.runOrThrow())
    expectTypeOf(program.provideService(Database, db)).toEqualTypeOf<IO<never, never, Database>>()
  })

  it("is satisfied by provideLayer, one layer per service", async () => {
    const getUser = (id: string) =>
      IO.gen(function* () {
        const d = yield* IO.service(Database)
        const c = yield* IO.service(Clock)
        const name = yield* IO.tryPromise({ try: () => d.find(id), catch: (e) => new DbError(String(e)) })
        return `${name}@${c.now()}`
      })

    const partly = getUser("1").provideLayer(Layer.succeed(Database, db))
    expectTypeOf(partly).toEqualTypeOf<IO<Clock, DbError, string>>()

    const live = Layer.succeed(Database, db).merge(Layer.succeed(Clock, clock))
    const program = getUser("1").provideLayer(live)
    expectTypeOf(program).toEqualTypeOf<IO<never, DbError, string>>()
    expect(await program.runOrThrow()).toBe("user-1@7")
  })
})

describe("provideLayer and provideContext take services the effect doesn't name", () => {
  it("supplies a SpanTracer, which withSpan reads without requiring it", async () => {
    const names: string[] = []
    const tracer: SpanTracerType<string> = {
      start: (name) => {
        names.push(name)
        return name
      },
      run: (_span, fn) => fn(),
      end: () => undefined,
    }

    const traced = IO.succeed(1).withSpan("work")
    expectTypeOf(traced).toEqualTypeOf<IO<never, never, number>>()

    const program = traced.provideLayer(Layer.succeed(SpanTracer, tracer))
    expectTypeOf(program).toEqualTypeOf<IO<never, never, number>>()
    expect(await program.runOrThrow()).toBe(1)
    expect(names).toEqual(["work"])
  })

  it("leaves the requirement alone when the layer provides something else", () => {
    const program = IO.service(Database).provideLayer(Layer.succeed(Clock, clock))
    expectTypeOf(program).toEqualTypeOf<IO<Database, never, Database>>()
  })
})
