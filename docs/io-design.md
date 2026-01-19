# Plan: Unified IO Effect Type for functype

## Problem Statement

Promises in JavaScript have fundamental limitations that functype's current types cannot fully address because they wrap Promise:

1. **Eager execution** - Promises run immediately, preventing composition-before-execution
2. **No sync/async unification** - Different APIs for sync vs async operations
3. **Untyped errors** - Promise rejections are `unknown`
4. **Limited cancellation** - Signal-based only, underlying work continues
5. **Composition friction** - .then() chains are awkward for functional programming

## Recommended Approach: New IO<E, A> Type

Build a lazy, unified effect type inspired by Effect-TS/ZIO that solves all pain points while maintaining functype's Scala-inspired API style.

### Core Design

```typescript
// Main Effect type: IO<R, E, A>
// R = Requirements (dependencies)
// E = Error type
// A = Success type
type IO<R, E, A> = {
  // Core operations
  map: <B>(f: (a: A) => B) => IO<R, E, B>
  flatMap: <R2, E2, B>(f: (a: A) => IO<R2, E2, B>) => IO<R | R2, E | E2, B>
  tap: (f: (a: A) => void) => IO<R, E, A>

  // Error handling
  mapError: <E2>(f: (e: E) => E2) => IO<R, E2, A>
  recover: (fallback: A) => IO<R, never, A>
  recoverWith: <R2, E2>(f: (e: E) => IO<R2, E2, A>) => IO<R | R2, E2, A>
  catchTag: <K extends E["_tag"], R2, E2, B>(
    tag: K,
    f: (e: Extract<E, { _tag: K }>) => IO<R2, E2, B>,
  ) => IO<R | R2, Exclude<E, { _tag: K }> | E2, A | B>

  // Dependency injection
  provide: <R2 extends R>(service: R2) => IO<Exclude<R, R2>, E, A>
  provideLayer: <R2 extends R>(layer: Layer<R2>) => IO<Exclude<R, R2>, E, A>

  // Execution
  run: () => Promise<A> // Requires R = never
  runSync: () => A // Throws if async or has deps
  runEither: () => Promise<Either<E, A>>
  runExit: () => Promise<Exit<E, A>>

  // Pipe support (Effect-TS style)
  pipe: <B>(f: (self: IO<R, E, A>) => B) => B

  // Integration
  toTask: () => TaskOutcome<A>
}

// Exit type for capturing full outcome
type Exit<E, A> =
  | { _tag: "Success"; value: A }
  | { _tag: "Failure"; error: E }
  | { _tag: "Interrupted"; fiberId: string }
```

### Constructors

```typescript
const IO = {
  // Sync operations
  sync: <A>(f: () => A) => IO<never, never, A>,
  succeed: <A>(a: A) => IO<never, never, A>,
  fail: <E>(e: E) => IO<never, E, never>,
  die: (defect: unknown) => IO<never, never, never>, // Unrecoverable

  // Async operations
  async: <A>(f: () => Promise<A>) => IO<never, unknown, A>,
  tryPromise: <A, E>(opts: { try: () => Promise<A>; catch: (error: unknown) => E }) => IO<never, E, A>,

  // Lifting
  liftSync:
    <Args extends unknown[], A>(f: (...args: Args) => A) =>
    (...args: Args) =>
      IO<never, never, A>,

  liftPromise:
    <Args extends unknown[], A>(f: (...args: Args) => Promise<A>) =>
    (...args: Args) =>
      IO<never, unknown, A>,

  // Service access
  service: <S>(tag: Tag<S>) => IO<S, never, S>,

  // Integration
  fromEither: <E, A>(either: Either<E, A>) => IO<never, E, A>,
  fromOption: <A>(option: Option<A>) => IO<never, void, A>,
  fromTry: <A>(t: Try<A>) => IO<never, Error, A>,

  // Generator syntax
  gen: <R, E, A>(f: () => Generator<IO<R, E, unknown>, A, unknown>) => IO<R, E, A>,
}
```

### Service Tags & Layers (Dependency Injection)

