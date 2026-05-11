import { describe, expect, expectTypeOf, it } from "vitest"

import { type Either, Left, Right } from "@/either/Either"

/**
 * These tests guard Either's variance. Either must be:
 *   - covariant in L (error channel widens via subtyping)
 *   - covariant in R (success channel widens via subtyping)
 *
 * Invariance in either parameter breaks common idioms like returning
 * `Either<UnionError, T>` from a function that internally constructs
 * narrow-tagged Left values, or calling `.swap()` / `.or()` against
 * Either values with differently-typed sides.
 *
 * History of regressions this file guards:
 *   - 0.57.0: LeftOf/RightOf split made Either invariant in L via `or`,
 *             `ap`, `flatMap`, `flatMapAsync`, `traverse`.
 *   - 0.57.2: `or` widened to `or<L2>(alt: Either<L2, R>): Either<L | L2, R>`.
 *             L invariance remained via `ap` / `flatMap` / etc.
 *   - 0.57.3: `ap`, `flatMap`, `flatMapAsync`, `traverse` widened similarly.
 *             L invariance still reachable via swap() -> R invariance via
 *             orElse: (R) => R.
 *   - 0.58.0: full Scala-aligned sum-type hierarchy — Either/Try no longer
 *             extend collection-ish typeclasses; `<out L, out R>` variance
 *             annotations land; reduce/reduceRight/size/isEmpty/toList
 *             removed from Either and Try.
 */

// ---------- Fixtures: realistic tagged-union error types ----------

type FileNotFound = { readonly _tag: "FileNotFound"; readonly path: string }
type ParseError = { readonly _tag: "ParseError"; readonly message: string }
type ValidationError = { readonly _tag: "ValidationError"; readonly errors: string[] }
type ReadError = { readonly _tag: "ReadError"; readonly message: string }

type ConfigError = FileNotFound | ParseError | ValidationError | ReadError

type FnoxNotFound = { readonly _tag: "FnoxNotFound"; readonly message: string }
type FnoxCliError = { readonly _tag: "FnoxCliError"; readonly message: string }

type FnoxError = FnoxNotFound | FnoxCliError

type BootError = ConfigError | FnoxError

// Narrow / Wide R types for R-variance checks
type UserV1 = { readonly name: string }
type UserV2 = UserV1 & { readonly email: string }

// ==================== L COVARIANCE ====================

describe("Either L covariance", () => {
  it("assigns narrow Left to wide Either (direct)", () => {
    const narrow: Either<FileNotFound, number> = Left({ _tag: "FileNotFound", path: "x" })
    const wide: Either<ConfigError, number> = narrow
    expectTypeOf(wide).toEqualTypeOf<Either<ConfigError, number>>()
  })

  it("assigns deeply nested narrow Left to wide Either", () => {
    const narrow: Either<FnoxNotFound, number> = Left({ _tag: "FnoxNotFound", message: "no fnox" })
    const boot: Either<BootError, number> = narrow
    expectTypeOf(boot).toEqualTypeOf<Either<BootError, number>>()
  })

  it("assigns Right-constructed value to wider error type", () => {
    const r: Either<FileNotFound, number> = Right(42)
    const wide: Either<ConfigError, number> = r
    expectTypeOf(wide).toEqualTypeOf<Either<ConfigError, number>>()
  })

  it("widens via function return annotation (real-world pattern)", () => {
    const loadConfig = (): Either<ConfigError, string> => {
      if (Math.random() > 0.5) return Left({ _tag: "FileNotFound", path: "x" } as const)
      if (Math.random() > 0.5) return Left({ _tag: "ParseError", message: "bad" } as const)
      return Right("ok")
    }
    expectTypeOf(loadConfig()).toEqualTypeOf<Either<ConfigError, string>>()
  })

  it("widens through flatMap with heterogeneous error types (L union)", () => {
    const step1 = (): Either<ConfigError, string> => Right("x")
    const step2 = (_s: string): Either<FnoxError, number> => Right(1)

    const result = step1().flatMap(step2)
    expectTypeOf(result).toEqualTypeOf<Either<ConfigError | FnoxError, number>>()
  })

  it("widens through traverse", () => {
    const step = (_x: number): Either<FnoxError, string> => Right("a")
    const e: Either<ConfigError, number> = Right(1)
    const result = e.traverse(step)
    expectTypeOf(result).toEqualTypeOf<Either<ConfigError | FnoxError, string[]>>()
  })

  it("widens through ap (applicative)", () => {
    const fn: Either<FnoxError, (n: number) => string> = Right((n) => String(n))
    const val: Either<ConfigError, number> = Right(1)
    const result = val.ap(fn)
    expectTypeOf(result).toEqualTypeOf<Either<ConfigError | FnoxError, string>>()
  })

  it("widens through or", () => {
    const a: Either<ConfigError, number> = Left({ _tag: "FileNotFound", path: "x" } as const)
    const b: Either<FnoxError, number> = Right(1)
    const result = a.or(b)
    expectTypeOf(result).toEqualTypeOf<Either<ConfigError | FnoxError, number>>()
  })

  it("widens through flatMapAsync", async () => {
    const step = async (_n: number): Promise<Either<FnoxError, string>> => Right("a")
    const e: Either<ConfigError, number> = Right(1)
    const result = await e.flatMapAsync(step)
    expectTypeOf(result).toEqualTypeOf<Either<ConfigError | FnoxError, string>>()
  })
})

