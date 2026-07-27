# functype-react

React bindings for the [functype](https://github.com/jordanburke/functype) functional programming library — ADT-aware hooks and exhaustive pattern matching components.

## Thesis

Push the same ADTs (`Option`, `Either`, `Try`, `Task`, `Validated`) you already trust on the server-side into React component boundaries, so design/requirement errors fail compilation in the UI layer instead of leaking through as `data && !error && !loading` flag soup.

## Install

```bash
pnpm add functype functype-react react react-dom
```

`react-dom` is an optional peer (drop it for React Native / RSC-only consumers). `@tanstack/react-query` is likewise optional — install it only if you use `functype-react/query`.

## Surface

| Subpath                 | Contents                                                                                                                                    |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| `functype-react` (main) | Stable hooks (`useStable*`), ADT hooks (`useOption`, `useEither`, `useTry`, `useList`), `Match` family components, equality helpers         |
| `functype-react/match`  | `<Match>`, `<MatchOption>`, `<MatchEither>`, `<MatchTry>` (also re-exported from main)                                                      |
| `functype-react/async`  | `useTask`, `useTaskPromise`, `useTaskValue` (React 19 `use()` bridge), `<TaskBoundary>`                                                     |
| `functype-react/forms`  | `Validated<E, A>` type alias, `useValidatedField`, `useValidatedForm`                                                                       |
| `functype-react/query`  | `useIOQuery(State)`, `useIOMutation(State)`, `ioQueryFn`, `ioMutationFn`, `IOQueryError`, `toQueryState` — TanStack Query adapters for `IO` |

`./async`, `./forms`, and `./query` stay off the main entry so consumers who don't touch Suspense, applicative forms, or React Query tree-shake them out.

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

```tsx
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

## Tier 3 — async / Task

```ts
import { useTask } from "functype-react/async"

function UserPanel({ id }: { id: string }) {
  const state = useTask((signal) => fetch(`/users/${id}`, { signal }).then((r) => r.json()), [id])
  if (state.isPending) return <Spinner />
  if (state.isFailure) return <Err err={state.error} />
  return state.isSuccess ? <Profile user={state.value} /> : null
}
```

For React 19 `use()` + Suspense:

```tsx
import { TaskBoundary, useTaskValue } from "functype-react/async"

function UserPanel({ id }: { id: string }) {
  const user = useTaskValue((signal) => fetch(`/users/${id}`, { signal }).then((r) => r.json()), [id])
  return <Profile user={user} />
}

;<TaskBoundary pending={<Spinner />} fallback={(err, reset) => <ErrorPanel err={err} onRetry={reset} />}>
  <UserPanel id="42" />
</TaskBoundary>
```

`useTaskValue` requires React 19. See the JSDoc on the hook for invariant documentation (stable promise refs, ErrorBoundary outside Suspense, no SSR).

## Tier 4 — forms with accumulating validation

```ts
import { useValidatedForm, valid, invalid, type Validated } from "functype-react/forms"
import { List } from "functype"

type SignupForm = { email: string; age: number }

const validate = (s: SignupForm): Validated<string, SignupForm> => {
  const errs = List<string>([])
    .concat(s.email.includes("@") ? List([]) : List(["email must contain @"]))
    .concat(s.age >= 18         ? List([]) : List(["age must be 18+"]))
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
      {form.errors.toArray().map((err, i) => <p key={i}>{err}</p>)}
      <button disabled={!form.isValid}>sign up</button>
    </form>
  )
}
```

Errors accumulate applicatively — every failing rule is surfaced in one pass, not just the first.

## Tier 5 — React Query

`Http.get(...)` returns `IO<never, HttpError, HttpResponse<T>>`, and neither `IO` terminal fits TanStack Query: `.run()` never throws (so React Query never sees a failure), and `.runOrThrow()` throws the raw tagged object — which is **not** an `Error`, so the ubiquitous `error instanceof Error ? error.message : fallback` handler silently degrades.

`functype-react/query` owns that bridge. Failures arrive boxed as `IOQueryError<E>`: a real `Error` with a populated `.message`, whose `.error` is still the fully discriminable functype error.

```ts
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

