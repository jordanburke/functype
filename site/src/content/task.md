# Task<T>

Async operations with cancellation and error handling.

## Overview

Task provides structured async operations with built-in cancellation, progress tracking, and error handling. Unlike Promises, Tasks can be cancelled and provide detailed error context.

## Basic Usage

```typescript
import { Task } from "functype/task"

// Synchronous task
const syncTask = Task.sync("myTask", () => computeValue())

// Async task
const asyncTask = Task.async("fetchData", async () => {
  const response = await fetch(url)
  return response.json()
})

// Run and get result
const result = await asyncTask.run() // TaskOutcome<T>

// Check outcome
if (result.isOk()) {
  console.log(result.value)
} else {
  console.error(result.error)
}
```

## Constructors

| Method                            | Description                   |
| --------------------------------- | ----------------------------- |
| `Task.sync(name, () => T)`        | Wrap synchronous computation  |
| `Task.async(name, async () => T)` | Wrap async computation        |
| `Task.of(value)`                  | Task that succeeds with value |
| `Task.fail(error)`                | Task that fails with error    |
| `Task.fromPromise(name, promise)` | Convert Promise to Task       |

## Cancellation

```typescript
const task = Task.async("longOperation", async (signal) => {
  // Check signal periodically
  for (let i = 0; i < 1000; i++) {
    if (signal.aborted) {
      throw new Error("Cancelled")
    }
    await processChunk(i)
  }
})

// Run with timeout
const result = await task.run({ timeout: 5000 })

// Manual cancellation
const controller = new AbortController()
const promise = task.run({ signal: controller.signal })
controller.abort() // Cancel the task
```

## Progress Tracking

```typescript
const task = Task.async("upload", async (signal, progress) => {
  for (let i = 0; i <= 100; i += 10) {
    await uploadChunk(i)
    progress(i / 100) // Report progress 0-1
  }
  return "complete"
})

// Subscribe to progress
task.run({
  onProgress: (p) => console.log(`${p * 100}% complete`),
})
```

## Transformations

```typescript
// Map - transform success value
task.map((data) => data.items)

// FlatMap - chain tasks
Task.async("getUser", () => fetchUser(id)).flatMap((user) => Task.async("getPosts", () => fetchPosts(user.id)))

// Recover - handle errors
task.recover(defaultValue)
task.recoverWith((error) => Task.of(fallback))
```

## TaskOutcome

Task returns `TaskOutcome<T>` which is either `Ok<T>` or `Err<Error>`:

```typescript
const outcome = await task.run()

// Pattern matching
outcome.fold(
  (error) => `Failed: ${error.message}`,
  (value) => `Success: ${value}`,
)

// Type guards
if (outcome.isOk()) {
  console.log(outcome.value)
}

// Extract with default
const value = outcome.orElse(defaultValue)

// Convert to other types
outcome.toEither() // Either<Error, T>
outcome.toOption() // Option<T>
outcome.toTry() // Try<T>
```

## Do-Notation

```typescript
import { Do, $ } from "functype/do"

const result = Do(function* () {
  const user = yield* $(Task.async("getUser", () => fetchUser()))
  const posts = yield* $(Task.async("getPosts", () => fetchPosts(user.id)))
  const comments = yield* $(Task.async("getComments", () => fetchComments(posts)))
  return { user, posts, comments }
})
```

## Key Features

- **Named Tasks**: Debug async operations easily with named task contexts
- **Cancellation**: Cancel ongoing operations gracefully
- **Progress Tracking**: Monitor long-running operations
- **Error Context**: Rich error information including task name and stack traces

## When to Use Task

- Long-running async operations that might be cancelled (file uploads, downloads)
- Operations that need progress tracking (batch processing, migrations)
- When you need better error context than Promises provide
- Complex async workflows with multiple steps

## Type Conversions

```typescript
// TaskOutcome conversions
outcome.toEither() // Either<Error, T>
outcome.toOption() // Option<T>
outcome.toTry() // Try<T>
outcome.toPromise() // Promise<T>

// Create from other types
Task.fromEither(either)
Task.fromTry(tryValue)
```

## API Reference

See full API documentation at [functype API docs](https://jordanburke.github.io/functype/modules/task.html)