// ==================== R COVARIANCE ====================

describe("Either R covariance", () => {
  it("assigns narrow Right to wide Either", () => {
    const narrow: Either<string, UserV2> = Right({ name: "a", email: "b" })
    const wide: Either<string, UserV1> = narrow
    expectTypeOf(wide).toEqualTypeOf<Either<string, UserV1>>()
  })

  it("preserves R-covariance through swap (L widens when viewed as swapped R)", () => {
    // swap() is the critical propagator: L-widening on the original
    // requires R-covariance on the swapped result, because swap flips L and R.
    const narrow: Either<FileNotFound, number> = Left({ _tag: "FileNotFound", path: "x" })
    const swapped: Either<number, FileNotFound> = narrow.swap()
    // Now widen the NEW R (which is the old L):
    const widenedSwap: Either<number, ConfigError> = swapped
    expectTypeOf(widenedSwap).toEqualTypeOf<Either<number, ConfigError>>()
  })

  it("orElse accepts a wider default and widens R", () => {
    const e: Either<string, UserV2> = Right({ name: "a", email: "b" })
    type Fallback = { readonly name: string; readonly guest: true }
    const fallback: Fallback = { name: "guest", guest: true }
    const result = e.orElse(fallback)
    // orElse<R2>(defaultValue: R2): R | R2
    expectTypeOf(result).toEqualTypeOf<UserV2 | Fallback>()
  })

  it("orElse still works with exact R", () => {
    const e: Either<string, number> = Left("err")
    const result: number = e.orElse(0)
    expectTypeOf(result).toEqualTypeOf<number>()
  })
})

// ==================== NEGATIVE CASES (must NOT compile) ====================

describe("Either variance — negative cases", () => {
  it("rejects wide Left assigned to narrow Either", () => {
    const wide: Either<ConfigError, number> = Left({ _tag: "ParseError", message: "x" } as const)
    // @ts-expect-error — ConfigError is not assignable to FileNotFound
    const narrow: Either<FileNotFound, number> = wide
    void narrow
  })

  it("rejects unrelated L types", () => {
    const a: Either<ConfigError, number> = Right(1)
    // @ts-expect-error — ConfigError is not assignable to FnoxError
    const b: Either<FnoxError, number> = a
    void b
  })

  it("rejects unrelated R types", () => {
    const a: Either<string, number> = Right(1)
    // @ts-expect-error — number is not assignable to string
    const b: Either<string, string> = a
    void b
  })

  it("rejects Left value with wrong discriminant", () => {
    // @ts-expect-error — "WrongTag" is not a ConfigError tag
    const bad: Either<ConfigError, number> = Left({ _tag: "WrongTag", path: "x" } as const)
    void bad
  })
})