The result above is still React Query's — `data` is `A | undefined`, so the success path needs a `!` or a guard. `toQueryState` projects it onto the same `TaskState` ADT that `functype-react/async` returns, so a query matches exhaustively like any other functype value:

```tsx
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

If the ADT is all you need, `useIOQueryState` skips the projection step — it returns `TaskState` directly, plus the `isIdle`/`isPending`/`isSuccess`/`isFailure` flags and `refetch`, mirroring what `useTask` returns in Tier 3:

```tsx
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

- **A failed background refetch projects to `Failure` even though React Query still holds the last successful `data`.** `TaskState` has no "loaded but stale" variant. This is the deliberate default — it never silently hides a failure — but it does mean a transient refetch error flips a loaded view to the error branch. To keep rendering stale data, read `query.data` alongside the projection or branch on `query.isRefetchError` before projecting.
- **`defect: true` means `.error` is not an `E`** — check it before matching on `_tag`. It is set when the effect factory throws before an `IO` is produced, when the effect produces a defect (`Exit.Die`: a throwing `IO.sync` thunk, a throwing `map`/`flatMap`/`mapError` callback, or `IO.die`), or when the effect is interrupted. Conversely `defect: false` genuinely means `.error` is an `E` — the bridge reads `runExit()`, so it can see the difference. (It previously read `run()`, whose `Either` could not, so a defect arrived indistinguishable from a typed failure and the flag read `false`.)

Mutations mirror the shape (React Query supplies no `AbortSignal` to mutations, so the callback takes only the variables):

```ts
import { useIOMutation } from "functype-react/query"

const create = useIOMutation((body: CreateTokenInput) => Http.post<Token>(url, { headers, body }), {
  onError: (e) => toast(e.message, { detail: e.error._tag }),
})
```

For full control over the query object — or for `useSuspenseQuery` / `useInfiniteQuery` / `queryClient.prefetchQuery` — drop to the primitives. They carry no `@tanstack` types at all, so they compose with any of those:

```ts
import { ioQueryFn } from "functype-react/query"

useQuery({
  queryKey: ["connector-limits", userId],
  queryFn: ioQueryFn(({ signal }) => Http.get<ConnectorLimits>(url, { headers, signal })),
  enabled: !!userId,
})
```

`ioQueryFn` is generic over the query context, so a richer one flows through unchanged — annotate the callback parameter to reach `pageParam` in an infinite query:

```ts
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

## Compatibility

- **TypeScript**: `strict: true` + `noUncheckedIndexedAccess: true`. Loose configs will silently lose the type-level exhaustiveness guarantees.
- **React**: peer dep range `>=18 <20`. Tier 3's `useTaskValue` (and consequently anything that depends on React 19's `use()` hook) is React-19-only at runtime; the rest of the package works on both.
- **SSR / RSC**: hooks are client-only and marked with `"use client"`. `<Match>` family components are pure and render fine in Server Components.
- **React Query**: Tier 5 targets `@tanstack/react-query` v5 (`>=5.0.0`), an optional peer. The `ioQueryFn` / `ioMutationFn` primitives type their context structurally, so they carry no `@tanstack` types and are unaffected by its major-version churn.

## Deferred to v0.2

- `./optics` subpath (`useLens`, `useOptional`, `useSelector`) — blocked on core not shipping a lens module yet.
- React-specific ESLint rules (`must-fold-on-component-return`, `no-getOrThrow-in-render`, etc.) — land in `eslint-functype@2.4.0` once the API stabilizes.
- Codemods, Storybook, cookbook recipes on the Astro site.
- Playwright browser-based testing for `useTaskValue` + `<TaskBoundary>` (jsdom doesn't unsuspend React 19's `use()` reliably).

## License

MIT — see [LICENSE](../../LICENSE).
