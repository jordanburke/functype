# IO<R,E,A>

Lazy, composable effects with typed errors and dependency injection.

## Overview

IO represents a lazy effect that:

- Requires environment `R` (dependencies)
- May fail with error `E` (typed errors)
- Produces value `A` on success

Nothing runs until explicitly executed.

## Basic Usage

```typescript
import { IO } from "functype/io"

// Synchronous effect
const sync = IO.sync(() => 42)

// Async effect
const async = IO.async(async () => fetchData())

// Effect that may fail
const safe = IO.tryCatch(
  () => JSON.parse(input),
  (e) => new ParseError(e),
)

// Running effects - safe by default
const either = await sync.run() // Either<E, A> - never throws
const value = await sync.runOrThrow() // A - throws on error

// Synchronous execution
const syncEither = sync.runSync() // Either<E, A> - never throws
const syncValue = sync.runSyncOrThrow() // A - throws on error
```

## Constructors

| Method                             | Description                      |
| ---------------------------------- | -------------------------------- |
| `IO.succeed(value)`                | Effect that succeeds with value  |
| `IO.fail(error)`                   | Effect that fails with error     |
| `IO.sync(() => A)`                 | Wrap synchronous computation     |
| `IO.async(async () => A)`          | Wrap async computation           |
| `IO.tryCatch(fn, onError)`         | Catch exceptions as typed errors |
| `IO.fromPromise(promise, onError)` | Convert Promise to IO            |
| `IO.unit`                          | Effect that succeeds with void   |
| `IO.never`                         | Effect that never completes      |

## Transformations

```typescript
// Map over success value
io.map((x) => x * 2)

// Chain effects
io.flatMap((x) => IO.succeed(x + 1))

// Handle errors
io.mapError((e) => new WrappedError(e))
io.catchAll((e) => IO.succeed(fallback))
io.recover(defaultValue)

// Provide fallback
io.orElse(fallbackIO)
```

## Combining Effects

```typescript
// Run in parallel
IO.all([io1, io2, io3]) // All must succeed
IO.race([io1, io2]) // First to complete wins
IO.any([io1, io2, io3]) // First success wins

// Zip effects
io1.zip(io2) // [A, B]
io1.zipWith(io2, (a, b) => c) // C

// Sequential
io1.andThen(io2) // Run io2 after io1
```

## Dependency Injection

IO has built-in dependency injection using Tags, Contexts, and Layers.

```typescript
import { IO, Tag, Context } from "functype/io"

// Define service interface
interface Logger {
  log(message: string): void
}

// Create a Tag for the service
const Logger = Tag<Logger>("Logger")

// Use the service
const program = IO.service(Logger).flatMap((logger) => IO.sync(() => logger.log("Hello!")))

// Provide implementation
const result = await program.provideService(Logger, { log: console.log }).runOrThrow()
```

### Context and Layer

```typescript
// Build context with multiple services
const context = Context.empty().add(Logger, consoleLogger).add(Config, appConfig)

// Provide full context
program.provideContext(context)

// Use Layer for complex dependency graphs
const AppLayer = Layer.succeed(Logger, consoleLogger).merge(Layer.succeed(Config, appConfig))

program.provideLayer(AppLayer)
```

## Do-Notation

### Generator Syntax (IO.gen)

```typescript
const program = IO.gen(function* () {
  const a = yield* IO.succeed(1)
  const b = yield* IO.succeed(2)
  const c = yield* IO.succeed(3)
  return a + b + c
})

await program.runOrThrow() // 6
```

### Builder Syntax (IO.Do)

```typescript
const program = IO.Do.bind("user", () => getUser("123"))
  .bind("posts", ({ user }) => getPosts(user.id))
  .let("count", ({ posts }) => posts.length)
  .map(({ user, posts, count }) => ({ user, posts, count }))
```

## Resource Management

```typescript
// Bracket pattern
IO.bracket(
  IO.sync(() => openFile(path)), // acquire
  (file) => IO.sync(() => file.close()), // release
  (file) => IO.sync(() => file.read()), // use
)

// Acquire/Release
IO.acquireRelease(
  IO.sync(() => openConnection()),
  (conn) => IO.sync(() => conn.close()),
)
```

## Error Handling Patterns

```typescript
// Catch specific errors
io.catch("NotFound", () => IO.succeed(null))

// Fold over success/failure
io.fold(
  (error) => `Failed: ${error}`,
  (value) => `Success: ${value}`,
)

// Ensure cleanup
io.ensuring(IO.sync(() => cleanup()))

// Retry on failure
io.retry(3)
io.retryWithDelay(3, 1000)
```

## IO vs Task

| Feature              | IO<R,E,A>            | Task<T>                        |
| -------------------- | -------------------- | ------------------------------ |
| Typed Errors         | Yes (E parameter)    | No                             |
| Dependency Injection | Yes (R parameter)    | No                             |
| Cancellation         | Via interrupt        | Built-in                       |
| Progress Tracking    | No                   | Yes                            |
| Best For             | Complex apps with DI | Simple async with cancellation |

## When to Use IO

- Applications with complex dependencies (web servers, CLI tools)
- When you want errors tracked in the type system
- Resource management with guaranteed cleanup
- Building composable, testable programs
- When you need dependency injection without mocking frameworks

## API Reference

See full API documentation at [functype API docs](https://jordanburke.github.io/functype/modules/io.html)