// ==================== STRUCTURAL CHAIN TESTS ====================

describe("Either — structural variance chains", () => {
  it("map -> swap -> widen (triggers 0.57.3 regression)", () => {
    const e: Either<FileNotFound, number> = Left({ _tag: "FileNotFound", path: "x" })
    const mapped = e.map((n) => n + 1) // Either<FileNotFound, number>
    const swapped = mapped.swap() // Either<number, FileNotFound>
    const widened: Either<number, ConfigError> = swapped
    expectTypeOf(widened).toEqualTypeOf<Either<number, ConfigError>>()
  })

  it("bimap into wider error types", () => {
    const e: Either<FileNotFound, UserV2> = Left({ _tag: "FileNotFound", path: "x" })
    const result = e.bimap<ConfigError, UserV1>(
      (err) => err as ConfigError,
      (user) => user as UserV1,
    )
    expectTypeOf(result).toEqualTypeOf<Either<ConfigError, UserV1>>()
  })

  it("mapLeft widens L", () => {
    const e: Either<FileNotFound, number> = Left({ _tag: "FileNotFound", path: "x" })
    const result = e.mapLeft((err): ConfigError => err)
    expectTypeOf(result).toEqualTypeOf<Either<ConfigError, number>>()
  })

  it("real-world multi-step pipeline (envpkt boot pattern)", () => {
    const resolveConfigPath = (): Either<ConfigError, string> => Right("/path")
    const loadConfig = (_p: string): Either<ConfigError, { name: string }> => Right({ name: "a" })
    const resolveCatalog = (_c: { name: string }): Either<FnoxError, { name: string }> => Right({ name: "a" })

    const boot = (): Either<BootError, { name: string }> =>
      resolveConfigPath()
        .flatMap((p) => loadConfig(p))
        .flatMap(resolveCatalog)

    expectTypeOf(boot()).toEqualTypeOf<Either<BootError, { name: string }>>()
  })

  it("Left with const-asserted narrow tag widens to union", () => {
    // This is the #1 broken pattern in envpkt — functions returning
    // Either<UnionError, R> that construct Left with specific tags.
    const f = (): Either<ConfigError, string> => {
      return Left({ _tag: "FileNotFound", path: "x" } as const)
    }
    expectTypeOf(f()).toEqualTypeOf<Either<ConfigError, string>>()
  })

  it("fold preserves wide return type when widening is explicit", () => {
    const e: Either<FileNotFound, number> = Left({ _tag: "FileNotFound", path: "x" })
    const result = e.fold<Either<ConfigError, string>>(
      (err) => Left(err),
      (n) => Right(String(n)),
    )
    expectTypeOf(result).toEqualTypeOf<Either<ConfigError, string>>()
  })
})

// ==================== RUNTIME BEHAVIOR SANITY ====================

describe("Either variance — runtime behavior unchanged", () => {
  it("flatMap still threads values", () => {
    const e: Either<string, number> = Right(2)
    const result = e.flatMap((n): Either<string, number> => Right(n * 3))
    expect(result.isRight()).toBe(true)
    if (result.isRight()) expect(result.value).toBe(6)
  })

  it("or returns first Right", () => {
    const a: Either<string, number> = Right(1)
    const b: Either<string, number> = Right(2)
    const c = a.or(b)
    if (c.isRight()) expect(c.value).toBe(1)
  })

  it("or returns alternative when first is Left", () => {
    const a: Either<string, number> = Left("err")
    const b: Either<string, number> = Right(2)
    const c = a.or(b)
    if (c.isRight()) expect(c.value).toBe(2)
  })

  it("orElse returns default on Left", () => {
    const a: Either<string, number> = Left("err")
    expect(a.orElse(99)).toBe(99)
  })

  it("swap flips sides", () => {
    const a: Either<string, number> = Right(5)
    const s = a.swap()
    if (s.isLeft()) expect(s.value).toBe(5)
  })
})
