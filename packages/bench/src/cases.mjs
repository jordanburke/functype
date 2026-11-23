// The timed cases: the same operation written the way each library's docs write it.
//
// Each case's two functions are what the page shows (via Function.prototype.toString), so the code
// timed and the code published are the same text. Every function returns a number, and the runner
// checks both libraries return the same one before it times anything, so a broken case can't post a
// fast time.

/** Helpers the cases share, listed on the page as they are written here. */
export const SETUP = `const inc = (x) => x + 1
const items = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]
class Boom { _tag = "Boom" }
const DbF = Tag("Db")                            // functype
class DbE extends Context.Service()("Db") {}     // Effect
const db = { k: 3 }`

/**
 * @param {Record<string, any>} F functype's root module
 * @param {Record<string, any>} E Effect's root module
 */
export const makeCases = (F, E) => {
  const { Some, Right, IO, List, Tag } = F
  const { Effect, Option, Result, Context } = E
  const Arr = E.Array

  const inc = (x) => x + 1
  const items = Array.from({ length: 10 }, (_, i) => i)
  class Boom {
    constructor() {
      this._tag = "Boom"
    }
  }
  const DbF = Tag("Db")
  class DbE extends Context.Service()("Db") {}
  const db = { k: 3 }

  return [
    {
      id: "option",
      group: "Data types",
      name: "Option: build, map, getOrElse",
      ops: 500_000,
      // prettier-ignore
      functype: (i) => Some(i).map(inc).getOrElse(() => 0),
      effect: (i) => Option.getOrElse(Option.map(Option.some(i), inc), () => 0),
    },
    {
      id: "either",
      group: "Data types",
      name: "Either (Effect's Result): build, map, getOrElse",
      ops: 500_000,
      // prettier-ignore
      functype: (i) => Right(i).map(inc).getOrElse(() => 0),
      effect: (i) => Result.getOrElse(Result.map(Result.succeed(i), inc), () => 0),
    },
    {
      id: "list",
      group: "Data types",
      name: "List (Effect's Array module): 10 items, map, filter",
      ops: 300_000,
      // prettier-ignore
      functype: (i) => List(items).map((x) => x + i).filter((x) => x % 2 === 0).size,
      // prettier-ignore
      effect: (i) => Arr.filter(Arr.map(items, (x) => x + i), (x) => x % 2 === 0).length,
    },
    {
      id: "effect-map",
      group: "Effects, run synchronously",
      name: "Build, map and run an effect",
      ops: 500_000,
      functype: (i) => IO.succeed(i).map(inc).runSyncOrThrow(),
      effect: (i) => Effect.runSync(Effect.map(Effect.succeed(i), inc)),
    },
    {
      id: "flatmap-50",
      group: "Effects, run synchronously",
      name: "50 flatMaps, built and run",
      ops: 20_000,
      functype: (i) => {
        let io = IO.succeed(i)
        for (let k = 0; k < 50; k++) io = io.flatMap((x) => IO.succeed(x + 1))
        return io.runSyncOrThrow()
      },
      effect: (i) => {
        let ef = Effect.succeed(i)
        for (let k = 0; k < 50; k++) ef = Effect.flatMap(ef, (x) => Effect.succeed(x + 1))
        return Effect.runSync(ef)
      },
    },
    {
      id: "gen-10",
      group: "Effects, run synchronously",
      name: "A generator with 10 yields",
      ops: 50_000,
      functype: (i) =>
        IO.gen(function* () {
          let x = i
          for (let k = 0; k < 10; k++) x = yield* IO.succeed(x + 1)
          return x
        }).runSyncOrThrow(),
      effect: (i) =>
        Effect.runSync(
          Effect.gen(function* () {
            let x = i
            for (let k = 0; k < 10; k++) x = yield* Effect.succeed(x + 1)
            return x
          }),
        ),
    },
    {
      id: "catch-tag",
      group: "Effects, run synchronously",
      name: "Fail, then recover by tag",
      ops: 200_000,
      functype: (i) =>
        IO.fail(new Boom())
          .catchTag("Boom", () => IO.succeed(i))
          .runSyncOrThrow(),
      effect: (i) => Effect.runSync(Effect.catchTag(Effect.fail(new Boom()), "Boom", () => Effect.succeed(i))),
    },
    {
      id: "service",
      group: "Effects, run synchronously",
      name: "Read a service, provide it, run",
      ops: 200_000,
      functype: (i) =>
        IO.service(DbF)
          .map((d) => d.k + i)
          .provideService(DbF, db)
          .runSyncOrThrow(),
      effect: (i) =>
        Effect.runSync(
          Effect.provideService(
            Effect.map(DbE, (d) => d.k + i),
            DbE,
            db,
          ),
        ),
    },
    {
      id: "promise",
      group: "Effects, run asynchronously",
      name: "Wrap a promise, map, run",
      ops: 100_000,
      async: true,
      functype: (i) =>
        IO.async(() => Promise.resolve(i))
          .map(inc)
          .runOrThrow(),
      effect: (i) =>
        Effect.runPromise(
          Effect.map(
            Effect.promise(() => Promise.resolve(i)),
            inc,
          ),
        ),
    },
    {
      id: "async-50",
      group: "Effects, run asynchronously",
      name: "50 steps, run as a promise",
      ops: 10_000,
      async: true,
      functype: (i) => {
        let io = IO.succeed(i)
        for (let k = 0; k < 50; k++) io = io.flatMap((x) => IO.succeed(x + 1))
        return io.runOrThrow()
      },
      effect: (i) => {
        let ef = Effect.succeed(i)
        for (let k = 0; k < 50; k++) ef = Effect.flatMap(ef, (x) => Effect.succeed(x + 1))
        return Effect.runPromise(ef)
      },
    },
  ]
}
