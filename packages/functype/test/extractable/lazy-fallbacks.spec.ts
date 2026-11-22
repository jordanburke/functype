import { describe, expect, expectTypeOf, it, vi } from "vitest"

import { Left, Right } from "@/either"
import { Exit } from "@/io"
import { Lazy } from "@/lazy"
import { Map } from "@/map"
import { Obj } from "@/obj"
import { None, Option, Some } from "@/option"
import { TracedOption } from "@/traced"
import { Try } from "@/try"

/**
 * 2.0 rename (#215): `orElse(default)` became `getOrElse(() => default)` and `or(alternative)` became
 * `orElse(() => alternative)`. Both fallbacks are thunks, so they run only when there is no value, and a
 * leftover 1.x call fails to compile at the argument instead of silently changing meaning.
 */

const tracer = { emit: () => undefined }

describe("getOrElse is lazy", () => {
  it("does not call the default when a value is present", () => {
    const fallback = vi.fn(() => 0)
    expect(Some(1).getOrElse(fallback)).toBe(1)
    expect(Right<string, number>(1).getOrElse(fallback)).toBe(1)
    expect(Try(() => 1).getOrElse(fallback)).toBe(1)
    expect(Lazy(() => 1).getOrElse(fallback)).toBe(1)
    expect(Exit.succeed<string, number>(1).getOrElse(fallback)).toBe(1)
    expect(Map([["a", 1]]).getOrElse("a", fallback)).toBe(1)
    expect(TracedOption(Some(1), tracer, "s").getOrElse(fallback)).toBe(1)
    expect(Obj({ a: 1 }).getOrElse(() => ({ a: 0 }))).toEqual({ a: 1 })
    expect(fallback).not.toHaveBeenCalled()
  })

  it("calls the default once when there is no value", () => {
    const fallback = vi.fn(() => 0)
    expect(None<number>().getOrElse(fallback)).toBe(0)
    expect(Left<string, number>("e").getOrElse(fallback)).toBe(0)
    expect(
      Try<number>(() => {
        throw new Error("boom")
      }).getOrElse(fallback),
    ).toBe(0)
    expect(
      Lazy<number>(() => {
        throw new Error("boom")
      }).getOrElse(fallback),
    ).toBe(0)
    expect(Exit.fail<string, number>("e").getOrElse(fallback)).toBe(0)
    expect(Exit.die<string, number>("d").getOrElse(fallback)).toBe(0)
    expect(Exit.interrupt<string, number>("f").getOrElse(fallback)).toBe(0)
    expect(Map<string, number>([]).getOrElse("a", fallback)).toBe(0)
    expect(TracedOption(None<number>(), tracer, "s").getOrElse(fallback)).toBe(0)
    expect(fallback).toHaveBeenCalledTimes(9)
  })

  it("returns a default that is itself a function by calling the thunk, not the function", () => {
    const fn = (): string => "called"
    expect(None<() => string>().getOrElse(() => fn)).toBe(fn)
  })
})

describe("orElse is lazy", () => {
  it("does not call the alternative when a value is present", () => {
    const alternative = vi.fn(() => Some(0))
    expect(
      Some(1)
        .orElse(alternative)
        .getOrElse(() => -1),
    ).toBe(1)
    expect(Right<string, number>(1).orElse(() => Right<string, number>(0))).toEqual(Right(1))
    expect(
      Try(() => 1)
        .orElse(() => Try(() => 0))
        .getOrElse(() => -1),
    ).toBe(1)
    expect(Map([["a", 1]]).orElse("a", alternative)).toEqual(Some(1))
    expect(alternative).not.toHaveBeenCalled()
  })

  it("calls the alternative when there is no value", () => {
    const alternative = vi.fn(() => Some(0))
    expect(None<number>().orElse(alternative)).toEqual(Some(0))
    expect(Map<string, number>([]).orElse("a", alternative)).toEqual(Some(0))
    expect(alternative).toHaveBeenCalledTimes(2)
    expect(Left<string, number>("e").orElse(() => Right<string, number>(0))).toEqual(Right(0))
    expect(
      Try<number>(() => {
        throw new Error("boom")
      })
        .orElse(() => Try(() => 0))
        .getOrElse(() => -1),
    ).toBe(0)
  })

  it("Lazy calls its alternative only when the computation throws, and only when evaluated", () => {
    const alternative = vi.fn(() => Lazy(() => 0))
    const ok = Lazy(() => 1).orElse(alternative)
    const failing = Lazy<number>(() => {
      throw new Error("boom")
    }).orElse(alternative)
    expect(alternative).not.toHaveBeenCalled()
    expect(ok.getOrElse(() => -1)).toBe(1)
    expect(alternative).not.toHaveBeenCalled()
    expect(failing.getOrElse(() => -1)).toBe(0)
    expect(alternative).toHaveBeenCalledTimes(1)
  })

  it("widens the result to the alternative's type", () => {
    const widened: Option<number | string> = None<number>().orElse(() => Some("x"))
    expect(widened.getOrElse(() => 0)).toBe("x")
  })
})

describe("literal defaults", () => {
  type Theme = "light" | "dark"
  const theme = Option<Theme>(undefined)

  it("keep the union without a contextual type, because the default is typed against T first", () => {
    expectTypeOf(theme.getOrElse(() => "light")).toEqualTypeOf<Theme>()
  })

  it("keep the union with `as const` or an annotated target", () => {
    expectTypeOf(theme.getOrElse(() => "light" as const)).toEqualTypeOf<Theme>()
    const annotated: Theme = theme.getOrElse(() => "light")
    expect(annotated).toBe("light")
  })
})

describe("a 1.x-style call fails to compile at the argument", () => {
  it("rejects a bare default or a bare container", () => {
    // Wrapped in a function that never runs: the point is the compile error, not the runtime.
    const neverRun = (): void => {
      // @ts-expect-error getOrElse takes a thunk
      Some(1).getOrElse(42)
      // @ts-expect-error orElse takes a thunk that returns an Option
      Some(1).orElse(Some(2))
      // @ts-expect-error orElse is no longer the value fallback
      None<number>().orElse(42)
      // @ts-expect-error getOrElse takes a thunk
      Right<string, number>(1).getOrElse(42)
      // @ts-expect-error orElse takes a thunk that returns an Either
      Right<string, number>(1).orElse(Right(2))
      // @ts-expect-error getOrElse takes a thunk
      Try(() => 1).getOrElse(42)
      // @ts-expect-error orElse takes a thunk that returns a Try
      Try(() => 1).orElse(Try(() => 2))
      // @ts-expect-error getOrElse takes a thunk
      Lazy(() => 1).getOrElse(42)
      // @ts-expect-error orElse takes a thunk that returns a Lazy
      Lazy(() => 1).orElse(Lazy(() => 2))
      // @ts-expect-error getOrElse takes a thunk
      Exit.succeed<string, number>(1).getOrElse(42)
      // @ts-expect-error getOrElse takes a thunk
      Map<string, number>([]).getOrElse("a", 42)
      // @ts-expect-error orElse takes a thunk that returns an Option
      Map<string, number>([]).orElse("a", Some(42))
      // @ts-expect-error getOrElse takes a thunk
      Obj({ a: 1 }).getOrElse({ a: 2 })
      // @ts-expect-error the 1.x `or` is gone
      Some(1).or(Some(2))
    }
    expect(neverRun).toBeTypeOf("function")
  })
})
