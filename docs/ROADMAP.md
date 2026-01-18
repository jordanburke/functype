# Functype Completeness Roadmap

> **Version**: 0.43.x → 1.0.0 Target
> **Updated**: January 2026
> **Goal**: Pragmatic FP subset for TypeScript (80% of Scala stdlib use cases)

---

## Current State: ~60% Complete

### What's Already Solid

| Type             | Status       | Notes                                    |
| ---------------- | ------------ | ---------------------------------------- |
| `Option<A>`      | ✅ Complete  | Some/None, full typeclass support        |
| `Either<E, A>`   | ✅ Complete  | Left/Right, error handling               |
| `Try<A>`         | ✅ Complete  | Success/Failure, exception handling      |
| `List<A>`        | ✅ Complete  | Immutable, full Monad                    |
| `LazyList<A>`    | ⚠️ Partial   | Works, needs monad law verification      |
| `Set<A>`         | ✅ Complete  | Immutable set                            |
| `Map<K, V>`      | ⚠️ Partial   | SafeTraversable only (by design)         |
| `Stack<A>`       | ⚠️ Partial   | Missing Functor/Monad                    |
| `Task<A>`        | ✅ Complete  | Async with cancellation                  |
| `IO<R, E, A>`    | ✅ Complete  | ZIO-inspired effect system               |
| `Do` notation    | ✅ Excellent | 2.5-12x faster than flatMap chains       |
| `ValidatedBrand` | ✅ Complete  | Branded types with runtime validation    |
| HKT simulation   | ✅ Working   | Runtime discriminants (not compile-time) |

### Key Gaps

| Type              | Status        | Priority                        |
| ----------------- | ------------- | ------------------------------- |
| `NonEmptyList<A>` | ❌ Missing    | **High** - needed for Validated |
| `Validated<E, A>` | ❌ Missing    | **High** - error accumulation   |
| `Reader<R, A>`    | ❌ Missing    | **Medium** - DI patterns        |
| `Lens<S, A>`      | ❌ Missing    | **Medium** - immutable updates  |
| `FPromise`        | 🗑️ Deprecated | Remove - Task supersedes        |

---

## Phase 1: Foundation Types

### 1a. NonEmptyList<A> (Nel)

**Purpose**: Guaranteed non-empty collection. Essential for error accumulation.

**API Design**:

```typescript
// Construction
Nel.of<A>(head: A, ...tail: A[]): NonEmptyList<A>
Nel.fromList<A>(list: List<A>): Option<NonEmptyList<A>>
Nel.fromArray<A>(arr: A[]): Option<NonEmptyList<A>>
Nel.unsafe<A>(head: A, ...tail: A[]): NonEmptyList<A>  // Throws if empty

// Instance methods
nel.head: A                          // Always safe, no Option
nel.tail: List<A>                    // May be empty
nel.toList: List<A>                  // Convert to regular List
nel.map<B>(f: A => B): NonEmptyList<B>
nel.flatMap<B>(f: A => NonEmptyList<B>): NonEmptyList<B>
nel.concat(other: NonEmptyList<A>): NonEmptyList<A>
nel.prepend(a: A): NonEmptyList<A>
nel.append(a: A): NonEmptyList<A>
```

**Type Classes**:

- Functor ✓
- Applicative ✓
- Monad ✓
- Foldable ✓
- Traversable ✓
- Serializable ✓

**Files to Create**:

- `src/nel/index.ts` - Main implementation
- `src/nel/NonEmptyList.ts` - Type and class
- `src/nel/Companion.ts` - Static methods
- `test/nel/nel.spec.ts` - Tests
- `test/nel/nel-laws.spec.ts` - Monad law verification

---

### 1b. Validated<E, A>

