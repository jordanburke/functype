# eslint-plugin-functype

## 2.60.8

### Patch Changes

- [#144](https://github.com/jordanburke/functype/pull/144) [`4ad7f3d`](https://github.com/jordanburke/functype/commit/4ad7f3d80d778d22dc07797fc514475c2a57677f) Thanks [@jordanburke](https://github.com/jordanburke)! - Family-cadence patch release.
  - **functype** — Adds `IO.bracketExit(acquire, use, release)`. Same shape as `IO.bracket`, but the `release` callback receives the use-step's `Exit<E, A>` so cleanup can branch on success vs failure (matches the Effect-TS / ZIO / cats-effect convention). Existing `IO.bracket` is unchanged. Closes [#136](https://github.com/jordanburke/functype/issues/136).
  - **functype-os** — `Fs.mkdir` and `Fs.mkdirSync` now refuse `recursive: true` under Linux magic filesystem roots (`/proc/`, `/sys/`, `/dev/`) and return `Left(FsError(...))` immediately. Fixes the indefinite hang reported on Linux where libuv blocks instead of erroring fast. Cross-platform behavior is now predictable. Closes [#135](https://github.com/jordanburke/functype/issues/135).

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
