import { describe, expect, expectTypeOf, it } from "vitest"

import { Left, Right } from "@/either"
import type { IO as IOType } from "@/io"
import { IO } from "@/io"

/**
 * In functype 2 a throw inside `IO.map` is a defect, so `run()` rejects. `mapTry` is the map for a
 * callback you don't own: its throw becomes a typed error built by `onError` (#605).
 */
type ParseError = { readonly _tag: "ParseError"; readonly message: string }
const toParseError = (thrown: unknown): ParseError => ({
  _tag: "ParseError",
  message: thrown instanceof Error ? thrown.message : String(thrown),
})
const boom = (): number => {
  throw new Error("boom")
}

describe("IO.mapTry", () => {
  it("maps the value when f returns", async () => {
    expect(
      await IO.succeed(2)
        .mapTry((n) => n * 3, toParseError)
        .run(),
    ).toEqual(Right(6))
  })

  it("turns a throw in f into a typed failure", async () => {
    const exit = await IO.succeed(2).mapTry(boom, toParseError).runExit()

    expect(exit.isFailure()).toBe(true)
    expect(exit.isDie()).toBe(false)
    expect(await IO.succeed(2).mapTry(boom, toParseError).run()).toEqual(Left({ _tag: "ParseError", message: "boom" }))
  })

  it("passes onError exactly what was thrown", async () => {
    const thrown = { code: 42 }
    const seen: unknown[] = []
    await IO.succeed(1)
      .mapTry(
        () => {
          throw thrown
        },
        (e) => {
          seen.push(e)
          return "caught"
        },
      )
      .run()

    expect(seen).toEqual([thrown])
    expect(seen[0]).toBe(thrown)
  })

  it("leaves an earlier failure alone and doesn't call f", async () => {
    const calls: number[] = []
    const result = await IO.fail("earlier")
      .mapTry((n: number) => {
        calls.push(n)
        return n
      }, toParseError)
      .run()

    expect(result).toEqual(Left("earlier"))
    expect(calls).toEqual([])
  })

  it("is lazy: f doesn't run until the IO runs", async () => {
    const calls: number[] = []
    const io = IO.succeed(5).mapTry((n) => {
      calls.push(n)
      return n
    }, toParseError)

    expect(calls).toEqual([])
    await io.run()
    expect(calls).toEqual([5])
  })

  it("keeps a throw from onError a defect", async () => {
    const exit = await IO.succeed(1)
      .mapTry(boom, () => {
        throw new Error("onError bug")
      })
      .runExit()

    expect(exit.isDie()).toBe(true)
  })

  it("leaves plain map's throw a defect", async () => {
    const exit = await IO.succeed(1).map(boom).runExit()

    expect(exit.isDie()).toBe(true)
    await expect(IO.succeed(1).map(boom).run()).rejects.toThrow("boom")
  })

  it("catches only a synchronous throw: a rejected Promise is the value", async () => {
    const rejected = Promise.reject(new Error("async"))
    rejected.catch(() => undefined)

    const result = await IO.succeed(1)
      .mapTry(() => rejected, toParseError)
      .run()

    expect(result).toEqual(Right(rejected))
  })

  describe("equals flatMap with IO.tryCatch", () => {
    const viaFlatMap = <A, B>(io: IOType<never, ParseError, A>, f: (a: A) => B) =>
      io.flatMap((a) => IO.tryCatch(() => f(a), toParseError))

    it.each([
      ["a value", (n: number) => n + 1],
      ["a throw", boom],
    ])("for %s", async (_name, f) => {
      const io = IO.succeed<number>(1) as IOType<never, ParseError, number>
      expect(await io.mapTry(f, toParseError).run()).toEqual(await viaFlatMap(io, f).run())
    })

    it("when onError throws, both are a defect", async () => {
      const badOnError = (): ParseError => {
        throw new Error("onError bug")
      }
      const viaMapTry = await IO.succeed(1).mapTry(boom, badOnError).runExit()
      const viaTryCatch = await IO.succeed(1)
        .flatMap((n) => IO.tryCatch(() => boom() + n, badOnError))
        .runExit()

      expect(viaMapTry.isDie()).toBe(true)
      expect(viaTryCatch.isDie()).toBe(true)
    })
  })

  it("works the same under runSync", () => {
    expect(
      IO.succeed(2)
        .mapTry((n) => n * 3, toParseError)
        .runSync(),
    ).toEqual(Right(6))
    expect(IO.succeed(2).mapTry(boom, toParseError).runSync()).toEqual(Left({ _tag: "ParseError", message: "boom" }))
    expect(() =>
      IO.succeed(1)
        .mapTry(boom, () => {
          throw new Error("onError bug")
        })
        .runSync(),
    ).toThrow("onError bug")
  })

  it("never sees an interruption: f doesn't run and the run stays interrupted", async () => {
    const calls: number[] = []
    const exit = await IO.interrupt()
      .mapTry((n: number) => {
        calls.push(n)
        return n
      }, toParseError)
      .runExit()

    expect(exit.isInterrupted()).toBe(true)
    expect(calls).toEqual([])
  })

  it("composes inside IO.gen", async () => {
    const program = IO.gen(function* () {
      const n = yield* IO.succeed("21").mapTry((s) => Number.parseInt(s, 10), toParseError)
      return n * 2
    })

    expect(await program.run()).toEqual(Right(42))
  })

  it("lets retry re-run f, because the failure is typed", async () => {
    const attempts: number[] = []
    const result = await IO.succeed(1)
      .mapTry((n) => {
        attempts.push(n)
        return boom()
      }, toParseError)
      .retry(2)
      .run()

    expect(result.isLeft()).toBe(true)
    expect(attempts).toEqual([1, 1, 1])
  })

  it("adds onError's type to the error channel", () => {
    const io = IO.fail<"earlier">("earlier").mapTry((n: number) => String(n), toParseError)

    expectTypeOf(io).toEqualTypeOf<IOType<never, "earlier" | ParseError, string>>()
  })
})