**Purpose**: Applicative validation that accumulates ALL errors (unlike Either's fail-fast).

**API Design**:

```typescript
// Type definition
type Validated<E, A> = Valid<A> | Invalid<NonEmptyList<E>>
type ValidatedNel<E, A> = Validated<E, A>  // Alias, Nel is standard

// Construction
Validated.valid<E, A>(a: A): Validated<E, A>
Validated.invalid<E, A>(e: E): Validated<E, A>
Validated.invalidNel<E, A>(errors: NonEmptyList<E>): Validated<E, A>
Validated.fromEither<E, A>(either: Either<E, A>): Validated<E, A>
Validated.fromOption<E, A>(opt: Option<A>, ifNone: () => E): Validated<E, A>

// Applicative combination (the key feature)
Validated.mapN<E, A, B, C>(
  va: Validated<E, A>,
  vb: Validated<E, B>
)(f: (a: A, b: B) => C): Validated<E, C>

// Overloads for mapN with 2-8 arguments
Validated.mapN<E, A, B, C, D>(va, vb, vc)(f: (a, b, c) => D): Validated<E, D>
// ... up to 8

// Instance methods
validated.isValid: boolean
validated.isInvalid: boolean
validated.toEither: Either<NonEmptyList<E>, A>
validated.map<B>(f: A => B): Validated<E, B>
validated.leftMap<E2>(f: E => E2): Validated<E2, A>
validated.bimap<E2, B>(fe: E => E2, fa: A => B): Validated<E2, B>
validated.andThen<B>(f: A => Validated<E, B>): Validated<E, B>  // Monadic but discards left errors
validated.fold<B>(onInvalid: Nel<E> => B, onValid: A => B): B
```

**ValidatedBrand Integration**:

```typescript
// Add to ValidatedBrandCompanion interface
interface ValidatedBrandCompanion<K, T> {
  // ... existing methods ...
  validated: (value: T) => Validated<string, ValidatedBrand<K, T>>
}

// Usage
const result = Validated.mapN(
  EmailAddress.validated(input.email),
  Port.validated(input.port),
  Username.validated(input.name),
)(createServerConfig)
```

**Files to Create**:

- `src/validated/index.ts`
- `src/validated/Validated.ts`
- `src/validated/Valid.ts`
- `src/validated/Invalid.ts`
- `src/validated/Companion.ts`
- `test/validated/validated.spec.ts`
- `test/validated/validated-laws.spec.ts`

**Files to Modify**:

- `src/branded/ValidatedBrand.ts` - Add `.validated()` method
- `src/index.ts` - Export Validated

---

### 1c. Stack<A> Compliance

**Current State**: Only Foldable + Matchable
**Target**: Add Functor + Monad

**Changes to `src/stack/index.ts`**:

```typescript
// Add to Stack class
map<B>(f: (a: A) => B): Stack<B>
flatMap<B>(f: (a: A) => Stack<B>): Stack<B>
ap<B>(ff: Stack<(a: A) => B>): Stack<B>
```

---

## Phase 2: Reader Monad

### Reader<R, A>

**Purpose**: Dependency injection pattern. Pass environment through computation.

**API Design**:

```typescript
// Type: R => A (function that reads from environment R and produces A)
class Reader<R, A> {
  readonly run: (r: R) => A
}

// Construction
Reader.of<R, A>(a: A): Reader<R, A>           // Pure value, ignores env
Reader.ask<R>(): Reader<R, R>                  // Get the environment
Reader.asks<R, A>(f: R => A): Reader<R, A>     // Extract from environment
Reader.lift<R, A>(a: A): Reader<R, A>          // Alias for of

// Instance methods
reader.run(r: R): A                            // Execute with environment
reader.map<B>(f: A => B): Reader<R, B>
reader.flatMap<B>(f: A => Reader<R, B>): Reader<R, B>
reader.local<R2>(f: R2 => R): Reader<R2, A>    // Transform environment
reader.zip<B>(other: Reader<R, B>): Reader<R, [A, B]>
```

**Do-notation Integration**:

```typescript
const program = Do(function* () {
  const config = yield* Reader.ask<Config>()
  const db = yield* Reader.asks<Config, Database>((c) => c.database)
  const user = yield* Reader.lift(db.findUser(userId))
  return user
})

// Run with environment
const user = program.run({ database: myDb, logger: myLogger })
```

**Files to Create**:

- `src/reader/index.ts`
- `src/reader/Reader.ts`
- `src/reader/Companion.ts`
- `test/reader/reader.spec.ts`
- `test/reader/reader-laws.spec.ts`

---

## Phase 3: Basic Lens

### Lens<S, A>

**Purpose**: Immutable nested updates without spread hell.

**API Design** (simple version):

```typescript
class Lens<S, A> {
  readonly get: (s: S) => A
  readonly set: (s: S, a: A) => S
}

// Construction
Lens.of<S, A>(get: S => A, set: (S, A) => S): Lens<S, A>
Lens.prop<S, K extends keyof S>(key: K): Lens<S, S[K]>

// Instance methods
lens.get(s: S): A
lens.set(s: S, a: A): S
lens.modify(s: S, f: A => A): S
lens.compose<B>(other: Lens<A, B>): Lens<S, B>

// Optional: Lens.id<S>(): Lens<S, S>
```

**Usage**:

```typescript
interface User {
  name: string
  address: { city: string; zip: string }
}

const nameLens = Lens.prop<User, "name">("name")
const addressLens = Lens.prop<User, "address">("address")
const cityLens = Lens.prop<User["address"], "city">("city")
const addressCityLens = addressLens.compose(cityLens)

const user: User = { name: "Alice", address: { city: "NYC", zip: "10001" } }
const updated = addressCityLens.modify(user, (city) => city.toUpperCase())
// { name: 'Alice', address: { city: 'NYC', zip: '10001' } }
```

**Scope**: Only Lens. Skip Prism/Iso/Traversal/Optional for now.

**Files to Create**:

- `src/lens/index.ts`
- `src/lens/Lens.ts`
- `src/lens/Companion.ts`
- `test/lens/lens.spec.ts`
- `test/lens/lens-laws.spec.ts` (lens laws: get-set, set-get, set-set)

---

## Phase 4: Cleanup

### 4a. Deprecate FPromise

1. Add deprecation notice to `src/fpromise/index.ts`:
   ```typescript
   /** @deprecated Use Task instead. FPromise will be removed in v1.0.0 */
   ```
2. Remove from main exports in `src/index.ts`
3. Add migration note to CHANGELOG
4. Delete entirely in v1.0.0

### 4b. LazyList Monad Law Verification

Add property-based tests to verify:

- Left identity: `LazyList.of(a).flatMap(f) === f(a)`
- Right identity: `m.flatMap(LazyList.of) === m`
- Associativity: `m.flatMap(f).flatMap(g) === m.flatMap(a => f(a).flatMap(g))`

File: `test/lazylist/lazylist-laws.spec.ts`

---

## Out of Scope (Pragmatic Decision)

| Type                                | Reason                                        |
| ----------------------------------- | --------------------------------------------- |
| State monad                         | IO already handles stateful patterns          |
| Writer monad                        | Rarely needed in practice                     |
| Full optics (Prism, Iso, Traversal) | Basic Lens covers 90% of cases                |
| Structural sharing                  | Premature optimization                        |
| Map as Functor                      | Semantic confusion (map over keys vs values?) |
| True compile-time HKT               | TypeScript limitation                         |

---

## Implementation Order

| #   | Item                       | Effort  | Depends On   |
| --- | -------------------------- | ------- | ------------ |
| 1a  | NonEmptyList               | Medium  | -            |
| 1b  | Validated                  | Medium  | NonEmptyList |
| 1c  | ValidatedBrand.validated() | Low     | Validated    |
| 1d  | Stack Functor/Monad        | Low     | -            |
| 2   | Reader                     | Medium  | -            |
| 3   | Lens                       | Low-Med | -            |
| 4a  | Deprecate FPromise         | Low     | -            |
| 4b  | LazyList law tests         | Low     | -            |

---

## Verification Checklist

After each phase:

- [ ] `pnpm test` - All tests pass
- [ ] `pnpm typecheck` - No type errors
- [ ] `pnpm lint` - No lint issues
- [ ] Update `src/cli/data.ts` - CLI help for new types
- [ ] Update `docs/FUNCTYPE_FEATURE_MATRIX.md`
- [ ] Update CHANGELOG.md
- [ ] Bump version appropriately

---

## Target: v1.0.0

When all phases complete, functype will have:

- ✅ All core Scala types (Option, Either, Try, List, Set, Map)
- ✅ NonEmptyList for guaranteed non-empty collections
- ✅ Validated for applicative error accumulation
- ✅ Reader for dependency injection
- ✅ Basic Lens for immutable updates
- ✅ IO effect system (already complete)
- ✅ Excellent Do-notation performance
- ✅ Full typeclass hierarchy

This covers the pragmatic 80% of FP patterns in TypeScript.
