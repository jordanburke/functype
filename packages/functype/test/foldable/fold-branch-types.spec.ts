import { describe, expect, expectTypeOf, it } from "vitest"

import type { IOType } from "@/index"
import { Either, Exit, IO, List, Map, None, Obj, Option, Some, Try } from "@/index"
import { TracedOption } from "@/traced"

/**
 * `fold` and `match` on a sum type take branches of different types, and return their union
 * (#653). Each has two overloads: the one-type form first, so every call that compiled before
 * keeps its inferred type, and the two-type form second, for branches that differ.
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

  it("widens match on Option, Either, Try, List and Map", () => {
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
