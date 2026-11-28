import { describe, expect, expectTypeOf, it } from "vitest"

import type { IOType } from "@/index"
import { Either, Exit, IO, Left, List, Map, None, Obj, Option, Right, Some, Stack, Try } from "@/index"
import { TracedOption } from "@/traced"

/**
 * `fold` and `match` on a sum type take branches of different types (#653). The result is
 * `Unify<U, V>`: the wider branch type when one contains the other, so every call that compiled
 * before keeps its inferred type, and `U | V` otherwise. It is one signature, not an overload
 * pair, because TypeScript can't call an overloaded method on a union receiver.
 */

type Forbidden = { readonly _tag: "Forbidden" }
type Missing = { readonly _tag: "Missing" }
const forbidden: Forbidden = { _tag: "Forbidden" }
const missing: Missing = { _tag: "Missing" }

const some = Option<{ name: string }>({ name: "ada" })
const none = Option<{ name: string }>(undefined)
const o: Option<number> = Option(1)

describe("fold and match with branches of different types", () => {
  it("compiles IO.fail against IO.succeed under a declared type, flatMap and IO.gen", async () => {
    const declared = (opt: Option<{ name: string }>): IOType<never, Forbidden, string> =>
      opt.fold(
        () => IO.fail(forbidden),
        (r) => IO.succeed(r.name),
      )
    const chained = IO.succeed(none).flatMap((opt) =>
      opt.fold(
        () => IO.fail(forbidden),
        (r) => IO.succeed(r.name),
      ),
    )
    const generated = IO.gen(function* () {
      return yield* some.fold(
        () => IO.fail(forbidden),
        (r) => IO.succeed(r.name),
      )
    })
    expectTypeOf(chained).toEqualTypeOf<IOType<never, Forbidden, string>>()
    expectTypeOf(generated).toEqualTypeOf<IOType<never, Forbidden, string>>()
    expect((await declared(some).run()).orThrow()).toBe("ada")
    expect((await chained.run()).isLeft()).toBe(true)
    expect((await generated.run()).orThrow()).toBe("ada")
  })

  it("unions two different errors", () => {
    const io = none.fold(
      () => IO.fail(forbidden),
      () => IO.fail(missing),
    )
    expectTypeOf(io).toEqualTypeOf<IOType<never, Forbidden, never> | IOType<never, Missing, never>>()
  })

  it("widens match on Option, Either, Try, List, Map and Stack", () => {
    expectTypeOf(Stack([1]).match({ Empty: () => "empty" as const, NonEmpty: (vs) => vs.length })).toEqualTypeOf<
      "empty" | number
    >()
    expectTypeOf(o.match({ None: () => "none" as const, Some: (n) => n })).toEqualTypeOf<number | "none">()
    const either: Either<Missing, number> = Either.right(1)
    expectTypeOf(either.match({ Left: (l) => l._tag, Right: (n) => n })).toEqualTypeOf<"Missing" | number>()
    expectTypeOf(Try(() => 1).match({ Success: (n) => n, Failure: () => null })).toEqualTypeOf<number | null>()
    expectTypeOf(List([1]).match({ Empty: () => "empty" as const, NonEmpty: (vs) => vs.length })).toEqualTypeOf<
      "empty" | number
    >()
    expectTypeOf(
      Map<string, number>([]).match({ Empty: () => "empty" as const, NonEmpty: (es) => es.length }),
    ).toEqualTypeOf<"empty" | number>()
  })

  it("widens fold on Either, Try and Obj", () => {
    const either: Either<Missing, number> = Either.left(missing)
    expectTypeOf(
      either.fold(
        (l) => l._tag,
        (n) => n,
      ),
    ).toEqualTypeOf<"Missing" | number>()
    expectTypeOf(
      Try(() => 1).fold(
        () => null,
        (n) => n,
      ),
    ).toEqualTypeOf<null | number>()
    expectTypeOf(
      Obj({ a: 1 }).fold(
        () => "none" as const,
        (v) => v.a,
      ),
    ).toEqualTypeOf<"none" | number>()
    expect(
      either.fold(
        (l) => l._tag,
        (n) => n,
      ),
    ).toBe("Missing")
  })

  it("widens TracedOption.fold", () => {
    const traced = TracedOption(Some(1), { emit: () => undefined }, "span")
    const folded = traced.fold(
      () => "none" as const,
      (n) => n,
    )
    expectTypeOf(folded).toEqualTypeOf<"none" | number>()
    expect(folded).toBe(1)
  })

  it("widens IO.fold and IO.match", async () => {
    const folded = IO.succeed(1).fold(
      () => "bad" as const,
      (n) => n,
    )
    const matched = IO.fail(missing).match({ failure: (e) => e._tag, success: () => 0 })
    expectTypeOf(folded).toEqualTypeOf<IOType<never, never, "bad" | number>>()
    expectTypeOf(matched).toEqualTypeOf<IOType<never, never, "Missing" | number>>()
    expect((await folded.run()).orThrow()).toBe(1)
    expect((await matched.run()).orThrow()).toBe("Missing")
  })

  it("widens Exit.fold and Exit.match over every handler", () => {
    const exit: Exit<Missing, number> = Exit.fail(missing)
    expectTypeOf(
      exit.fold(
        (e) => e._tag,
        (n) => n,
        () => null,
        () => false,
      ),
    ).toEqualTypeOf<"Missing" | number | null | boolean>()
    expectTypeOf(exit.match({ Success: (n) => n, Failure: (e) => e._tag, Interrupted: () => null })).toEqualTypeOf<
      number | "Missing" | null
    >()
    expect(
      exit.fold(
        (e) => e._tag,
        (n) => n,
      ),
    ).toBe("Missing")
  })
})

