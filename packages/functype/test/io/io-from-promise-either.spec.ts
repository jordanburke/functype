import { describe, expect, it } from "vitest"

import type { Either } from "@/either"
import { Left, Right } from "@/either"
import { IO } from "@/io"

/**
 * `IO.fromPromiseEither` lifts `() => Promise<Either<E, A>>` into `IO<never, E, A>` (#327). Before it,
 * `IO.async` widened E to `unknown`, and `IO.tryAsync(...).flatMap(IO.fromEither)` needed a rejection
 * mapper for a promise that is not expected to reject.
 */
describe("IO.fromPromiseEither", () => {
  it("a Right becomes the success value", async () => {
    const io: IO<never, string, number> = IO.fromPromiseEither(async () => Right<string, number>(42))
    expect(await io.runOrThrow()).toBe(42)
  })

  it("a Left becomes a typed failure", async () => {
    const exit = await IO.fromPromiseEither(async () => Left<string, number>("nope")).runExit()
    expect(exit.isFailure()).toBe(true)
    expect(exit.toValue().error).toBe("nope")
  })

  it("does not call the function until run", async () => {
    const calls: string[] = []
    const io = IO.fromPromiseEither(async () => {
      calls.push("called")
      return Right<string, number>(1)
    })
    expect(calls).toEqual([])
    await io.run()
    expect(calls).toEqual(["called"])
  })

  it("a rejection is a defect by default, not an E", async () => {
    const exit = await IO.fromPromiseEither((): Promise<Either<string, number>> =>
      Promise.reject(new Error("crash")),
    ).runExit()
    expect(exit.isDie()).toBe(true)
  })

  it("onReject maps a rejection into the error channel", async () => {
    const io: IO<never, string | { readonly kind: "rejected" }, number> = IO.fromPromiseEither(
      (): Promise<Either<string, number>> => Promise.reject(new Error("crash")),
      () => ({ kind: "rejected" as const }),
    )
    const exit = await io.runExit()
    expect(exit.toValue().error).toEqual({ kind: "rejected" })
  })

  it("composes with IO.forEach: in order, stopping at the first Left", async () => {
    const seen: number[] = []
    const save = async (n: number): Promise<Either<string, number>> => {
      seen.push(n)
      return n === 2 ? Left(`bad ${n}`) : Right(n * 10)
    }
    const result = await IO.forEach([1, 2, 3], (n) => IO.fromPromiseEither(() => save(n))).run()
    expect(seen).toEqual([1, 2])
    expect(result.isLeft() && result.value).toBe("bad 2")
  })
})
