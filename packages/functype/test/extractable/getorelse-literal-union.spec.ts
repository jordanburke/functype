import { describe, expect, expectTypeOf, it } from "vitest"

import { Left, Right } from "@/either"
import type { Extractable } from "@/extractable"
import { Exit } from "@/io"
import { Lazy } from "@/lazy"
import { Map } from "@/map"
import { Obj } from "@/obj"
import { None, type Option, Some } from "@/option"
import { TracedOption } from "@/traced"
import { Try } from "@/try"

/**
 * `getOrElse<T2 = never>(defaultValue: () => T | T2): T | T2` types the default against the container's own
 * type first. A default that fits `T` keeps `T`, so a literal union is not widened to `string`. A default of
 * another type still widens the result to `T | T2`.
 */

type Theme = "light" | "dark"

const tracer = { emit: () => undefined }

const fail = (): never => {
  throw new Error("boom")
}

describe("getOrElse keeps a literal union", () => {
  it("Option", () => {
    const theme = None<Theme>().getOrElse(() => "light")
    expectTypeOf(theme).toEqualTypeOf<Theme>()
    expect(theme).toBe("light")
  })

  it("Either", () => {
    const theme = Left<string, Theme>("e").getOrElse(() => "light")
    expectTypeOf(theme).toEqualTypeOf<Theme>()
    expect(theme).toBe("light")
  })

  it("Try", () => {
    const theme = Try<Theme>(fail).getOrElse(() => "light")
    expectTypeOf(theme).toEqualTypeOf<Theme>()
    expect(theme).toBe("light")
  })

  it("Lazy", () => {
    const theme = Lazy<Theme>(fail).getOrElse(() => "light")
    expectTypeOf(theme).toEqualTypeOf<Theme>()
    expect(theme).toBe("light")
  })

  it("TracedOption", () => {
    const theme = TracedOption(None<Theme>(), tracer, "s").getOrElse(() => "light")
    expectTypeOf(theme).toEqualTypeOf<Theme>()
    expect(theme).toBe("light")
  })

  it("Extractable", () => {
    const extractable: Extractable<Theme> = None<Theme>()
    const theme = extractable.getOrElse(() => "light")
    expectTypeOf(theme).toEqualTypeOf<Theme>()
    expect(theme).toBe("light")
  })

  it("Obj", () => {
    const settings = Obj<{ theme: Theme }>({ theme: "dark" }).getOrElse(() => ({ theme: "light" }))
    const theme: Theme = settings.theme
    expect(theme).toBe("dark")
  })

  it("Exit and Map already keep it, because their default must be the value type", () => {
    const fromExit = Exit.fail<string, Theme>("e").getOrElse(() => "light")
    const fromMap = Map<string, Theme>([]).getOrElse("a", () => "light")
    expectTypeOf(fromExit).toEqualTypeOf<Theme>()
    expectTypeOf(fromMap).toEqualTypeOf<Theme>()
    expect([fromExit, fromMap]).toEqual(["light", "light"])
  })
})

