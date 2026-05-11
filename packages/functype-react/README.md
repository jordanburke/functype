# functype-react

React bindings for the [functype](../functype) functional programming library — ADT-aware hooks and exhaustive pattern matching components.

> **v0.1: scaffold only.** The primitives that carry the package's thesis are tracked in a separate spec. This package currently exists to reserve the npm name, lock the family conventions, and unblock cross-package iteration during functype core development.

## Thesis

Push the same ADTs (`Option`, `Either`, `Try`, `Task`, `Validated`) you already trust on the server-side into React component boundaries, so design/requirement errors fail compilation in the UI layer instead of leaking through as `data && !error && !loading` flag soup.

## Planned v0.1 surface

| Primitive                                                    | Purpose                                                                                    |
| ------------------------------------------------------------ | ------------------------------------------------------------------------------------------ |
| `<Match>` / `<MatchOption>` / `<MatchEither>` / `<MatchTry>` | Exhaustive ADT pattern matching for JSX — adding a domain case becomes a UI compile error. |
| `useTask` returning `TaskState<E,A>`                         | Discriminated async state — no `data && error && isLoading` nonsense states.               |
| `<TaskBoundary>`                                             | Suspense + error boundary integration for Task.                                            |
| `useValidated` / `useValidatedForm` over `Validated<E,A>`    | Applicative form validation that accumulates errors instead of short-circuiting.           |
| Branded / phantom-typed lifecycle helpers                    | Invalid state transitions don't compile.                                                   |

## Installation (once published)

```bash
pnpm add functype functype-react react react-dom
```

## License

MIT — see [LICENSE](../../LICENSE).
