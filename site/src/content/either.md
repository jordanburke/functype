# Either<L, R>

Express success/failure with values.

## Overview

Either represents a value that can be one of two types: `Left` (typically for errors) or `Right` (for success values). It's perfect for operations that can fail with meaningful error information.

## Basic Usage

```typescript
import { Either, Left, Right } from "functype/either"

// Creating Either values
const success = Right(42) // Right(42)
const failure = Left("error") // Left("error")

// Checking state
success.isRight() // true
failure.isLeft() // true

// Extracting values
success.orElse(0) // 42
failure.orElse(0) // 0
success.orThrow() // 42
failure.orThrow() // throws Error
```

## Constructors

| Method                | Description                    |
| --------------------- | ------------------------------ |
| `Right(value)`        | Create a Right (success) value |
| `Left(error)`         | Create a Left (error) value    |
| `Either.right(value)` | Same as Right()                |
| `Either.left(error)`  | Same as Left()                 |

## Transformations

```typescript
// Map - transform the Right value
Right(5).map((x) => x * 2) // Right(10)
Left("err").map((x) => x * 2) // Left("err") - unchanged

// MapLeft - transform the Left value
Left("err").mapLeft((e) => e.toUpperCase()) // Left("ERR")
Right(5).mapLeft((e) => e.toUpperCase()) // Right(5) - unchanged

// FlatMap - chain operations
Right(5).flatMap((x) => (x > 0 ? Right(x * 2) : Left("negative")))

// Bimap - transform both sides
either.bimap(
  (left) => `Error: ${left}`,
  (right) => right * 2,
)
```

## Pattern Matching

```typescript
// Using fold
const result = either.fold(
  (error) => `Failed: ${error}`,
  (value) => `Success: ${value}`,
)

// Using match pattern
const message = validateUser(input).fold(
  (errors) => `Validation failed: ${errors.join(", ")}`,
  (user) => `Welcome, ${user.name}!`,
)
```

## Validation Pipeline

```typescript
const validateAge = (age: number): Either<string, number> => (age >= 0 && age <= 120 ? Right(age) : Left("Invalid age"))

const validateName = (name: string): Either<string, string> => (name.length > 0 ? Right(name) : Left("Name required"))

// Chain validations
const validateUser = (data: UserInput) =>
  validateName(data.name).flatMap((name) => validateAge(data.age).map((age) => ({ name, age })))
```

## Do-Notation

```typescript
import { Do, $ } from "functype/do"

const result = Do(function* () {
  const name = yield* $(validateName(input.name))
  const age = yield* $(validateAge(input.age))
  const email = yield* $(validateEmail(input.email))
  return { name, age, email }
})

// Short-circuits on first Left
```

## Key Features

- **Error Information**: Preserve detailed error context instead of losing it with try-catch
- **Railway Oriented**: Operations automatically short-circuit on Left
- **Composable Errors**: Chain operations with mapLeft to transform errors
- **Type-Safe**: Both success and error types are known at compile time

## When to Use Either

- Operations that can fail with detailed error info (validation, parsing, API calls)
- Multiple validation steps in a pipeline
- Railway-oriented programming (happy path and error path handled separately)
- When you need typed errors at compile time

## Type Conversions

```typescript
either.toOption() // None for Left, Some(value) for Right
either.toTry() // Failure for Left, Success for Right
either.toPromise() // Rejected for Left, Resolved for Right
```

## API Reference

See full API documentation at [functype API docs](https://jordanburke.github.io/functype/modules/either.html)
