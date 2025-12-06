# Option<T>

Safe handling of nullable values.

## Overview

Option is a container that either holds a value (`Some`) or represents the absence of a value (`None`). It eliminates null pointer exceptions by making nullable values explicit in the type system.

## Basic Usage

```typescript
import { Option } from "functype/option"

// Creating Options
const some = Option(42) // Some(42)
const none = Option(null) // None
const explicit = Option.none() // None

// Checking state
some.isSome() // true
none.isNone() // true

// Extracting values
some.orElse(0) // 42
none.orElse(0) // 0
some.orThrow() // 42
none.orThrow() // throws Error
some.orNull() // 42
none.orNull() // null
```

## Constructors

| Method               | Description                           |
| -------------------- | ------------------------------------- |
| `Option(value)`      | Some if non-null/undefined, else None |
| `Option.from(value)` | Same as constructor                   |
| `Option.none()`      | Create None explicitly                |
| `Option.of(value)`   | Same as constructor                   |

## Transformations

```typescript
// Map - transform the value if present
Option(5).map((x) => x * 2) // Some(10)
Option(null).map((x) => x * 2) // None

// FlatMap - chain operations that return Options
Option(5).flatMap((x) => (x > 0 ? Option(x) : Option.none()))

// Filter - keep value only if predicate passes
Option(5).filter((x) => x > 3) // Some(5)
Option(5).filter((x) => x > 10) // None

// Tap - side effect without changing value
Option(5).tap((x) => console.log(x)) // logs 5, returns Some(5)
```

## Pattern Matching

```typescript
// Using fold
const result = Option(user).fold(
  () => "No user found",
  (u) => `Hello, ${u.name}`,
)

// Using match
const greeting = Option(name).match({
  Some: (n) => `Hello, ${n}`,
  None: () => "Hello, stranger",
})
```

## Do-Notation

```typescript
import { Do, $ } from "functype/do"

const result = Do(function* () {
  const a = yield* $(Option(1))
  const b = yield* $(Option(2))
  const c = yield* $(Option(3))
  return a + b + c
}) // Some(6)

// Short-circuits on None
const failed = Do(function* () {
  const a = yield* $(Option(1))
  const b = yield* $(Option.none<number>()) // stops here
  const c = yield* $(Option(3))
  return a + b + c
}) // None
```

## Key Features

- **Type Safety**: TypeScript enforces explicit handling of empty cases
- **Chainable Operations**: map, flatMap, filter without null checks
- **Pattern Matching**: Explicit Some/None handling with fold() and match()
- **Composable**: Works with Do-notation for complex workflows

## When to Use Option

- Function return values that might not exist (database queries, array searches)
- Optional configuration or parameters
- Chaining operations where any step might fail
- Replacing nullable types with explicit presence/absence

## Type Conversions

```typescript
option.toEither("Error message") // Left("Error message") or Right(value)
option.toList() // List([]) or List([value])
option.toTry() // Failure or Success(value)
option.toPromise() // Rejected or Resolved Promise
```

## API Reference

See full API documentation at [functype API docs](https://jordanburke.github.io/functype/modules/option.html)