describe("getOrElse widens to a default of another type", () => {
  it("Option", () => {
    const value = None<number>().getOrElse(() => "x")
    expectTypeOf(value).toEqualTypeOf<number | string>()
    expect(value).toBe("x")
  })

  it("Either", () => {
    const value = Left<string, number>("e").getOrElse(() => "x")
    expectTypeOf(value).toEqualTypeOf<number | string>()
    expect(value).toBe("x")
  })

  it("Try", () => {
    const value = Try<number>(fail).getOrElse(() => "x")
    expectTypeOf(value).toEqualTypeOf<number | string>()
    expect(value).toBe("x")
  })

  it("Lazy", () => {
    const value = Lazy<number>(fail).getOrElse(() => "x")
    expectTypeOf(value).toEqualTypeOf<number | string>()
    expect(value).toBe("x")
  })

  it("TracedOption", () => {
    const value = TracedOption(None<number>(), tracer, "s").getOrElse(() => "x")
    expectTypeOf(value).toEqualTypeOf<number | string>()
    expect(value).toBe("x")
  })

  it("Extractable", () => {
    const extractable: Extractable<number> = None<number>()
    const value = extractable.getOrElse(() => "x")
    expectTypeOf(value).toEqualTypeOf<number | string>()
    expect(value).toBe("x")
  })

  it("keeps null in the result", () => {
    expectTypeOf(None<number>().getOrElse(() => null)).toEqualTypeOf<number | null>()
    expectTypeOf(Right<string, number>(1).getOrElse(() => null)).toEqualTypeOf<number | null>()
    expect(None<number>().getOrElse(() => null)).toBeNull()
  })

  it("leaves T alone when the default throws", () => {
    expectTypeOf(Some(1).getOrElse(fail)).toEqualTypeOf<number>()
    expectTypeOf(Try(() => 1).getOrElse(fail)).toEqualTypeOf<number>()
    expect(Some(1).getOrElse(fail)).toBe(1)
  })

  it("keeps a generic T in generic code", () => {
    const orFirst = <A>(fallback: A): A => None<A>().getOrElse(() => fallback)
    expect(orFirst<Theme>("dark")).toBe("dark")
  })
})

describe("getOrElse(() => []) stays a mutable array", () => {
  it("is assignable to a plain mutable array on every type", () => {
    const fromOption: string[] = None<string[]>().getOrElse(() => [])
    const fromEither: string[] = Left<string, string[]>("e").getOrElse(() => [])
    const fromTry: string[] = Try<string[]>(fail).getOrElse(() => [])
    const fromLazy: string[] = Lazy<string[]>(fail).getOrElse(() => [])
    const fromTraced: string[] = TracedOption(None<string[]>(), tracer, "s").getOrElse(() => [])
    const extractable: Extractable<string[]> = None<string[]>()
    const fromExtractable: string[] = extractable.getOrElse(() => [])
    fromOption.push("a")
    expect([fromOption, fromEither, fromTry, fromLazy, fromTraced, fromExtractable]).toEqual([
      ["a"],
      [],
      [],
      [],
      [],
      [],
    ])
  })
})

describe("getOrElse rejects a bare value", () => {
  it("fails to compile without a thunk", () => {
    const calls = (): unknown[] => [
      // @ts-expect-error — the default must be a thunk
      None<number>().getOrElse(42),
      // @ts-expect-error — the default must be a thunk
      Left<string, number>("e").getOrElse(42),
      // @ts-expect-error — the default must be a thunk
      Try<number>(fail).getOrElse(42),
      // @ts-expect-error — the default must be a thunk
      Lazy<number>(fail).getOrElse(42),
      // @ts-expect-error — the default must be a thunk
      TracedOption(None<number>(), tracer, "s").getOrElse(42),
      // @ts-expect-error — the default must be a thunk
      (None<number>() as Extractable<number>).getOrElse(42),
      // @ts-expect-error — the default must be a thunk
      Obj({ a: 1 }).getOrElse({ a: 2 }),
    ]
    expect(typeof calls).toBe("function")
  })
})

describe("orElse is unchanged", () => {
  // orElse keeps `() => Container<T2>`. The `T | T2` shape fixes the literal case on the concrete types, but on the
  // Extractable interface it infers `Extractable<T | null | undefined>` for an Option alternative, and the concrete
  // types must stay compatible with Extractable. Until then a literal alternative widens; an explicit type keeps it.
  it("widens a literal alternative, and keeps an explicitly typed one", () => {
    const theme = None<Theme>()
    expectTypeOf(theme.orElse(() => Some("light"))).toEqualTypeOf<Option<string>>()
    expectTypeOf(theme.orElse(() => Some<Theme>("light"))).toEqualTypeOf<Option<Theme>>()
    const extractable: Extractable<Theme> = theme
    expectTypeOf(extractable.orElse(() => Some<Theme>("light"))).toEqualTypeOf<Extractable<Theme>>()
    expect(theme.orElse(() => Some<Theme>("light")).getOrElse(() => "dark")).toBe("light")
  })
})
