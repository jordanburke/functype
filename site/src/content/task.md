# Task<T>

Task is going away. functype 2.0 removes it.

## Overview

Use [IO](/io) for new code. IO is lazy, keeps the error type, and cancels through an `AbortSignal`. Task stays in the 1.x line so existing code keeps working, and its API reference is in the [API docs](https://jordanburke.github.io/functype/modules/task.html).

## Moving from Task to IO

| Task (1.x)                                    | IO                                                           |
| --------------------------------------------- | ------------------------------------------------------------ |
| `Task(params).Sync(() => value)`              | `IO.sync(() => value).runSync()` → `Either<E, A>`            |
| `await Task(params).Async(async () => value)` | `await IO.tryPromise({ try, catch }).run()` → `Either<E, A>` |
| `TaskOutcome` (`Ok` / `Err`)                  | `Either` from `run()`, or `Exit` from `runExit()`            |
| `Task.cancellable(fn)` with `cancel()`        | `effect.runExit({ signal })` and `AbortController.abort()`   |
| `outcome.map` / `flatMap` / `recover`         | `effect.map` / `flatMap` / `recover`, before running         |

```typescript
import { IO } from "functype/io";

const loadUser = (id: string) =>
  IO.tryPromise({
    try: () => fetch(`/api/users/${id}`).then((r) => r.json() as Promise<User>),
    catch: (error) => new Error(`Failed to load ${id}: ${String(error)}`),
  });

// Nothing runs until here
const user = await loadUser("42").run(); // Either<Error, User>

// Cancellable
const controller = new AbortController();
const exit = loadUser("42").runExit({ signal: controller.signal });
controller.abort(); // the Exit is Interrupted
```

See [IO](/io) for retries, timeouts, typed error recovery and dependency injection.
