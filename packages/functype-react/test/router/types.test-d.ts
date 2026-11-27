import type { useNavigate } from "@tanstack/react-router"
import { describe, expectTypeOf, it } from "vitest"

import type { detailRoute, Filter, itemRoute, listRoute, searchRoute } from "./app"

describe("exitRoute types", () => {
  it("puts a Right in the route context, for the route and its children", () => {
    expectTypeOf<(typeof listRoute)["types"]["allContext"]["filter"]>().toEqualTypeOf<Filter>()
    expectTypeOf<(typeof detailRoute)["types"]["allContext"]["filter"]>().toEqualTypeOf<Filter>()
    expectTypeOf<(typeof listRoute)["types"]["loaderData"]>().toEqualTypeOf<Filter>()
    expectTypeOf<(typeof itemRoute)["types"]["allContext"]["id"]>().toEqualTypeOf<string>()
  })
})

describe("searchParams types", () => {
  it("is the route's search schema", () => {
    expectTypeOf<(typeof searchRoute)["types"]["searchSchema"]>().toEqualTypeOf<{
      readonly q?: string | undefined
      readonly page?: number | undefined
      readonly sort?: "new" | "old" | undefined
      readonly mine?: boolean | undefined
    }>()
  })

  it("is what navigate's search takes", () => {
    const go = (navigate: ReturnType<typeof useNavigate>) =>
      navigate({ to: "/search", search: { q: "cats", sort: "new" } })
    void go
    // @ts-expect-error "mid" isn't a sort
    const bad = (navigate: ReturnType<typeof useNavigate>) => navigate({ to: "/search", search: { sort: "mid" } })
    void bad
  })
})
