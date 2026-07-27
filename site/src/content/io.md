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
import { IO } from "functype/io";

// Synchronous effect
const sync = IO.sync(() => 42);

// Async effect
const async = IO.async(async () => fetchData());

// Effect that may fail
const safe = IO.tryCatch(
  () => JSON.parse(input),
  (e) => new ParseError(e),
);

// Running effects - safe by default
const either = await sync.run(); // Either<E, A> - never throws
const value = await sync.runOrThrow(); // A - throws on error
const exit = await sync.runExit(); // Exit<E, A> - full outcome (see below)

// Synchronous execution
const syncEither = sync.runSync(); // Either<E, A> - never throws
const syncValue = sync.runSyncOrThrow(); // A - throws on error
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
io.map((x) => x * 2);

// Chain effects
io.flatMap((x) => IO.succeed(x + 1));

// Handle errors
io.mapError((e) => new WrappedError(e));
io.catchAll((e) => IO.succeed(fallback));
io.recover(defaultValue);

// Provide fallback
io.orElse(fallbackIO);
```

## Combining Effects

```typescript
// Run in parallel
IO.all([io1, io2, io3]); // All must succeed
IO.race([io1, io2]); // First to complete wins
IO.any([io1, io2, io3]); // First success wins

// Zip effects
io1.zip(io2); // [A, B]
io1.zipWith(io2, (a, b) => c); // C

// Sequential
io1.andThen(io2); // Run io2 after io1
```

## Dependency Injection

IO has built-in dependency injection using Tags, Contexts, and Layers.

```typescript
import { IO, Tag, Context } from "functype/io";

// Define service interface
interface Logger {
  log(message: string): void;
}

// Create a Tag for the service
const Logger = Tag<Logger>("Logger");

// Use the service
const program = IO.service(Logger).flatMap((logger) =>
  IO.sync(() => logger.log("Hello!")),
);

// Provide implementation
const result = await program
  .provideService(Logger, { log: console.log })
  .runOrThrow();
```

### Context and Layer

```typescript
// Build context with multiple services
const context = Context.empty()
  .add(Logger, consoleLogger)
  .add(Config, appConfig);

// Provide full context
program.provideContext(context);

// Use Layer for complex dependency graphs
const AppLayer = Layer.succeed(Logger, consoleLogger).merge(
  Layer.succeed(Config, appConfig),
);

program.provideLayer(AppLayer);
```

## Do-Notation

### Generator Syntax (IO.gen)

```typescript
const program = IO.gen(function* () {
  const a = yield* IO.succeed(1);
  const b = yield* IO.succeed(2);
  const c = yield* IO.succeed(3);
  return a + b + c;
});

await program.runOrThrow(); // 6
```

### Builder Syntax (IO.Do)

```typescript
const program = IO.Do.bind("user", () => getUser("123"))
  .bind("posts", ({ user }) => getPosts(user.id))
  .let("count", ({ posts }) => posts.length)
  .map(({ user, posts, count }) => ({ user, posts, count }));
```

## Resource Management

```typescript
// Bracket pattern
IO.bracket(
  IO.sync(() => openFile(path)), // acquire
  (file) => IO.sync(() => file.close()), // release
  (file) => IO.sync(() => file.read()), // use
);

// Acquire/Release
IO.acquireRelease(
  IO.sync(() => openConnection()),
  (conn) => IO.sync(() => conn.close()),
);
```

## Outcomes: `Exit`

`.run()` returns `Either<E, A>`, which has exactly two branches — so anything that is
neither a success nor an `E` has to be crammed into the `Left`. `.runExit()` returns
`Exit<E, A>`, which names all four outcomes:

```typescript
const exit = await effect.runExit();

exit.isSuccess(); // completed with a value
exit.isFailure(); // failed with a value from the declared E channel
exit.isDie(); // produced a *defect* — a value that is not an E
exit.isInterrupted(); // was cancelled
```

A **defect** is what happens when something lands in the error channel that the declared
type says cannot be there. `IO.sync` and `IO.die` are `IO<never, never, A>` — `E` is
`never` — so a throwing thunk, a throwing `map` / `flatMap` / `mapError` callback, and
`IO.die` all produce values that are not `E`s:

```typescript
await IO.fail(new AuthError()).runExit(); // Failure — an E
await IO.sync(() => JSON.parse(bad)).runExit(); // Die — a SyntaxError, not an E
await IO.die(new Error("bug")).runExit(); // Die
```

The line is the _declared_ channel, not whether something threw. `IO.async` and the
`IO(...)` constructor are `IO<never, unknown, A>`, so their rejections are legitimate
errors and stay `Failure`.

Defects remain **recoverable** — `recover`, `recoverWith`, `fold`, and `mapError` treat a
`Die` exactly as they treat a `Failure`, and `mapError` over a defect produces a `Failure`
because your mapper returns a real `E`. `Exit.Die` records what the outcome was when
nothing recovered it; it does not change what recovery catches.

```typescript
// Both handlers are optional and fall back to the failure branch
exit.fold(
  (error) => `failed: ${error}`,
  (value) => `ok: ${value}`,
  (fiberId) => `cancelled: ${fiberId}`,
  (defect) => `bug: ${defect}`,
);

exit.match({
  Success: (value) => value,
  Failure: (error) => report(error),
  Interrupted: () => null,
  Die: (defect) => crash(defect), // omit to route defects to Failure
});
```

**Reach for `.runExit()` when the difference matters** — telling a real failure from a bug
in your own code, or a cancellation from either. `.run()` stays the right default when all
you need is success-or-not; it puts a defect in the `Left` as the raw thrown value, and an
interruption as an `InterruptedError`.

> The sync interpreter cannot make this distinction. `runSync()` returns `Either`, and it
> signals failure by throwing the raw value, so `Fail` and `Die` arrive identically.
> `Die` is observable through `runExit()` and through the `Exit` handed to a
> `bracketExit` release.

## Error Handling Patterns

```typescript
// Catch specific errors
io.catch("NotFound", () => IO.succeed(null));

// Fold over success/failure
io.fold(
  (error) => `Failed: ${error}`,
  (value) => `Success: ${value}`,
);

// Ensure cleanup
io.ensuring(IO.sync(() => cleanup()));

// Retry on failure
io.retry(3); // any error, no delay
io.retryWithDelay(3, 1000); // any error, fixed delay

// Retry only when a predicate matches (1.3.0+)
io.retryWhile({
  n: 3,
  while: (e) => e._tag === "HttpStatusError" && e.status >= 500,
  delayMs: 250,
});

// Exponential backoff with optional full jitter (1.3.0+)
// Defaults: factor=2, maxMs=30_000, jitter=true, while=()=>true
io.retryWithBackoff({
  n: 5,
  baseMs: 250,
  while: (e) => e._tag === "NetworkError",
});

// Value-driven repetition (1.6.0+): re-run until a predicate over the
// *success value* is satisfied. Bounded by `max`; on exhaustion, fails
// with RepeatExhausted (carrying the last observed value). Composes
// with retry* — errors and values are independent axes.
pollJob
  .retry(3) // error axis
  .repeatUntil((job) => job.done, { max: 20, delayMs: 500 }); // value axis

// Symmetric sibling — continue while cont is true, stop when it flips.
pollUntilReady.repeatWhile((r) => r.status === "pending", { max: 20 });

// Stateful effectful loop: thread state S through an effectful step
// until done(state). done(seed) is checked *before* the first step.
IO.iterate(
  0,
  (n) => IO.sync(() => n + 1),
  (n) => n >= 10,
); // → IO<never, RepeatExhausted<number>, number> settling on 10
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
