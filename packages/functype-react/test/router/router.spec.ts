import { isNotFound, isRedirect, notFound, redirect } from "@tanstack/react-router"
import type { Option as OptionType } from "functype"
import { Either, Option } from "functype"
import { describe, expect, expectTypeOf, it } from "vitest"

import type { RouteExit } from "../../src/router"
import { exitRoute, SearchParam } from "../../src/router"
import { buildRouter, listSearch } from "./app"

const leafMatch = (router: ReturnType<typeof buildRouter>) => router.state.matches[router.state.matches.length - 1]

describe("exitRoute", () => {
  it("throws the Left exactly as given, and returns the Right", () => {
    const missing = notFound()
    const away = redirect({ to: "/search" })
    const thrown = (exit: RouteExit): unknown => {
      try {
        return exitRoute<void>(Either.left(exit))
      } catch (e) {
        return e
      }
    }
    expect(thrown(missing)).toBe(missing)
    expect(isNotFound(thrown(missing))).toBe(true)
    expect(thrown(away)).toBe(away)
    expect(isRedirect(thrown(away))).toBe(true)
    expect(exitRoute(Either.right({ id: "1" }))).toEqual({ id: "1" })
  })

  it("passes a Right through as route context, to the route's children too", async () => {
    const child = buildRouter("/list/open/detail")
    await child.load()
    expect(child.state.matches[child.state.matches.length - 1]?.loaderData).toBe("open")

    const router = buildRouter("/list/closed")
    await router.load()
    expect(router.state.location.pathname).toBe("/list/closed")
    expect(leafMatch(router)?.loaderData).toBe("closed")
  })

  it("redirects on a Left redirect", async () => {
    const router = buildRouter("/list/all")
    await router.load()
    expect(router.state.location.pathname).toBe("/list/open")
  })

  // Reads the router's match state, which differs across TanStack Router versions.
  it("shows Not Found on a Left notFound", async () => {
    const router = buildRouter("/list/bogus")
    await router.load()
    expect(router.state.matches.some((match) => match.status === "notFound")).toBe(true)
  })

  it("works in an async beforeLoad", async () => {
    const router = buildRouter("/slow")
    await router.load()
    expect(router.state.location.pathname).toBe("/search")
  })
})

describe("searchParams", () => {
  it("keeps the values that parse, and replaces a rejected one with undefined", async () => {
    const router = buildRouter("/search?q=cats&page=2&sort=sideways&mine=true")
    await router.load()
    const search = leafMatch(router)?.search as Record<string, unknown>
    // TanStack merges validateSearch's result over the raw search, so a left-out key would read "sideways".
    expect(search).toEqual({ q: "cats", page: 2, sort: undefined, mine: true })
  })

  it("leaves rejected and missing keys out of the URL it writes", async () => {
    const router = buildRouter("/search?sort=sideways")
    await router.load()
    await router.navigate({ to: "/search", search: (prev) => ({ ...prev, q: "dogs" }) })
    expect(router.state.location.href).toBe("/search?q=dogs")
  })

  it("reads a hand-typed number as text for a string field, and drops an empty value", async () => {
    const router = buildRouter("/search?q=123&page=")
    await router.load()
    expect(leafMatch(router)?.search).toEqual({ q: "123", page: undefined, sort: undefined, mine: undefined })
  })

  it("validates an inline validator's route at runtime", async () => {
    const router = buildRouter("/inline?q=cats&page=2")
    await router.load()
    expect(leafMatch(router)?.loaderData).toEqual({ page: 2, query: "cats" })
  })

  it("round-trips through navigate, including a string that looks like a number", async () => {
    const router = buildRouter("/search")
    await router.load()
    await router.navigate({ to: "/search", search: { q: "123", page: 3, sort: "old", mine: false } })
    const fresh = buildRouter(router.state.location.href)
    await fresh.load()
    expect(leafMatch(fresh)?.search).toEqual({ q: "123", page: 3, sort: "old", mine: false })
  })
})

describe("SearchParam parsers", () => {
  const values = (field: (raw: unknown) => OptionType<unknown>, inputs: readonly unknown[]) =>
    inputs.map((raw) => field(raw).getOrElse(() => "none"))

  it("string", () => {
    expect(values(SearchParam.string, ["a", "", 7, Number.NaN, true, false, null, [1]])).toEqual([
      "a",
      "none",
      "7",
      "none",
      "true",
      "false",
      "none",
      "none",
    ])
  })

  it("number and integer", () => {
    expect(values(SearchParam.number, [2.5, "2.5", "-1e3", ".5", " ", "x", "0x10", "1.2.3", Infinity])).toEqual([
      2.5,
      2.5,
      -1000,
      0.5,
      "none",
      "none",
      "none",
      "none",
      "none",
    ])
    expect(values(SearchParam.integer, [2, "3", 2.5, "x"])).toEqual([2, 3, "none", "none"])
  })

  it("rejects a long digit string with a bad suffix in linear time", () => {
    const hostile = `${"0".repeat(200_000)}x`
    const started = performance.now()
    expect(SearchParam.number(hostile).isNone()).toBe(true)
    expect(SearchParam.number(`${"0".repeat(200_000)}.5`).getOrElse(() => 0)).toBe(0.5)
    // The old pattern took about a minute on 256,000 digits; a linear check takes milliseconds.
    expect(performance.now() - started).toBeLessThan(500)
  })

  it("boolean", () => {
    expect(values(SearchParam.boolean, [true, false, "true", "false", "yes", 1])).toEqual([
      true,
      false,
      true,
      false,
      "none",
      "none",
    ])
  })

  it("oneOf", () => {
    const sort = SearchParam.oneOf("new", "old")
    expectTypeOf(sort).returns.toEqualTypeOf<OptionType<"new" | "old">>()
    expect(values(sort, ["new", "old", "mid", 1])).toEqual(["new", "old", "none", "none"])
  })

  it("types the search object with every key optional", () => {
    expectTypeOf(listSearch.parse({})).toEqualTypeOf<{
      readonly q?: string | undefined
      readonly page?: number | undefined
      readonly sort?: "new" | "old" | undefined
      readonly mine?: boolean | undefined
    }>()
    expect(Option.none().isNone()).toBe(true)
  })
})
