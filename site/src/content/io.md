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
  () => JSON.parse(input) as unknown,
  (e) => new Error(`Invalid JSON: ${String(e)}`),
);

// Running effects
const either = await sync.run(); // Either<E, A> - Left is a typed error; a defect or interruption rejects
const value = await sync.runOrThrow(); // A - throws on error
const exit = await sync.runExit(); // Exit<E, A> - full outcome (see below)

// Synchronous execution
const syncEither = sync.runSync(); // Either<E, A> - throws a defect or interruption
const syncValue = sync.runSyncOrThrow(); // A - throws on error
```

## Constructors

| Method                                | Description                                           |
| ------------------------------------- | ----------------------------------------------------- |
| `IO.succeed(value)`                   | Effect that succeeds with value                       |
| `IO.fail(error)`                      | Effect that fails with error                          |
| `IO.sync(() => A)`                    | Wrap synchronous computation                          |
| `IO.async(async () => A)`             | Wrap async computation                                |
| `IO.tryCatch(fn, onError)`            | Catch exceptions as typed errors                      |
| `IO.tryPromise({ try, catch })`       | Convert a Promise to IO, mapping the rejection        |
| `IO.fromPromiseEither(fn, onReject?)` | Lift `() => Promise<Either<E, A>>`, keeping `E` typed |
| `IO.unit`                             | Effect that succeeds with void                        |
| `IO.never()`                          | Effect that never completes until it is interrupted   |
| `IO.sleep(ms)`                        | Wait `ms`; an interruption ends the wait at once      |

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
io.catchAll(() => fallbackIO);
```

## Combining Effects

```typescript
// All at once by default; all must succeed, and the first failure interrupts the rest
IO.all([io1, io2, io3]);
IO.all([io1, io2, io3], { concurrency: 2 }); // Up to 2 at once
IO.all([io1, io2, io3], { concurrency: 1 }); // One after another; stops at the first failure
IO.forEach(items, (item) => save(item)); // One effect per item, in order
IO.forEach(items, (item) => save(item), { concurrency: "unbounded" });
IO.race([io1, io2]); // First to settle wins, success or failure; the others are interrupted
IO.any([io1, io2, io3]); // First success wins, trying them in order

// Zip effects
io1.zip(io2); // [A, B]
io1.zip(io2).map(([a, b]) => a + b); // combine both results

// Sequential
io1.zipRight(io2); // Run io2 after io1, keep io2's result
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
// Bracket pattern: acquire, use, release
IO.bracket(
  IO.sync(() => openFile(path)), // acquire
  (file) => IO.sync(() => file.read()), // use
  (file) => IO.sync(() => file.close()), // release
);

// Acquire/Release: same arguments, more descriptive name
IO.acquireRelease(
  IO.sync(() => openConnection()),
  (conn) => IO.sync(() => conn.query(sql)),
  (conn) => IO.sync(() => conn.close()),
);
```

## Cancellation

`interruptOn(signal)` stops a running effect when an `AbortSignal` fires, such as the one React Query
or a request handler provides. No further step starts, so a cancelled poll stops polling. The result
is `Left(InterruptedError)`.

```typescript
const poll = checkStatus.repeatUntil((s) => s.done, { max: 60, delayMs: 500 });
const outcome = await poll.interruptOn(signal).run(); // Left(InterruptedError) if aborted

// Handle it outside the cancelled section
poll
  .interruptOn(signal)
  .catchTag("InterruptedError", () => IO.succeed(lastKnown));

// Or start it with a handle
const { result, cancel } = loadReport.runCancellable();

// An async thunk receives the run's signal, so a request stops too
const load = IO.async((signal) => fetch(url, { signal }).then((r) => r.json()));
```

- Inside the cancelled section, `retry`, `recover` and `catchAll` can't swallow the cancellation.
- `bracket` / `acquireRelease` cleanup still runs, to completion.
- `IO.sleep`, `IO.never`, `.delay` and the waits in `retryWithDelay` / `repeatUntil` wake at once.
- A promise already in flight can't be stopped. The cancellation is seen at the next step, so if that
  promise was the last step, the effect succeeds with its result. Pass the same
  signal to `Http` or `IO.tryAsync` so the request itself aborts.
- `race`, `timeout` and a parallel `IO.all` interrupt the effects they no longer need, in the same
  way. They return at once; an effect that ignores its signal may still be running, and its
  `bracket` release runs when it settles. `race` returns the first effect to settle, even a
  failure; in ZIO and Effect it is the first to succeed.