describe("fold and match keep the types they inferred before", () => {
  it("infers one type when the branches share one", () => {
    expectTypeOf(
      o.fold<string>(
        () => "none",
        (n) => String(n),
      ),
    ).toEqualTypeOf<string>()
    expectTypeOf(
      o.fold(
        () => "none",
        () => "some",
      ),
    ).toEqualTypeOf<string>()
    expectTypeOf(
      o.fold(
        () => 0,
        (v) => v,
      ),
    ).toEqualTypeOf<number>()
    expectTypeOf(
      o.fold(
        () => null,
        (v) => v,
      ),
    ).toEqualTypeOf<number | null>()
    const typed: Option<number> = o.fold(
      () => None(),
      (v) => Some(v),
    )
    expect(typed.orThrow()).toBe(1)
  })

  it("keeps one type on Either, Try, Exit and IO when the branches share one", () => {
    const either: Either<Missing, number> = Either.right(1)
    expectTypeOf(
      either.fold(
        () => 0,
        (n) => n,
      ),
    ).toEqualTypeOf<number>()
    expectTypeOf(
      Try(() => 1).fold(
        () => [],
        (n) => [n],
      ),
    ).toEqualTypeOf<number[]>()
    const exit: Exit<Missing, number> = Exit.succeed(1)
    expectTypeOf(
      exit.fold(
        () => 0,
        (n) => n,
      ),
    ).toEqualTypeOf<number>()
    expectTypeOf(
      IO.succeed(1).fold(
        () => 0,
        (n) => n,
      ),
    ).toEqualTypeOf<IOType<never, never, number>>()
  })

  it("keeps an empty array branch and an element branch as one array type", () => {
    const folded = o.fold(
      () => [],
      (v) => [v],
    )
    expectTypeOf(folded).toEqualTypeOf<number[]>()
    expect(folded.includes(1)).toBe(true)
    const matched = List<number>([]).match({ Empty: () => [], NonEmpty: (vs) => vs })
    expectTypeOf(matched).toEqualTypeOf<number[]>()
    expect(matched.includes(1)).toBe(false)
  })
})

describe("fold and match on a union receiver", () => {
  const flag = Math.random() > 2

  it("still resolves on a union of two IOs", async () => {
    const io = (flag ? IO.succeed(1) : IO.fail(missing)).fold(
      () => 0,
      (r) => r,
    )
    expectTypeOf(io).toEqualTypeOf<IOType<never, never, number>>()
    expect((await io.run()).orThrow()).toBe(0)
  })

  it("still resolves on a union of two Eithers, two Options, and an Option or a Try", () => {
    const either = (v: number) => {
      if (v > 0) return Right<string, number>(v)
      return Left<Error, number>(new Error("x"))
    }
    const option = (v: number) => (v > 0 ? Option(v) : Option("s"))
    const two: Option<number> | Try<number> = flag ? Option(1) : Try(() => 1)
    expectTypeOf(
      either(1).fold(
        (l) => String(l),
        (r) => String(r),
      ),
    ).toEqualTypeOf<string>()
    expectTypeOf(
      option(1).fold(
        () => "n",
        (r) => String(r),
      ),
    ).toEqualTypeOf<string>()
    expectTypeOf(
      two.fold(
        () => 0,
        (n: number) => n,
      ),
    ).toEqualTypeOf<number>()
    expect(
      option(1).fold(
        () => "n",
        (r) => String(r),
      ),
    ).toBe("1")
  })
})

describe("fold in generic code", () => {
  it("resolves to the type parameter's own types", () => {
    const orUndefined = <T>(x: Option<T>): T | undefined =>
      x.fold(
        () => undefined,
        (v) => v,
      )
    const orEmpty = <T>(x: Option<T>): Option<T> =>
      x.fold(
        () => None<T>(),
        (v) => Some(v),
      )
    expect(orUndefined(Option(1))).toBe(1)
    expect(orEmpty(Option(2)).orThrow()).toBe(2)
  })

  it("keeps an any branch any, as before", () => {
    const loose: unknown = "x"
    const anyBranch = o.fold(
      () => loose as never as ReturnType<typeof JSON.parse>,
      (v) => v,
    )
    expectTypeOf(anyBranch).toBeAny()
  })
})

describe("fold with branches that need different services", () => {
  it("still needs the services widened: IO isn't covariant in R yet", () => {
    type Db = { readonly db: true }
    const query: IOType<Db, never, string> = IO.succeed("row") as unknown as IOType<Db, never, string>
    // @ts-expect-error IO<never, Forbidden, never> doesn't widen to IO<Db, Forbidden, string>.
    const declared: IOType<Db, Forbidden, string> = none.fold(
      () => IO.fail(forbidden),
      () => query,
    )
    expect(declared).toBeDefined()
  })
})
