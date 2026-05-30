# eslint-plugin-functype

## 2.61.0

### Minor Changes

- [#157](https://github.com/jordanburke/functype/pull/157) [`d9999ca`](https://github.com/jordanburke/functype/commit/d9999ca054867276a775d5b820beb069aa95edd6) Thanks [@jordanburke](https://github.com/jordanburke)! - - **functype** — Adds `HttpClientConfig.beforeRequest`: an effectful (IO-returning) transformer that runs after `defaultHeaders` and per-call headers are merged but before the request is sent. Closes the request/response asymmetry called out in [#154](https://github.com/jordanburke/functype/issues/154) — the response side already composes via `.tap`/`.map`/`.flatMap`/`.catchTag` on the returned IO; `beforeRequest` lets request-side concerns (auth refresh, request IDs, entry logging) compose the same way using standard IO operators. Returning a failed IO short-circuits the call with the produced `HttpError` and `fetch` is never invoked. Strictly additive; no breaking changes. New `HttpRequestView` type re-exported from `functype/fetch`. `Http`'s CLI/MCP entry now also surfaces the full IO chain methods (`.tap` etc.) that were previously not discoverable from the type's own listing, and `npx functype Http --full` now shows the JSDoc'd `HttpClientConfig` interface. Closes [#154](https://github.com/jordanburke/functype/issues/154).

### Patch Changes

- [#144](https://github.com/jordanburke/functype/pull/144) [`4ad7f3d`](https://github.com/jordanburke/functype/commit/4ad7f3d80d778d22dc07797fc514475c2a57677f) Thanks [@jordanburke](https://github.com/jordanburke)! - Family-cadence patch release.
  - **functype** — Adds `IO.bracketExit(acquire, use, release)`. Same shape as `IO.bracket`, but the `release` callback receives the use-step's `Exit<E, A>` so cleanup can branch on success vs failure (matches the Effect-TS / ZIO / cats-effect convention). Existing `IO.bracket` is unchanged. Closes [#136](https://github.com/jordanburke/functype/issues/136).
  - **functype-os** — `Fs.mkdir` and `Fs.mkdirSync` now refuse `recursive: true` under Linux magic filesystem roots (`/proc/`, `/sys/`, `/dev/`) and return `Left(FsError(...))` immediately. Fixes the indefinite hang reported on Linux where libuv blocks instead of erroring fast. Cross-platform behavior is now predictable. Closes [#135](https://github.com/jordanburke/functype/issues/135).

- [#157](https://github.com/jordanburke/functype/pull/157) [`d9999ca`](https://github.com/jordanburke/functype/commit/d9999ca054867276a775d5b820beb069aa95edd6) Thanks [@jordanburke](https://github.com/jordanburke)! - Family-cadence patch release.
  - **functype** — `src/cli/data.ts` interface lists are now source-derived. A new parser (`scripts/parse-interfaces.ts`) walks each type's `extends` clause and recursively expands wrapper interfaces (`Functype`/`FunctypeBase`/`FunctypeSum`/`FunctypeCollection`/`AsyncMonad`/`Monad`/`Applicative`); `scripts/generate-interfaces.ts` writes `src/cli/interfaces.generated.ts`; a `test/cli/data-sync.spec.ts` superset-check fails CI if `TYPES[name].interfaces` ever drops anything in the source extends chain. Effect: `Doable`, `Promisable`, `Reshapeable`, `Applicative`, `AsyncMonad` now correctly surface for `Option`, `Either`, `Try`, `List`, `Obj`, `Lazy`, `Task` in `npx functype <Type>` and `functype-mcp-server`'s `search_docs`. Closes a discoverability gap that hid `Doable` for the entire monadic family.

## 2.60.7

### Patch Changes

- [#142](https://github.com/jordanburke/functype/pull/142) [`4a3d8c9`](https://github.com/jordanburke/functype/commit/4a3d8c99398cce9075e339ecf96697d4ff4ff119) Thanks [@jordanburke](https://github.com/jordanburke)! - Family-cadence patch release.
  - **functype** — `Either`, `Option`, and `Try` now have `.expect(handler)` for unwrap-or-panic with a `never`-returning handler. Sidesteps the TS narrowing trap where arrow-typed `(...): never` helpers fail to propagate through `isLeft()`/`isNone()`/`isFailure()` checks. Closes [#138](https://github.com/jordanburke/functype/issues/138).
  - **functype-os** — `Fs.appendFile` (TaskResult) and `Fs.appendFileSync` (Either) added, mapping errno → `FsError` consistent with the existing read/write helpers. Lets consumers ndjson-append without giving up O_APPEND atomicity. Closes [#128](https://github.com/jordanburke/functype/issues/128).
  - **eslint-plugin-functype** — `prefer-flatmap` no longer flags `[...arr, x]` / `[...arr]` / `[x, ...arr]` (append/identity) or tuple-shaped literals like `[k, v]`. Only fires when the array literal contains at least one nested `ArrayExpression`. Closes [#137](https://github.com/jordanburke/functype/issues/137).

## 2.60.6

Moved to the `functype` monorepo. Versioning now mirrors `functype`'s minor and patch — `eslint-plugin-functype@2.<functype-minor>.<functype-patch>` (major stays at `2` until functype reaches `1.0`, at which point the eslint packages catch up to `3.0.0` and the family converges on a single version line). No code changes.

## 2.3.0

Last version published from the standalone `jordanburke/eslint-functype` repo.
