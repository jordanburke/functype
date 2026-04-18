# Changelog

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
