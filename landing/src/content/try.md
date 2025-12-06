# Try<T>

Safely execute operations that might throw exceptions.

## Overview

Try wraps operations that might throw exceptions, converting them to `Success` or `Failure` values. It bridges exception-based code with functional error handling.

## Basic Usage

```typescript
import { Try } from "functype/try"

// Wrap potentially throwing code
const result = Try(() => JSON.parse(jsonString))

// Check state
result.isSuccess() // true if no exception
result.isFailure() // true if exception thrown

// Extract values
result.orElse({}) // value or default
result.orThrow() // value or re-throw
result.toEither() // Either<Error, T>
```

## Constructors

| Method                | Description                          |
| --------------------- | ------------------------------------ |
| `Try(() => value)`    | Wrap a potentially throwing function |
| `Try.of(() => value)` | Same as constructor                  |
| `Try.success(value)`  | Create a Success directly            |
| `Try.failure(error)`  | Create a Failure directly            |

## Transformations

```typescript
// Map - transform success value
Try(() => "hello").map((s) => s.toUpperCase()) // Success("HELLO")
Try(() => {
  throw new Error()
}).map((s) => s.toUpperCase()) // Failure

// FlatMap - chain Try operations
Try(() => readFile(path))
  .flatMap((content) => Try(() => JSON.parse(content)))
  .flatMap((data) => Try(() => validate(data)))

// Recover - handle failures
Try(() => riskyOperation()).recover("default value")

// RecoverWith - handle with another Try
Try(() => primarySource()).recoverWith(() => Try(() => backupSource()))
```

## Pattern Matching

```typescript
// Using fold
const message = Try(() => fetchData()).fold(
  (error) => `Failed: ${error.message}`,
  (data) => `Got ${data.length} items`,
)

// Using match
result.match({
  Success: (value) => console.log("Got:", value),
  Failure: (error) => console.error("Error:", error),
})
```

## Error Handling Patterns

```typescript
// Chain multiple operations
const result = Try(() => readConfig())
  .flatMap((config) => Try(() => connectDB(config)))
  .flatMap((db) => Try(() => db.query("SELECT * FROM users")))
  .recover([]) // Return empty array on any failure

// Transform errors
Try(() => riskyCall()).mapFailure((err) => new CustomError(err.message))

// Filter with predicate
Try(() => parseInt(input)).filter(
  (n) => n > 0,
  () => new Error("Must be positive"),
)
```

## Do-Notation

```typescript
import { Do, $ } from "functype/do"

const result = Do(function* () {
  const config = yield* $(Try(() => readConfig()))
  const db = yield* $(Try(() => connectDB(config)))
  const users = yield* $(Try(() => db.query("SELECT * FROM users")))
  return users
}) // Try<User[]>
```

## Key Features

- **Exception Bridge**: Convert throwing code to functional style
- **Composable**: Chain operations without try-catch blocks
- **Recovery**: Elegant fallback patterns
- **Type-Safe**: Success type tracked at compile time

## When to Use Try

- Wrapping external code that throws exceptions
- JSON parsing, file operations, network calls
- When you want to chain operations that might fail
- Converting exception-based APIs to functional style

## Type Conversions

```typescript
tryValue.toOption() // None for Failure, Some for Success
tryValue.toEither() // Left(error) or Right(value)
tryValue.toPromise() // Rejected or Resolved Promise
```

## API Reference

See full API documentation at [functype API docs](https://jordanburke.github.io/functype/modules/try_.html)
