import { describe, expect, it } from "vitest"

import type { Either } from "@/either/Either"
import { Left, Right } from "@/either/Either"

type ErrA = { _tag: "ErrA" }
type ErrB = { _tag: "ErrB" }
type ErrC = { _tag: "ErrC" }

describe("Either L widening (regression 0.57)", () => {
  describe("or", () => {
    it("widens L when alternative carries a different L type", () => {
      const narrow: Either<ErrA, number> = Left({ _tag: "ErrA" })
      const fallback: Either<ErrB, number> = Right(42)
      const widened = narrow.or(fallback)
      const check: Either<ErrA | ErrB, number> = widened
      expect(check.orElse(-1)).toBe(42)
    })

    it("preserves same-L behavior", () => {
      expect(Right<string, number>(1).or(Right<string, number>(2)).orElse(-1)).toBe(1)
      expect(Left<string, number>("err").or(Right<string, number>(99)).orElse(-1)).toBe(99)
    })
  })

  describe("flatMap", () => {
    it("widens L across chain with heterogeneous error types", () => {
      const step1 = (n: number): Either<ErrA, number> => (n > 0 ? Right(n) : Left({ _tag: "ErrA" }))
      const step2 = (n: number): Either<ErrB, string> => (n < 100 ? Right(`ok-${n}`) : Left({ _tag: "ErrB" }))

      const result = step1(5).flatMap(step2)
      const check: Either<ErrA | ErrB, string> = result
      expect(check.orElse("fallback")).toBe("ok-5")
    })

    it("accumulates the union across three-step chain", () => {
      const step1 = (n: number): Either<ErrA, number> => Right(n)
      const step2 = (n: number): Either<ErrB, number> => Right(n + 1)
      const step3 = (n: number): Either<ErrC, number> => Right(n * 2)

      const result = step1(1).flatMap(step2).flatMap(step3)
      const check: Either<ErrA | ErrB | ErrC, number> = result
      expect(check.orElse(-1)).toBe(4)
    })
  })

  describe("ap", () => {
    it("widens L when applied function carries a different L type", () => {
      const fn: Either<ErrB, (n: number) => string> = Right((n) => `v${n}`)
      const val: Either<ErrA, number> = Right(7)
      const result = val.ap(fn)
      const check: Either<ErrA | ErrB, string> = result
      expect(check.orElse("x")).toBe("v7")
    })
  })

  describe("flatMapAsync", () => {
    it("widens L across async chain", async () => {
      const start: Either<ErrA, number> = Right(3)
      const result = await start.flatMapAsync(async (n): Promise<Either<ErrB, string>> => Right(`n=${n}`))
      const check: Either<ErrA | ErrB, string> = result
      expect(check.orElse("x")).toBe("n=3")
    })
  })

  describe("traverse", () => {
    it("widens L when traversed fn carries a different L type", () => {
      const start: Either<ErrA, number> = Right(4)
      const result = start.traverse((n): Either<ErrB, number> => Right(n * 10))
      const check: Either<ErrA | ErrB, number[]> = result
      expect(check.orElse([])).toEqual([40])
    })
  })
})
