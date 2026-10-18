import { describe, expect, it, vi } from "vitest"

import { Either, Left, Right, tryCatchAsync } from "@/either/Either"

// mapAsync/flatMapAsync used to catch a rejection and return it as Left(reason as L),
// so a Left could hold a value that was not an L, and a synchronous throw from f escaped
// the Promise. They now reject in both cases, like List.mapAsync,
// Set.mapAsync and Either.traverseAsync. Turning a rejection into a Left goes through
// Either.fromPromise / tryCatchAsync, which take a function from the reason to L.
describe("Either async rejections", () => {
  const boom = new Error("boom")
  const rejects = (_n: number): Promise<number> => Promise.reject(boom)

  describe("mapAsync", () => {
    it("maps a Right", async () => {
      const result = await Right<string, number>(2).mapAsync((n) => Promise.resolve(n * 10))
      expect(result.toJSON()).toEqual(Right(20).toJSON())
    })

    it("rejects with the same reason when f rejects", async () => {
      await expect(Right<string, number>(1).mapAsync(rejects)).rejects.toBe(boom)
    })

    it("rejects when an async f throws after an await", async () => {
      const result = Right<string, number>(1).mapAsync(async () => {
        await Promise.resolve()
        throw boom
      })
      await expect(result).rejects.toBe(boom)
    })

    it("rejects, rather than throwing, when f throws synchronously", async () => {
      const throws = (_n: number): Promise<number> => {
        throw boom
      }
      const result = Right<string, number>(1).mapAsync(throws)
      await expect(result).rejects.toBe(boom)
    })

    it("resolves a Left without calling f", async () => {
      const f = vi.fn(rejects)
      const result = await Left<string, number>("no").mapAsync(f)
      expect(result.toJSON()).toEqual(Left("no").toJSON())
      expect(f).not.toHaveBeenCalled()
    })
  })

  describe("flatMapAsync", () => {
    it("returns the Either f resolves to", async () => {
      const toRight = await Right<string, number>(2).flatMapAsync((n) => Promise.resolve(Right<string, number>(n + 1)))
      const toLeft = await Right<string, number>(2).flatMapAsync(() => Promise.resolve(Left<string, number>("bad")))
      expect(toRight.toJSON()).toEqual(Right(3).toJSON())
      expect(toLeft.toJSON()).toEqual(Left("bad").toJSON())
    })

    it("rejects with the same reason when f rejects", async () => {
      const result = Right<string, number>(1).flatMapAsync((): Promise<Either<string, number>> => Promise.reject(boom))
      await expect(result).rejects.toBe(boom)
    })

    it("rejects, rather than throwing, when f throws synchronously", async () => {
      const throws = (_n: number): Promise<Either<string, number>> => {
        throw boom
      }
      const result = Right<string, number>(1).flatMapAsync(throws)
      await expect(result).rejects.toBe(boom)
    })

    it("resolves a Left without calling f", async () => {
      const f = vi.fn((): Promise<Either<string, number>> => Promise.reject(boom))
      const result = await Left<string, number>("no").flatMapAsync(f)
      expect(result.toJSON()).toEqual(Left("no").toJSON())
      expect(f).not.toHaveBeenCalled()
    })
  })

  describe("the explicit way to catch", () => {
    it("Either.fromPromise maps the reason into L", async () => {
      const result = await Either.fromPromise(rejects(1), (reason) => `caught: ${(reason as Error).message}`)
      expect(result.toJSON()).toEqual(Left("caught: boom").toJSON())
    })

    it("tryCatchAsync maps a rejection into L", async () => {
      const result = await tryCatchAsync(
        () => rejects(1),
        (reason) => `caught: ${(reason as Error).message}`,
      )
      expect(result.toJSON()).toEqual(Left("caught: boom").toJSON())
    })

    it("composes with flatMapAsync", async () => {
      const result = await Right<string, number>(1).flatMapAsync((n) =>
        Either.fromPromise(rejects(n), (reason) => (reason as Error).message),
      )
      expect(result.toJSON()).toEqual(Left("boom").toJSON())
    })
  })
})
