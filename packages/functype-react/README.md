# functype-react

React bindings for the [functype](https://github.com/jordanburke/functype) functional programming library — ADT-aware hooks and exhaustive pattern matching components.

## Thesis

Push the same ADTs (`Option`, `Either`, `Try`, `IO`, `Validated`) you already trust on the server-side into React component boundaries, so design/requirement errors fail compilation in the UI layer instead of leaking through as `data && !error && !loading` flag soup.

## Install

```bash
pnpm add functype functype-react react react-dom
```

`react-dom` is an optional peer (drop it for React Native / RSC-only consumers). `@tanstack/react-query` is likewise optional — install it only if you use `functype-react/query`.

## Surface

| Subpath                 | Contents                                                                                                                                                          |
| ----------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `functype-react` (main) | Stable hooks (`useStable*`), ADT hooks (`useOption`, `useEither`, `useTry`, `useList`), `Match` family components, equality helpers                               |
| `functype-react/match`  | `<Match>`, `<MatchOption>`, `<MatchEither>`, `<MatchTry>` (also re-exported from main)                                                                            |
| `functype-react/async`  | `useIO`, `useIOPromise`, `useIOValue` (React 19 `use()` bridge), `<AsyncBoundary>`                                                                                |
| `functype-react/forms`  | `Validated<E, A>` type alias, `useValidatedField`, `useValidatedForm`                                                                                             |
| `functype-react/query`  | `useIOQuery(State)`, `useIOInfiniteQuery`, `useIOMutation(State)`, `ioQueryFn`, `ioMutationFn`, `IOQueryError`, `toQueryState` — TanStack Query adapters for `IO` |
| `functype-react/router` | `exitRoute`, `searchParams`, `SearchParam` — TanStack Router guards and typed search params                                                                       |

`./async`, `./forms`, `./query` and `./router` stay off the main entry so consumers who don't touch Suspense, applicative forms, or React Query tree-shake them out.

## Tier 1 — stable hooks + ADT hooks

```ts
import { useStableState, useStableEffect, structuralEq } from "functype-react"

const [user, setUser] = useStableState({ id: 1, name: "ada" }, structuralEq)

useStableEffect(
  () => {
    // only re-runs when user is *structurally* different
  },
  [user],
  [structuralEq],
)
```

```ts
import { useOption, useEither, useTry } from "functype-react"

const userOpt = useOption<User>() // value: Option<User>
const result = useEither<Error, User>() // value: Either<Error, User>
const parsed = useTry<Config>() // value: Try<Config>
```

## Tier 2 — pattern matching in JSX

```tsx ignore
import { Match, MatchOption } from "functype-react"

<MatchOption value={user}
  Some={(u) => <Profile user={u} />}
  None={() => <SignIn />}
/>

<Match value={state}>
  {{
    Loading: () => <Spinner />,
    Success: ({ data }) => <Result data={data} />,
    Failure: ({ error }) => <Err err={error} />,
  }}
</Match>
```

Omitting a `_tag` case is a compile error.

## Tier 3 — async / IO

```tsx ignore
import { Http } from "functype/fetch"
import { useIO } from "functype-react/async"

function UserPanel({ id }: { id: string }) {
  const state = useIO((signal) => Http.get<User>(`/users/${id}`, { signal }).map((r) => r.data), [id])
  if (state.isPending) return <Spinner />
  if (state.isFailure) return <Err err={state.error} /> // state.error is the effect's typed E
  return state.isSuccess ? <Profile user={state.value} /> : null
}
```

On unmount or a `deps` change the signal aborts, and the effect stops at its next step (no further retries, polls or `flatMap`s run). A typed failure becomes `Failure`; a defect is rethrown to the nearest error boundary.

For React 19 `use()` + Suspense:

```tsx ignore
import { AsyncBoundary, useIOValue } from "functype-react/async"

function UserPanel({ id }: { id: string }) {
  const user = useIOValue((signal) => Http.get<User>(`/users/${id}`, { signal }).map((r) => r.data), [id])
  return <Profile user={user} />
}

;<AsyncBoundary pending={<Spinner />} fallback={(err, reset) => <ErrorPanel err={err} onRetry={reset} />}>
  <UserPanel id="42" />
</AsyncBoundary>
```

`useIOValue` requires React 19. See the JSDoc on the hook for invariant documentation (stable promise refs, ErrorBoundary outside Suspense, no SSR).

## Tier 4 — forms with accumulating validation

```tsx ignore
import { useValidatedForm, valid, invalid, type Validated } from "functype-react/forms"
import { List } from "functype"

type SignupForm = { email: string; age: number }

const validate = (s: SignupForm): Validated<string, SignupForm> => {
  const errs = List<string>([])
    .concat(s.email.includes("@") ? List([]) : List(["email must contain @"]))
    .concat(s.age >= 18 ? List([]) : List(["age must be 18+"]))
  return errs.isEmpty ? valid(s) : invalid(errs)
}

function Signup() {
  const form = useValidatedForm<SignupForm>({
    initial: { email: "", age: 0 },
    validate,
  })

  return (
    <form onSubmit={form.handleSubmit(async (s) => api.signup(s))}>
      <input value={form.values.email} onChange={(e) => form.setField("email", e.target.value)} />
      <input type="number" value={form.values.age} onChange={(e) => form.setField("age", Number(e.target.value))} />
      {form.errors.toArray().map((err, i) => (
        <p key={i}>{err}</p>
      ))}
      <button disabled={!form.isValid}>sign up</button>
    </form>
  )
}
```

Errors accumulate applicatively — every failing rule is surfaced in one pass, not just the first.

## Tier 5 — React Query

`Http.get(...)` returns `IO<never, HttpError, HttpResponse<T>>`, and neither `IO` terminal fits TanStack Query: `.run()` resolves a typed failure as a `Left` (so React Query never sees it), and `.runOrThrow()` throws the raw tagged object — which is **not** an `Error`, so the ubiquitous `error instanceof Error ? error.message : fallback` handler silently degrades.

`functype-react/query` owns that bridge. Failures arrive boxed as `IOQueryError<E>`: a real `Error` with a populated `.message`, whose `.error` is still the fully discriminable functype error. Its `.name` is the cause's `_tag`, or a `TypedError`'s code (`NOT_FOUND`), so an error tracker groups by cause and can drop expected failures by name. A defect or an untagged cause keeps the name `IOQueryError`. Use `instanceof IOQueryError` or `isIOQueryError`, not `.name`, to recognize the box.

```tsx ignore
import { useIOQuery } from "functype-react/query"
import { Http, HttpErrors, type HttpError } from "functype/fetch"

const { data, error } = useIOQuery(
  ["connector-limits", userId],
  ({ signal }) => Http.get<ConnectorLimits>(url, { headers, signal }),
  { enabled: !!userId },
)

if (error) {
  error instanceof Error // true
  error.message // "HTTP 403 Forbidden — /api/limits"

  HttpErrors.match(error.error, {
    NetworkError: () => <Offline />,
    HttpStatusError: (e) => (e.status === 403 ? <UpgradePrompt /> : <Failed />),
    DecodeError: () => <SchemaDrift />,
  })
}
```

### Matching instead of flag soup

The result above is still React Query's — `data` is `A | undefined`, so the success path needs a `!` or a guard. `toQueryState` projects it onto the same `AsyncState` ADT that `functype-react/async` returns, so a query matches exhaustively like any other functype value:

```tsx ignore
import { Match } from "functype-react"
import { toQueryState, useIOQuery } from "functype-react/query"

function UserPanel({ id }: { id: string }) {
  const query = useIOQuery(["user", id], ({ signal }) => Http.get<User>(`/users/${id}`, { signal }))

  return (
    <Match value={toQueryState(query)}>
      {{
        Idle: () => null,
        Pending: () => <Spinner />,
        Failure: ({ error }) => <Err e={error.error} />,
        Success: ({ value }) => <Profile user={value} />,
      }}
    </Match>
  )
}
```

`Success` hands you a defined `User` — no `!`, no `| undefined` — and omitting a case is a compile error. A disabled query (`enabled: false`, never fetched) projects to `Idle`, an in-flight or paused one to `Pending`. `toMutationState` does the same for mutations, where React Query's own `idle` status maps straight onto `Idle`.

The projection is a pure function over the result, so you keep everything else React Query gives you (`refetch`, `isFetching`, `dataUpdatedAt`) on the original object. (Invalidation is a client-level operation — `queryClient.invalidateQueries()` — not a method on the result.)

If the ADT is all you need, `useIOQueryState` skips the projection step — it returns `AsyncState` directly, plus the `isIdle`/`isPending`/`isSuccess`/`isFailure` flags and `refetch`, mirroring what `useIO` returns in Tier 3:

```tsx ignore
const user = useIOQueryState(["user", id], ({ signal }) => Http.get<User>(url, { signal }))

<Match value={user}>
  {{
    Idle: () => null,
    Pending: () => <Spinner />,
    Failure: ({ error }) => <Err e={error.error} />,
    Success: ({ value }) => <Profile user={value} />,
  }}
</Match>
```

`useIOMutationState` is the mutation counterpart, carrying `mutate` / `mutateAsync` / `reset` through alongside the state. Reach for `useIOQuery` + `toQueryState` when you need the rest of the result (`isFetching`, `dataUpdatedAt`).

Both read only the fields they project. For **queries** that matters: React Query tracks which result properties an observer touches and re-renders only when those change, so projecting a subset keeps that optimization intact rather than subscribing your component to every field. (Tracked props accumulate over an observer's lifetime, so this is a floor, not a guarantee.) **Mutations have no such tracking** in React Query — `MutationObserver` notifies on every change regardless — so for `useIOMutationState` the narrow read is merely tidy, not an optimization.

Two behaviours worth knowing before you rely on the ADT:

- **A failed background refetch projects to `Failure` even though React Query still holds the last successful `data`.** `AsyncState` has no "loaded but stale" variant. This is the deliberate default — it never silently hides a failure — but it does mean a transient refetch error flips a loaded view to the error branch. To keep rendering stale data, read `query.data` alongside the projection or branch on `query.isRefetchError` before projecting.
- **`defect: true` means `.error` is not an `E`** — check it before matching on `_tag`. It is set when the effect factory throws before an `IO` is produced, when the effect produces a defect (`Exit.Die`: a throwing `IO.sync` thunk, a throwing `map`/`flatMap`/`mapError` callback, or `IO.die`), or when the effect is interrupted (including a query React Query cancelled: the effect runs with the query's `signal`, so it stops at its next step). Conversely `defect: false` genuinely means `.error` is an `E` — the bridge reads `runExit()`, so it can see the difference. (It previously read `run()`, whose `Either` could not, so a defect arrived indistinguishable from a typed failure and the flag read `false`.)

Mutations mirror the shape (React Query supplies no `AbortSignal` to mutations, so the callback takes only the variables):

```ts
import { Http } from "functype/fetch"
import { useIOMutation } from "functype-react/query"

const create = useIOMutation((body: CreateTokenInput) => Http.post<Token>(url, { headers, body }), {
  onError: (e) => toast(e.message, { detail: e.defect ? "unexpected" : e.error._tag }),
})
```

`e` is the `IOQueryError<E>` box, so the typed error is `e.error`, and only when `e.defect` is `false`. To branch on it as an `Option`, write `e.defect ? None<ApiError>() : Some(e.error)`, with your own error type in place of `ApiError`. A bare `None()` makes the result `Option<unknown>`.

For a paged query, `useIOInfiniteQuery` takes the page param as an `Option`. The first page gets `None`, and `getNextPageParam` returns `None` when there are no more pages, so a cursor needs no `null` sentinel:

```ts
import { type IO, Option } from "functype"
import { useIOInfiniteQuery } from "functype-react/query"

type ApiError = { readonly _tag: "ApiError"; readonly status: number }
type EventPage = { readonly events: readonly string[]; readonly nextCursor: string | null }
declare const fetchEvents: (cursor: Option<string>, signal: AbortSignal) => IO<never, ApiError, EventPage>

const events = useIOInfiniteQuery(["events"], ({ pageParam, signal }) => fetchEvents(pageParam, signal), {
  getNextPageParam: (last: EventPage) => Option(last.nextCursor),
})
// events.error is an IOQueryError<ApiError>; events.fetchNextPage and events.hasNextPage are React Query's own
```

- **Annotate the page in `getNextPageParam`,** as above. TypeScript types the effect's `pageParam` first, so it can only learn the param type from a `getNextPageParam` that types on its own. Without the annotation it reports `Option<string>` not assignable to `Option<never>` there.
- **The param type can't hold `null` or `undefined`.** React Query reads a `null` next param as "no more pages", and `None` already says that.
- **`data.pageParams` holds plain values.** React Query stores each param as itself, or as `null` for the first page, so its cache stays plain JSON for persisters and SSR.
- **Other options pass through.** Every other `useInfiniteQuery` option, such as `select`, `maxPages` or `placeholderData: keepPreviousData`, works as usual.
- **To match the result, project it.** `toQueryState(events)` gives an `AsyncState`. The hook returns React Query's result unchanged.
- **`None` is only ever the first page you fetched.** After `fetchPreviousPage`, or once `maxPages` drops the first page, a refetch starts from a page whose param is a `Some`, as plain React Query does. So pick params that your effect can fetch any page from, such as offsets or cursors.
- **A one-page query** still needs a typed `None`: `getNextPageParam: () => Option.none<string>()`.

For full control over the query object — or for `useSuspenseQuery` / `queryClient.prefetchQuery` — drop to the primitives. They carry no `@tanstack` types at all, so they compose with any of those:

```ts ignore
import { useQuery } from "@tanstack/react-query"
import { Http } from "functype/fetch"
import { ioQueryFn } from "functype-react/query"

useQuery({
  queryKey: ["connector-limits", userId],
  queryFn: ioQueryFn(({ signal }) => Http.get<ConnectorLimits>(url, { headers, signal })),
  enabled: !!userId,
})
```

`ioQueryFn` is generic over the query context, so a richer one flows through unchanged. Annotate the callback parameter to reach `pageParam` when you call `useInfiniteQuery` yourself:

```ts ignore
import { type QueryFunctionContext, type QueryKey, useInfiniteQuery } from "@tanstack/react-query"
import { Http } from "functype/fetch"
import { ioQueryFn } from "functype-react/query"

useInfiniteQuery({
  queryKey: ["events"],
  queryFn: ioQueryFn(({ signal, pageParam }: QueryFunctionContext<QueryKey, number>) =>
    Http.get<Page>(url, { params: { cursor: pageParam }, signal }),
  ),
  initialPageParam: 0,
  getNextPageParam: (last) => last.data.nextCursor,
})
```

Both the hooks and the primitives are generic over any `IO<never, E, A>` — nothing here is HTTP-specific. `Error.message` is derived structurally (`formatIOError`); pass `formatError` to override it. The derivation prefers, in order: a raw `Error`'s `.message`, the HTTP shape (`HTTP 403 Forbidden — /api/x`) for anything carrying a numeric `status`, a tagged error's own `message`, then the bare `_tag`, then JSON.

## Tier 6 — TanStack Router

`functype-react/router` needs `@tanstack/react-router`, an optional peer.

### Guards: `exitRoute`

TanStack Router redirects or shows Not Found only when `beforeLoad` or `loader` throws `redirect()` or `notFound()`. `exitRoute` takes an `Either` instead: a `Left` is thrown the way the router expects, and a `Right` is returned, so in `beforeLoad` it becomes the route's context.

```ts
import { createRootRoute, createRoute, notFound, redirect } from "@tanstack/react-router"
import { Either } from "functype"
import { exitRoute, type RouteExit } from "functype-react/router"

type Filter = "open" | "closed"
const isFilter = (value: string): value is Filter => value === "open" || value === "closed"

const checkFilter = (filter: string): Either<RouteExit, { readonly filter: Filter }> => {
  if (filter === "all") return Either.left(redirect({ to: "/list/$filter", params: { filter: "open" } }))
  return isFilter(filter) ? Either.right({ filter }) : Either.left(notFound())
}

const root = createRootRoute()
const list = createRoute({
  getParentRoute: () => root,
  path: "/list/$filter",
  beforeLoad: ({ params }) => exitRoute(checkFilter(params.filter)),
  loader: ({ context }) => context.filter, // Filter
})
```

- **Typing:** a named check with a declared `Either<RouteExit, …>` return type, as above, types cleanly. When you build the `Either` inline, give `exitRoute` its `Right` type, or `void` for a guard that adds no context: `exitRoute<void>(…)`.
- **Async guards:** `await` the check first: `beforeLoad: async () => exitRoute(await check())`.
- **No wrapper:** `exitRoute` goes inside a plain `beforeLoad`. A wrapper around the whole function would lose the typed `params` that TanStack gives `beforeLoad`.

### Search params: `searchParams`

`searchParams` builds a `validateSearch` from one parser per key. Each parser returns an `Option`, so there's no `undefined` spreading per field:

```ts
import { createRootRoute, createRoute } from "@tanstack/react-router"
import { SearchParam, searchParams } from "functype-react/router"

const root = createRootRoute()
const search = createRoute({
  getParentRoute: () => root,
  path: "/search",
  validateSearch: searchParams({
    q: SearchParam.string,
    page: SearchParam.integer,
    sort: SearchParam.oneOf("new", "old"),
    mine: SearchParam.boolean,
  }),
})
// search.useSearch(): { q?: string | undefined; page?: number | undefined; sort?: "new" | "old" | undefined; mine?: boolean | undefined }
```

- **A rejected or missing value is `undefined`.** TanStack merges `validateSearch`'s result over the raw search, so a key left out would keep its raw, unvalidated value; `undefined` replaces it. TanStack leaves `undefined` keys out of the URLs it writes.
- **The same type works for `navigate`.** `navigate({ to: "/search", search: { q: "cats" } })` checks against it.
- **The parsers expect TanStack's parsing.** TanStack hands each value to `validateSearch` already parsed as JSON where it can be: `?page=2` is the number 2, and `?mine=true` is `true`.
  - `SearchParam.string` takes a non-empty string. A number or boolean, as a hand-typed `?q=123` or `?q=true` parses, becomes its text. An empty value or `null` is rejected. TanStack has already parsed a hand-typed value as JSON by then, so its original text can be gone: `?q=1e3` arrives as `"1000"`, and a 20-digit number loses precision. Values that `navigate` writes are quoted, so they round-trip exactly.
  - `SearchParam.number` and `SearchParam.integer` take a number, or a decimal string that reads as one. Hex such as `0x10` is rejected.
  - `SearchParam.boolean` takes `true` or `false`, or those strings.
  - `SearchParam.oneOf(...values)` takes one of the given strings.
- **Your own parser:** any `(raw: unknown) => Option<T>` is a field.
- **Keys no parser names** still pass through at runtime, as TanStack keeps them, but they aren't in the type.

## Compatibility

- **TypeScript**: `strict: true` + `noUncheckedIndexedAccess: true`. Loose configs will silently lose the type-level exhaustiveness guarantees.
- **React**: peer dep range `>=18 <20`. Tier 3's `useIOValue` (and consequently anything that depends on React 19's `use()` hook) is React-19-only at runtime; the rest of the package works on both.
- **SSR / RSC**: hooks are client-only and marked with `"use client"`. `<Match>` family components are pure and render fine in Server Components.
- **TanStack Router**: Tier 6 targets `@tanstack/react-router` `>=1.60.0`, an optional peer.
- **React Query**: Tier 5 targets `@tanstack/react-query` v5 (`>=5.0.0`), an optional peer. The `ioQueryFn` / `ioMutationFn` primitives type their context structurally, so they carry no `@tanstack` types and are unaffected by its major-version churn.

## Linting

`eslint-plugin-functype` ships two React rules:

- `functype/no-getOrThrow-in-render` reports a bare `.orThrow()` in a component or hook body, where a missing value would throw during render and unmount the tree.
- `functype/must-fold-on-component-return` reports a component that picks what it renders with an `isSome()` / `isLeft()` early return or `&&`, instead of `fold` or a `Match` component.

Both are `error` in `functype.configs.recommended`, the plugin's one preset.

They work without type information and are more precise with it (`parserOptions.projectService`). See the [plugin README](https://functype.org/eslint/#react-rules) for what each one reports.

## Deferred to v0.2

- `./optics` subpath (`useLens`, `useOptional`, `useSelector`) — blocked on core not shipping a lens module yet.
- Codemods, Storybook, cookbook recipes on the Astro site.
- Playwright browser-based testing for `useIOValue` + `<AsyncBoundary>` (jsdom doesn't unsuspend React 19's `use()` reliably).

## License

MIT — see [LICENSE](https://github.com/jordanburke/functype/blob/main/LICENSE).
