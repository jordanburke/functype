import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  notFound,
  redirect,
} from "@tanstack/react-router"
import { Either } from "functype"

import type { RouteExit } from "../../src/router"
import { exitRoute, SearchParam, searchParams } from "../../src/router"

const FILTERS = ["open", "closed"] as const
export type Filter = (typeof FILTERS)[number]
const isFilter = (value: string): value is Filter => (FILTERS as readonly string[]).includes(value)

/** Redirects "all" to /list/open, shows Not Found for an unknown filter, and puts the filter in context. */
export const checkFilter = (filter: string): Either<RouteExit, { readonly filter: Filter }> => {
  if (filter === "all") return Either.left(redirect({ to: "/list/$filter", params: { filter: "open" } }))
  return isFilter(filter) ? Either.right({ filter }) : Either.left(notFound())
}

export const listSearch = searchParams({
  q: SearchParam.string,
  page: SearchParam.integer,
  sort: SearchParam.oneOf("new", "old"),
  mine: SearchParam.boolean,
})

const root = createRootRoute()
export const listRoute = createRoute({
  getParentRoute: () => root,
  path: "/list/$filter",
  beforeLoad: ({ params }) => exitRoute(checkFilter(params.filter)),
  loader: ({ context }) => context.filter,
})
export const detailRoute = createRoute({
  getParentRoute: () => listRoute,
  path: "/detail",
  loader: ({ context }) => context.filter,
})
export const itemRoute = createRoute({
  getParentRoute: () => root,
  path: "/item/$id",
  // Built inline, the Either needs its Right type given.
  beforeLoad: ({ params }) =>
    exitRoute<{ readonly id: string }>(params.id === "x" ? Either.left(notFound()) : Either.right({ id: params.id })),
  loader: ({ context }) => context.id,
})
const slowRoute = createRoute({
  getParentRoute: () => root,
  path: "/slow",
  beforeLoad: async () => exitRoute<void>(await Promise.resolve(Either.left(redirect({ to: "/search" })))),
})
export const searchRoute = createRoute({ getParentRoute: () => root, path: "/search", validateSearch: listSearch })
// Written inline, beside a beforeLoad and loaderDeps that read search: TanStack loses a function
// validator's type here, which is why searchParams returns a { parse } object.
export const inlineRoute = createRoute({
  getParentRoute: () => root,
  path: "/inline",
  validateSearch: searchParams({ q: SearchParam.string, page: SearchParam.integer }),
  beforeLoad: ({ search }) => ({ query: search.q }),
  loaderDeps: ({ search }) => ({ page: search.page }),
  loader: ({ deps, context }) => ({ page: deps.page, query: context.query }),
})

const routeTree = root.addChildren([
  listRoute.addChildren([detailRoute]),
  itemRoute,
  slowRoute,
  searchRoute,
  inlineRoute,
])

export const buildRouter = (path: string) =>
  createRouter({ routeTree, history: createMemoryHistory({ initialEntries: [path] }) })

declare module "@tanstack/react-router" {
  interface Register {
    router: ReturnType<typeof buildRouter>
  }
}
