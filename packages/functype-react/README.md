# functype-react

React bindings for the [functype](https://github.com/jordanburke/functype) functional programming library — ADT-aware hooks and exhaustive pattern matching components.

## Thesis

Push the same ADTs (`Option`, `Either`, `Try`, `Task`, `Validated`) you already trust on the server-side into React component boundaries, so design/requirement errors fail compilation in the UI layer instead of leaking through as `data && !error && !loading` flag soup.

## Install

```bash
pnpm add functype functype-react react react-dom
```

`react-dom` is an optional peer (drop it for React Native / RSC-only consumers).

## Surface

| Subpath                 | Contents                                                                                                                            |
| ----------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| `functype-react` (main) | Stable hooks (`useStable*`), ADT hooks (`useOption`, `useEither`, `useTry`, `useList`), `Match` family components, equality helpers |
| `functype-react/match`  | `<Match>`, `<MatchOption>`, `<MatchEither>`, `<MatchTry>` (also re-exported from main)                                              |
| `functype-react/async`  | `useTask`, `useTaskPromise`, `useTaskValue` (React 19 `use()` bridge), `<TaskBoundary>`                                             |
| `functype-react/forms`  | `Validated<E, A>` type alias, `useValidatedField`, `useValidatedForm`                                                               |

`./async` and `./forms` stay off the main entry so consumers who don't touch Suspense or applicative forms tree-shake them out.

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

## Compatibility

- **TypeScript**: `strict: true` + `noUncheckedIndexedAccess: true`. Loose configs will silently lose the type-level exhaustiveness guarantees.
- **React**: peer dep range `>=18 <20`. Tier 3's `useTaskValue` (and consequently anything that depends on React 19's `use()` hook) is React-19-only at runtime; the rest of the package works on both.
- **SSR / RSC**: hooks are client-only and marked with `"use client"`. `<Match>` family components are pure and render fine in Server Components.

## Deferred to v0.2

- `./optics` subpath (`useLens`, `useOptional`, `useSelector`) — blocked on core not shipping a lens module yet.
- React-specific ESLint rules (`must-fold-on-component-return`, `no-getOrThrow-in-render`, etc.) — land in `eslint-functype@2.4.0` once the API stabilizes.
- Codemods, Storybook, cookbook recipes on the Astro site.
- Playwright browser-based testing for `useTaskValue` + `<TaskBoundary>` (jsdom doesn't unsuspend React 19's `use()` reliably).

## License

MIT — see [LICENSE](../../LICENSE).
