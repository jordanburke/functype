import { describe, expect, expectTypeOf, it } from "vitest"

import { $, Do, DoAsync } from "@/do"
import type { Reshapeable } from "@/reshapeable/Reshapeable"
import { Either, Exit, List, Option, Try } from "@/index"

/**
 * Pins the result type of Do and DoAsync per kind of generator. Option-only and Try-only comprehensions
 * were typed `unknown`: the structural overloads matched Option and Try through a get() method that both
 * types had dropped. A mix that includes Option or Try is still `unknown` on purpose, because callers
 * cast it to a concrete monad (see do-comprehensive.spec.ts), and Reshapeable would refuse those casts.
 */
describe("Do result types", () => {
  it("an Option-only comprehension is an Option", () => {
    const result = Do(function* () {
      const x = yield* $(Option(5))
      const y = yield* $(Option(10))
      return x + y
    })
    expectTypeOf(result).toEqualTypeOf<Option<number>>()
    expect(result.orElse(0)).toBe(15)
  })

  it("a Try-only comprehension is a Try", () => {
    const result = Do(function* () {
      const x = yield* $(Try(() => 2))
      return x * 3
    })
    expectTypeOf(result).toEqualTypeOf<Try<number>>()
    expect(result.orElse(0)).toBe(6)
  })

  it("an Option chain over optional fields keeps its types", () => {
    type User = { readonly profile?: { readonly settings?: { readonly theme: string } } }
    const user: User | undefined = { profile: { settings: { theme: "dark" } } }
    const theme = Do(function* () {
      const u = yield* $(Option(user))
      const profile = yield* $(Option(u.profile))
      const settings = yield* $(Option(profile.settings))
      return settings.theme
    }).orElse("light")
    expectTypeOf(theme).toEqualTypeOf<string>()
    expect(theme).toBe("dark")
  })

  it("List-only and Either-only comprehensions keep their types", () => {
    const list = Do(function* () {
      const x = yield* $(List([1, 2]))
      return x * 10
    })
    expectTypeOf(list).toEqualTypeOf<List<number>>()
    expect(list.toArray()).toEqual([10, 20])

    const either = Do(function* () {
      const x = yield* $(Either.right<string, number>(4))
      return x + 1
    })
    expectTypeOf(either).toEqualTypeOf<Either<unknown, number>>()
  })

  it("a mix that includes Option or Try stays unknown, so existing casts compile", () => {
    const mixed = Do(function* () {
      const x = yield* $(Option(5))
      const y = yield* $(Either.right<string, number>(10))
      return x + y
    })
    expectTypeOf(mixed).toEqualTypeOf<unknown>()
    expect((mixed as Option<number>).orElse(0)).toBe(15)
    expectTypeOf(
      Do(function* () {
        const x = yield* $(Either.right<string, number>(1))
        const y = yield* $(List([2, 3]))
        return x + y
      }),
    ).toEqualTypeOf<Reshapeable<number>>()
  })
})

describe("values Do cannot run", () => {
  it("an Exit is not taken for a Try, though it has isSuccess() and orThrow()", () => {
    const exit = Exit.succeed<never, number>(1)
    expectTypeOf($(exit)).toEqualTypeOf<Generator<Exit<never, number>, unknown, unknown>>()
    // Type only: Do throws at runtime on an Exit, which is why it must not be typed as a Try.
    const comprehension = () =>
      exit.isSuccess()
        ? Do(function* () {
            return yield* $(exit)
          })
        : undefined
    expectTypeOf<ReturnType<typeof comprehension>>().toEqualTypeOf<unknown>()
  })
})

describe("DoAsync result types", () => {
  it("Option-only and Try-only comprehensions resolve to Option and Try", async () => {
    const option = DoAsync(async function* () {
      const x = yield* $(Option(1))
      const y = yield* $(Option(await Promise.resolve(2)))
      return x + y
    })
    expectTypeOf(option).toEqualTypeOf<Promise<Option<number>>>()
    expect((await option).orElse(0)).toBe(3)

    const attempt = DoAsync(async function* () {
      const x = yield* $(Try(() => 5))
      return x
    })
    expectTypeOf(attempt).toEqualTypeOf<Promise<Try<number>>>()
  })
})