```typescript
// Define a service
class Database extends Tag<Database>()("Database", {
  query: (sql: string) => IO<never, DbError, Row[]>,
  execute: (sql: string) => IO<never, DbError, void>,
}) {}

// Use a service
const getUsers = IO.gen(function* () {
  const db = yield* IO.service(Database)
  const users = yield* db.query("SELECT * FROM users")
  return users
})

// Create a layer (implementation)
const DatabaseLive = Layer.succeed(Database, {
  query: (sql) =>
    IO.tryPromise({
      try: () => pgClient.query(sql),
      catch: (e) => new DbError(e),
    }),
  execute: (sql) =>
    IO.tryPromise({
      try: () => pgClient.execute(sql),
      catch: (e) => new DbError(e),
    }),
})

// Compose layers
const AppLive = Layer.merge(DatabaseLive, LoggerLive, ConfigLive)

// Run with dependencies
const result = await getUsers.pipe(IO.provide(AppLive), IO.run)
```

### Interfaces Implemented

IO will implement full functype interfaces for consistency with Option, Either, etc:

- **Functor**: `map<B>(f: (a: A) => B): IO<E, B>`
- **Monad**: `flatMap<E2, B>(f: (a: A) => IO<E2, B>): IO<E | E2, B>`
- **Foldable**: `fold<B>(onError: (e: E) => B, onSuccess: (a: A) => B): IO<never, B>`
- **Matchable**: Pattern matching support
- **Serializable**: JSON serialization for debugging/logging

### Structured Concurrency

Parent-child relationship with automatic cleanup:

```typescript
// All children cancelled if parent fails or is cancelled
const program = IO.all([fetchUser("1"), fetchUser("2"), fetchUser("3")])

// Resources always cleaned up
const withFile = IO.bracket(
  IO.sync(() => openFile("data.txt")), // acquire
  (file) => IO.sync(() => file.close()), // release (always runs)
  (file) => IO.async(() => file.read()), // use
)

// Scope-based resource management
const program = IO.scoped(function* () {
  const file = yield* IO.acquireRelease(openFile, closeFile)
  const data = yield* readFile(file)
  return data
})
```

### Ergonomic Features

1. **Generator do-notation (`IO.gen`)**

```typescript
const program = IO.gen(function* () {
  const user = yield* getUser("123")
  const posts = yield* getPosts(user.id)
  return { user, posts }
})
```

2. **Builder do-notation (`IO.Do`)**

```typescript
const program = IO.Do.bind("user", () => getUser("123"))
  .bind("posts", ({ user }) => getPosts(user.id))
  .map(({ user, posts }) => ({ user, posts }))
```

3. **liftPromise for external APIs**

```typescript
const fetchUser = IO.liftPromise(api.getUser)
// Now: fetchUser("123") returns IO<unknown, User>
```

4. **Module adapter pattern**

```typescript
// api.io.ts
export const users = {
  get: IO.liftPromise(api.getUser),
  create: IO.liftPromise(api.createUser),
}
```

### Integration with Sync Types

IO integrates with functype's sync data types (no Task/Task integration):

| From         | To IO             | From IO        |
| ------------ | ----------------- | -------------- |
| Either<E, A> | IO.fromEither(e)  | io.runEither() |
| Option<A>    | IO.fromOption(o)  | io.runOption() |
| Try<A>       | IO.fromTry(t)     | io.runTry()    |
| Promise<A>   | IO.async(() => p) | io.run()       |

### Implementation Phases

**Phase 1: Core IO Type & Runtime**

- IO<R, E, A> type with R (requirements), E (error), A (success) parameters
- Basic constructors: sync, succeed, fail, die, async, tryPromise
- Core operations: map, flatMap, tap, mapError, recover, recoverWith
- Basic runtime: run(), runSync(), runEither(), runExit()
- Exit type for capturing outcomes
- Companion pattern following functype conventions

**Phase 2: Do-Notation & Pipe**

- IO.gen() with generator function support (yield\* syntax)
- IO.Do builder with bind/map pattern
- Pipe support for Effect-TS style composition
- liftSync, liftPromise utilities for ergonomics

**Phase 3: Dependency Injection**

- Tag<S> for defining service types
- IO.service() for accessing services
- Layer<R> for providing implementations
- Layer.succeed, Layer.effect, Layer.merge
- provide() and provideLayer() on IO

**Phase 4: Structured Concurrency**

- Fiber abstraction for running effects
- Cancellation with interrupt propagation
- IO.bracket for resource safety (acquire/release)
- IO.scoped and acquireRelease
- IO.all, IO.race, IO.any, IO.forEach combinators
- Configurable concurrency limits

**Phase 5: Full Interface Implementation**

- Implement Functor, Monad, Foldable, Matchable
- Error handling: catchTag, catchAll, retry, timeout
- Integration with sync types: fromEither, fromOption, fromTry
- No Task/Task integration (standalone)

