import { describe, expectTypeOf, it } from "vitest"

import { IO } from "@/io"

/**
 * Guards IO<R, E, A> variance: `<in out R, out E, out A>`.
 *
 *   - E covariant: `IO<R, never, A>` assigns to `IO<R, WideE, A>` without cast.
 *   - A covariant: `IO<R, E, Narrow>` assigns to `IO<R, E, Wide>` without cast.
 *   - R invariant (current state; ZIO-style `<in R>` deferred).
 *
 * History of regressions this file guards:
 *   - 0.60.x: `IO<R, E, A>` was invariant because `IOEffect`'s `RecoverWith`
 *     and `Fold` branches stored `f: (e: E) => IO<R, E, A>` — E in both
 *     param and return of one stored callback makes that function type
 *     invariant in E, which propagated through the `[IOEffectKey]` field.
 *   - 0.60.1: fixed by widening stored callback inputs to `unknown`
 *     (matches pre-existing `Map`/`FlatMap`/`MapError` pattern).
 *     Consumers that previously needed `IO.succeed(v) as unknown as IO<never, ApiError, T>`
 *     can now write `IO.succeed(v)` and let covariance do the work.
 */

type ApiError = { readonly _tag: "ApiError"; readonly message: string }
type NetworkError = { readonly _tag: "NetworkError"; readonly cause: unknown }
type WideError = ApiError | NetworkError

class Animal {
  readonly kind = "animal" as const
}
class Dog extends Animal {
  readonly breed = "dog" as const
}

describe("IO covariance in E", () => {
  it("widens IO<never, never, A> to IO<never, ApiError, A> without cast", () => {
    const pure = IO.succeed(42)
    const widened: IO<never, ApiError, number> = pure
    expectTypeOf(widened).toEqualTypeOf<IO<never, ApiError, number>>()
  })

  it("widens narrow tagged error to union error without cast", () => {
    const narrow: IO<never, ApiError, string> = IO.fail<ApiError>({ _tag: "ApiError", message: "nope" })
    const wide: IO<never, WideError, string> = narrow
    expectTypeOf(wide).toEqualTypeOf<IO<never, WideError, string>>()
  })

  it("flows through flatMap — result E is unioned narrowly", () => {
    const chained = IO.succeed(1).flatMap((n) =>
      n > 0 ? IO.succeed(n * 2) : IO.fail<ApiError>({ _tag: "ApiError", message: "bad" }),
    )
    // With <out E>, no cast needed to assign to a wider error set.
    const wide: IO<never, WideError, number> = chained
    expectTypeOf(wide).toEqualTypeOf<IO<never, WideError, number>>()
  })

  it("rejects narrowing (@ts-expect-error)", () => {
    const wide: IO<never, WideError, string> = IO.fail<WideError>({ _tag: "ApiError", message: "x" })
    // @ts-expect-error — can't narrow covariant E
    const narrow: IO<never, ApiError, string> = wide
    void narrow
  })
})

describe("IO covariance in A", () => {
  it("widens IO<R, E, Dog> to IO<R, E, Animal>", () => {
    const dogIO: IO<never, never, Dog> = IO.succeed(new Dog())
    const animalIO: IO<never, never, Animal> = dogIO
    expectTypeOf(animalIO).toEqualTypeOf<IO<never, never, Animal>>()
  })

  it("rejects narrowing A (@ts-expect-error)", () => {
    const animalIO: IO<never, never, Animal> = IO.succeed(new Animal())
    // @ts-expect-error — can't narrow covariant A
    const dogIO: IO<never, never, Dog> = animalIO
    void dogIO
  })
})