- When `E` is `unknown` (effects from `IO.async`), use `InterruptedError.is(e)`.

## Outcomes: `Exit`

`.run()` returns `Either<E, A>`, which has exactly two branches: a success or an `E`. Anything
else rejects the promise. `.runExit()` returns `Exit<E, A>`, which names all four outcomes and
never rejects:

```typescript
const exit = await effect.runExit();

exit.isSuccess(); // completed with a value
exit.isFailure(); // failed with a value from the declared E channel
exit.isDie(); // produced a *defect* — a value that is not an E
exit.isInterrupted(); // was cancelled

// Each guard narrows to the field it names:
if (exit.isSuccess()) exit.value;
if (exit.isFailure()) exit.error; // an E
if (exit.isDie()) exit.defect; // unknown
if (exit.isInterrupted()) exit.fiberId;
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
in your own code, or a cancellation from either, without a `try`. `.run()` is the right default
when the `Left` is all you handle: its `Left` is always an `E`. A defect rejects the promise with
the raw thrown value, and an interruption rejects it with an `InterruptedError`.

`runSync()` follows the same rule: a typed failure is a `Left`, and a defect or an interruption
is thrown. An effect it can't run synchronously (`IO.async`, `timeout`, `race`, `sleep`) is a
defect, so it throws too.

## Error Handling Patterns

```typescript
// Catch specific errors by their _tag
taggedIO.catchTag("NotFound", () => IO.succeed(null));

// Fold over success/failure
io.fold(
  (error) => `Failed: ${error}`,
  (value) => `Success: ${value}`,
);

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

## Moving from Task

functype 2.0 deleted `Task`. IO does what it did, except progress reporting and task names, which nothing used.

| Task (1.x)                                     | IO                                                                           |
| ---------------------------------------------- | ---------------------------------------------------------------------------- |
| `Task(params).Sync(f, onError)`                | `IO.tryCatch(f, onError).runSync()` → `Either<E, A>`                         |
| `await Task(params).Async(f, onError)`         | `await IO.tryPromise({ try: f, catch: onError }).run()` → `Either<E, A>`     |
| `Task.ok(v)` / `Task.err(e)`, `Ok` / `Err`     | `IO.succeed(v)` / `IO.fail(e)`, or `Right` / `Left`                          |
| `TaskOutcome`                                  | `Either` from `run()`, or `Exit` from `runExit()`                            |
| `Task.fromEither` / `Task.fromTry`             | `IO.fromEither` / `IO.fromTry`                                               |
| `Task.fromPromise(fn)`                         | `(...args) => IO.tryPromise({ try: () => fn(...args), catch })`              |
| `Task.toPromise(outcome)`                      | `effect.runOrThrow()`                                                        |
| `Task.race(tasks, ms)`                         | `IO.race(effects).timeout(ms)`                                               |
| `Task.cancellable(fn)`, `CancellationToken`    | `effect.runCancellable()`, `runExit({ signal })` or `interruptOn(signal)`    |
| `Task.getErrorChain` / `Task.formatErrorChain` | `getErrorChain` / `formatErrorChain`, exported from `functype`               |
| `Task.withProgress(fn, onProgress)`            | none: call your own callback inside the effect                               |
| Task JSON (`"@functype": "Task"`)              | none: `Serialization.deserialize` returns a `Failure` for the unknown marker |

```typescript
const loadUser = (id: string) =>
  IO.tryPromise({
    // pass the run's signal to fetch, so cancelling stops the request itself
    try: (signal) =>
      fetch(`/api/users/${id}`, { signal }).then(
        (r) => r.json() as Promise<{ name: string }>,
      ),
    catch: (error) => new Error(`Failed to load ${id}: ${String(error)}`),
  });

// Nothing runs until here
const user = await loadUser("42").run(); // Either<Error, { name: string }>

// Cancellable: a handle, or your own AbortController
const { result, cancel } = loadUser("42").runCancellable();
const controller = new AbortController();
const exit = loadUser("42").runExit({ signal: controller.signal });
controller.abort(); // the Exit is Interrupted
```

## When to Use IO

- Applications with complex dependencies (web servers, CLI tools)
- When you want errors tracked in the type system
- Resource management with guaranteed cleanup
- Building composable, testable programs
- When you need dependency injection without mocking frameworks

## API Reference

See full API documentation at functype API docs: [IO's methods](https://functype.org/api-docs/interfaces/IO.html) and [its constructors](https://functype.org/api-docs/variables/IO.html) (`IO.sync`, `IO.succeed`, `IO.tryPromise` and the rest)