**Phase 6: Testing & Documentation**

- TestClock for time-based testing
- Test layers for mocking services
- Comprehensive test suite with property tests
- Documentation and examples
- Feature matrix update

### Relationship to Task

**No integration for now.** IO is a standalone effect type:

- **Task**: Unchanged, continues to exist
- **IO**: New standalone type, no dependencies on Task

Users can choose which to use based on their needs. Integration/migration can be added later if desired.

## Files to Create/Modify

### New Files - Core IO

- `src/io/IO.ts` - Main IO<R, E, A> implementation
- `src/io/Exit.ts` - Exit<E, A> type (Success/Failure/Interrupted)
- `src/io/Runtime.ts` - Effect runtime and executors
- `src/io/index.ts` - Module exports

### New Files - Dependency Injection

- `src/io/Tag.ts` - Service tag definitions
- `src/io/Layer.ts` - Layer<R> for service provision
- `src/io/Context.ts` - Context for holding services

### New Files - Concurrency

- `src/io/Fiber.ts` - Fiber abstraction for running effects
- `src/io/Scope.ts` - Scoped resource management
- `src/io/Schedule.ts` - Retry and repeat schedules

### New Files - Testing

- `src/io/TestClock.ts` - Controlled time for testing
- `src/io/TestContext.ts` - Test utilities

### Test Files

- `test/io/io.spec.ts` - Core IO operations
- `test/io/io-gen.spec.ts` - Generator syntax
- `test/io/io-layer.spec.ts` - Dependency injection
- `test/io/io-fiber.spec.ts` - Concurrency
- `test/io/io-resource.spec.ts` - Resource management
- `test/io/io-integration.spec.ts` - Integration with Option/Either/etc.

### Modified Files

- `src/index.ts` - Add IO exports
- `package.json` - Add io export paths
- `docs/FUNCTYPE_FEATURE_MATRIX.md` - Add IO row with full interface support

## Design Decisions

1. **Name**: `IO` (classic FP naming from Haskell, cats-effect)
2. **Type Signature**: `IO<R, E, A>` with requirements (R), error (E), and success (A) parameters
3. **Interfaces**: Full formal interfaces - IO will implement Functor, Monad, Foldable, Matchable
4. **Cancellation**: Structured concurrency - parent cancels children, cleanup guarantees
5. **Resource management**: bracket/acquireRelease/scoped patterns
6. **Dependency Injection**: Tag + Layer system inspired by Effect-TS
7. **API Style**: Both method-chaining AND pipe support for flexibility
8. **Scope**: Comprehensive - this is a significant addition comparable to Effect-TS core

## Success Criteria

### Core Functionality

- [ ] Lazy execution - nothing runs until explicitly executed
- [ ] Unified API for sync/async operations
- [ ] Typed errors `IO<R, E, A>` at compile time
- [ ] Clean composition via map/flatMap

### Ergonomics

- [ ] Generator do-notation with `IO.gen(function* () { yield* effect })`
- [ ] Builder do-notation with `IO.Do.bind().map()`
- [ ] Pipe support for Effect-TS style composition
- [ ] liftSync/liftPromise for wrapping external code
- [ ] Both method-chaining and pipe APIs

### Dependency Injection

- [ ] Tag<S> for defining service types
- [ ] Layer<R> for providing implementations
- [ ] Composable layers via Layer.merge

### Concurrency

- [ ] Structured concurrency with parent-child relationships
- [ ] Cancellation with cleanup guarantees
- [ ] IO.all, IO.race with configurable concurrency
- [ ] Resource safety via bracket/acquireRelease

### Integration

- [ ] Full functype interface implementation (Functor, Monad, Foldable, Matchable)
- [ ] Bridges to sync types: Either, Option, Try (no Task/Task)
- [ ] Comprehensive test suite with property tests

### Comparison to Effect-TS

| Feature                | Effect-TS | functype IO               |
| ---------------------- | --------- | ------------------------- |
| Core Effect type       | ✓         | ✓                         |
| Generator syntax       | ✓         | ✓                         |
| Layers/DI              | ✓         | ✓                         |
| Structured concurrency | ✓         | ✓                         |
| Schema/validation      | ✓         | ✗ (use existing functype) |
| HTTP/SQL/Platform      | ✓         | ✗ (out of scope)          |
| functype integration   | ✗         | ✓                         |
