# Changelog

## 1.0.1

### Major Changes (family-cadence reset)

- Family-cadence reset to `1.0.1` so functype catches up to `functype-os`/`-log`/`-react` which were unintentionally jumped to `1.0.0` on 2026-05-30 by a `workspace:^` peerDependency + Changesets dependent-update cascade. No code changes vs `0.61.0` — version-number realignment only. See `docs/RELEASE.md` _Independent cadence_ for the full post-mortem and the new `scripts/check-publish-safety.ts` gate that prevents repeats.

## 0.61.0

### Minor Changes

- [#157](https://github.com/jordanburke/functype/pull/157) [`d9999ca`](https://github.com/jordanburke/functype/commit/d9999ca054867276a775d5b820beb069aa95edd6) Thanks [@jordanburke](https://github.com/jordanburke)! - - **functype** — Adds `HttpClientConfig.beforeRequest`: an effectful (IO-returning) transformer that runs after `defaultHeaders` and per-call headers are merged but before the request is sent. Closes the request/response asymmetry called out in [#154](https://github.com/jordanburke/functype/issues/154) — the response side already composes via `.tap`/`.map`/`.flatMap`/`.catchTag` on the returned IO; `beforeRequest` lets request-side concerns (auth refresh, request IDs, entry logging) compose the same way using standard IO operators. Returning a failed IO short-circuits the call with the produced `HttpError` and `fetch` is never invoked. Strictly additive; no breaking changes. New `HttpRequestView` type re-exported from `functype/fetch`. `Http`'s CLI/MCP entry now also surfaces the full IO chain methods (`.tap` etc.) that were previously not discoverable from the type's own listing, and `npx functype Http --full` now shows the JSDoc'd `HttpClientConfig` interface. Closes [#154](https://github.com/jordanburke/functype/issues/154).

### Patch Changes

- [#144](https://github.com/jordanburke/functype/pull/144) [`4ad7f3d`](https://github.com/jordanburke/functype/commit/4ad7f3d80d778d22dc07797fc514475c2a57677f) Thanks [@jordanburke](https://github.com/jordanburke)! - Family-cadence patch release.
  - **functype** — Adds `IO.bracketExit(acquire, use, release)`. Same shape as `IO.bracket`, but the `release` callback receives the use-step's `Exit<E, A>` so cleanup can branch on success vs failure (matches the Effect-TS / ZIO / cats-effect convention). Existing `IO.bracket` is unchanged. Closes [#136](https://github.com/jordanburke/functype/issues/136).
  - **functype-os** — `Fs.mkdir` and `Fs.mkdirSync` now refuse `recursive: true` under Linux magic filesystem roots (`/proc/`, `/sys/`, `/dev/`) and return `Left(FsError(...))` immediately. Fixes the indefinite hang reported on Linux where libuv blocks instead of erroring fast. Cross-platform behavior is now predictable. Closes [#135](https://github.com/jordanburke/functype/issues/135).

- [#157](https://github.com/jordanburke/functype/pull/157) [`d9999ca`](https://github.com/jordanburke/functype/commit/d9999ca054867276a775d5b820beb069aa95edd6) Thanks [@jordanburke](https://github.com/jordanburke)! - Family-cadence patch release.
  - **functype** — `src/cli/data.ts` interface lists are now source-derived. A new parser (`scripts/parse-interfaces.ts`) walks each type's `extends` clause and recursively expands wrapper interfaces (`Functype`/`FunctypeBase`/`FunctypeSum`/`FunctypeCollection`/`AsyncMonad`/`Monad`/`Applicative`); `scripts/generate-interfaces.ts` writes `src/cli/interfaces.generated.ts`; a `test/cli/data-sync.spec.ts` superset-check fails CI if `TYPES[name].interfaces` ever drops anything in the source extends chain. Effect: `Doable`, `Promisable`, `Reshapeable`, `Applicative`, `AsyncMonad` now correctly surface for `Option`, `Either`, `Try`, `List`, `Obj`, `Lazy`, `Task` in `npx functype <Type>` and `functype-mcp-server`'s `search_docs`. Closes a discoverability gap that hid `Doable` for the entire monadic family.

## 0.60.7

### Patch Changes

- [#142](https://github.com/jordanburke/functype/pull/142) [`4a3d8c9`](https://github.com/jordanburke/functype/commit/4a3d8c99398cce9075e339ecf96697d4ff4ff119) Thanks [@jordanburke](https://github.com/jordanburke)! - Family-cadence patch release.
  - **functype** — `Either`, `Option`, and `Try` now have `.expect(handler)` for unwrap-or-panic with a `never`-returning handler. Sidesteps the TS narrowing trap where arrow-typed `(...): never` helpers fail to propagate through `isLeft()`/`isNone()`/`isFailure()` checks. Closes [#138](https://github.com/jordanburke/functype/issues/138).
  - **functype-os** — `Fs.appendFile` (TaskResult) and `Fs.appendFileSync` (Either) added, mapping errno → `FsError` consistent with the existing read/write helpers. Lets consumers ndjson-append without giving up O_APPEND atomicity. Closes [#128](https://github.com/jordanburke/functype/issues/128).
  - **eslint-plugin-functype** — `prefer-flatmap` no longer flags `[...arr, x]` / `[...arr]` / `[x, ...arr]` (append/identity) or tuple-shaped literals like `[k, v]`. Only fires when the array literal contains at least one nested `ArrayExpression`. Closes [#137](https://github.com/jordanburke/functype/issues/137).

## 0.60.6

### Patch Changes

- [#127](https://github.com/jordanburke/functype/pull/127) [`8c05537`](https://github.com/jordanburke/functype/commit/8c05537504e6a21d69d3093a687fae983a0c641c) Thanks [@jordanburke](https://github.com/jordanburke)! - Align `functype-react` to the family's shared version line. No code changes — this is a coordinated patch bump across all five publishable packages so they ship together at the same version going forward:
  - `functype`, `functype-os`, `functype-log`, `functype-mcp-server`: `0.60.5 → 0.60.6`
  - `functype-react`: `0.60.5 → 0.60.6` (jumped from initial `0.1.0` on npm; npm accepts the forward semver step)

  `functype-react@0.1.0` published via the local escape-hatch path; it has the same workspace deps and peers as the other 0.60.x packages, so the version jump is a label change rather than a code break for consumers.

## [0.60.1] — IO covariant in E and A

Completes the covariance story for the error and success channels of `IO<R, E, A>`.
`IO<R, never, A>` now assigns to `IO<R, AnyError, A>` without a cast, removing a class
of `apiSucceed`-style wrappers that downstream consumers (e.g. dokploy's SomaMCP) had
to carry.

### Highlights

- **`IO<in out R extends Type, out E extends Type, out A extends Type>`** — E and A
  covariant; R invariant (ZIO-style `<in R>` still deferred, tracked separately).
- **`IOEffect.RecoverWith` and `IOEffect.Fold`** widen the input positions of their
  stored callbacks to `unknown`. Matches the pre-existing pattern already used on
  `IOEffect.Map`/`FlatMap`/`MapError`. The public `IO.recoverWith` / `IO.fold`
  methods keep their typed callback signatures — only the internal tagged-union
  representation forgets the input type (the interpreter doesn't need it).
- **Interpreter**: three `unsafeCoerce` sites in `runEffectSync` / `runEffect` to
  recover the erased return type after widening.

### Why it was invariant before

`IOEffect` stored `f: (e: E) => IO<R, E, A>` in two branches. Using `E` as _both_ a
parameter and part of the return of one function type makes that stored function
invariant in `E`, which propagated through the `readonly [IOEffectKey]` field and
locked the whole `IO` interface into invariance. Widening the stored input to
`unknown` eliminates the contravariant use; only the return position holds `E`, so
the whole union is covariant in `E` again.

### Tests

- New `test/io/io-variance.spec.ts` — six `expectTypeOf` / `@ts-expect-error`
  assertions guarding E and A covariance and rejecting narrowing.
- All 1569 existing tests pass unchanged.

### Still to do

- **`<in R>` (ZIO-style contravariant R)** — scoped as a follow-up PR. The
  union-based R encoding (functype uses `R | R2`, ZIO uses `R & R2`) interacts with
  `provideContext<R2 extends R>` and `Exclude<R, R2>` in ways that need their own
  audit before flipping the annotation.

## [0.60.0] — Variance across the container family

> Note: originally tagged as `0.6.0` but retagged as `0.60.0` because
> `0.59.1 > 0.6.0` by semver numeric comparison (59 > 6). `0.60.0` is the
> correct successor to the `0.59.x` line.

End of a three-release arc that made every functype container covariant in its
type parameter(s). What started as a surface-level fix to `Either.or` in
0.57.2 turned into an architectural realignment with Scala's collection
variance model. Every documented below is motivated by a real downstream bug
surfaced by envpkt (41 TS errors in a boot pipeline); all 1563 library tests
pass at every step.

### Highlights

- **Sum types (Option, Either, Try)** are covariant in all their type params.
  Narrow errors assign to wider unions via subtyping. Sum types no longer
  extend `Traversable` — they extend a new `FunctypeSum` base with no
  collection-style methods.
- **Collections (List, Set, LazyList)** are covariant via Scala-aligned
  method shapes — `contains(unknown)`, `remove(unknown)`, `add<B>(B): C<A | B>`,
  `concat<B>(C<B>): C<A | B>`, and `reduce` guarded by `Widen<A, B>`.
- **`Widen<A, B>`** (`src/typeclass/variance.ts`) — TS equivalent of Scala's
  `[B >: A]` lower-bound constraint. `list.reduce<string>(...)` on `List<number>`
  is now a compile error instead of a runtime type lie.
- **Base typeclasses** (Traversable, Extractable, Functor, Monad, AsyncMonad,
  etc.) declared `<out T>` with widened default shapes. Every implementer
  inherits the covariance-safe signatures without per-type overrides.
- **Intentionally invariant**: `Ref<A>` (mutable cell), `Obj<T>` (record type
  with `keyof`), `Map<K, _>` (key type). Documented with JSDoc.
- **Still to do**: `IO<R, E, A>` needs ZIO-style `<in R, out E, out A>`
  variance (requirement channel is contravariant). Separate patch.

### Release timeline

- **0.57.2** — widen `Either.or` to `<L2>(Either<L2, R>): Either<L | L2, R>`
- **0.57.3** — widen `Either.ap`, `flatMap`, `flatMapAsync`, `traverse`
- **0.58.0** — Scala-aligned sum-type hierarchy; `FunctypeSum` base; Either/Try
  drop collection-ish methods (reduce, reduceRight, size, isEmpty, find,
  count, toList, lazyMap). Declared `<out L, out R>` / `<out T>`
- **0.58.1** — List<out A>, Set<out A>. Scala-aligned `unknown` element
  queries + `<B>` additive widening. `toList()` restored on sum types
- **0.59.0** — Phase A: typeclass-level upgrade. `Widen<A, B>` helper + per-site
  `reduceWiden`/`reduceRightWiden` utilities. Redundant per-type overrides
  removed
- **0.59.1** — Phase B: remaining containers declared covariant (Identity,
  Tuple, LazyList, Lazy, Map<K, +V>, Task/Ok/Err). Ref and Obj documented as
  intentionally invariant
- **0.6.0** — variance guide (`docs/variance-guide.md`), skill update,
  feature-matrix variance column. Milestone release

### Breaking

- `Either<L, R>` and `Try<T>` no longer have `reduce`, `reduceRight`, `size`,
  `isEmpty`, `find`, `count`, `toList`, `lazyMap`. Migration:
  - `.reduce(f)` → `.fold(() => zero, r => f(zero, r))`
  - `.size` / `.isEmpty` → `e.isLeft()` / `e.isRight()`
  - `.toList()` → `.fold(() => [], r => [r])` (or `.toOption().toList()`)
  - `.find(p)` → `.exists(p) ? .toOption() : None()`
  - `.lazyMap(f)` → `.map(f)` or generator literal

- `reduce<B>(op)` on collections now requires `B` to be a supertype of `A`
  (enforced via `Widen<A, B>`). Prior code with `B = A` (the default) compiles
  unchanged. Code that explicitly passed an unrelated `B` compiled silently
  and produced a runtime type lie — that code now fails at compile time, as
  intended.

See [`docs/variance-guide.md`](./docs/variance-guide.md) for the full
contributor reference.

## [0.17.2] - 2025-01-15

### Added

- **Companion Pattern Enhancements**
  - New `CompanionTypes` module with helper types for working with Companion objects
    - `CompanionMethods<T>` - Extract companion methods type from a Companion object
    - `InstanceType<T>` - Extract instance type from a constructor function
    - `isCompanion()` - Runtime type guard to check if a value is a Companion object
  - New `SerializationCompanion` module with shared serialization utilities
    - `createSerializer()` - Create serializer for simple tagged values
    - `createCustomSerializer()` - Create serializer for complex objects
    - `fromJSON()`, `fromYAML()`, `fromBinary()` - Generic deserialization helpers
    - `createSerializationCompanion()` - Generate companion serialization methods
  - Added type guards as static methods in companion objects:
    - `Option.isSome()`, `Option.isNone()` - Type guards for Option
    - `Either.isLeft()`, `Either.isRight()` - Type guards for Either
    - `Try.isSuccess()`, `Try.isFailure()` - Type guards for Try

- **Documentation**
  - New comprehensive guide: `docs/companion-pattern.md` explaining the Companion pattern
  - Complete examples of creating custom Companion types
  - Comparison with Scala's companion objects and other TypeScript patterns

- **Exports**
  - Added package.json exports for `functype/companion` and `functype/serialization`
  - Exported CompanionTypes and SerializationCompanion from main index

### Changed

- **Either Refactored to Companion Pattern**
  - Migrated Either from namespace object pattern to Companion pattern for consistency
  - All Either types now follow the same pattern as Option, Try, List, etc.
  - Added `Either.left()` and `Either.right()` companion methods
  - Maintains full backward compatibility - `Left()` and `Right()` still work

- **Standardized Serialization**
  - Refactored 6 types to use shared serialization utilities: Option, Try, List, Set, Map, Lazy
  - Consistent serialization format across all types
  - Reduced code duplication and improved maintainability

### Tests

- Added comprehensive tests for CompanionTypes helper functions (9 tests)
- Added comprehensive tests for SerializationCompanion utilities (18 tests)
- All 1079 existing tests continue to pass

## [0.8.61] - 2025-03-30

### Added

- Enhanced Task module to better serve as adapter between promise-based code and functional patterns
  - Added `fromPromise` adapter to convert promise-returning functions to Task-compatible functions
  - Added `toPromise` converter to transform Task results back to promises
  - Improved documentation for Task semantics
- Created comprehensive migration guide in `docs/TaskMigration.md` showing how to migrate from promises to functional Task patterns
- Added tests for new Task adapter methods

### Fixed

- Fixed implementation of `Task.Sync` and `Task.Async` to better align with functional patterns
- Updated README with correct Task examples and usage patterns
- Updated TODO list to reflect completed Task enhancements

## [0.8.60] - 2025-03-15

### Changed

- Renamed Companion parameters for better clarity

## [0.8.59] - 2025-03-10

### Changed

- Reorganized directory structure
- Fixed compilation issues throughout the codebase
