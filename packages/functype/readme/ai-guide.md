# AI Guide to Functype

This document provides a concise reference for AI models to understand the patterns and usage of the Functype library.

## Core Types

### Option<T>

```typescript
// Create: Option(value) returns Some(value) or None
const some = Option(42) // Some(42)
const none = Option(null) // None

// Access: .get() or .orElse(default)
some.get() // 42
none.orElse("default") // "default"

// Transform: .map(), .flatMap(), .filter()
some.map((x) => x * 2) // Some(84)
some.flatMap((x) => Option(x.toString())) // Some("42")
some.filter((x) => x > 50) // None

// Pattern match: .fold() or .match()
some.fold(
  () => "empty",
  (val) => `value: ${val}`,
) // "value: 42"
```

### Either<L, R>

```typescript
// Create: Right(value) or Left(error)
const right = Right<string, number>(42)
const left = Left<string, number>("error")

// From functions: Either.tryCatch()
const result = Either.tryCatch(
  () => JSON.parse('{"key":"value"}'),
  (err) => `Parse error: ${err}`,
) // Right({key: "value"})

// Transform: .map(), .mapLeft(), .flatMap()
right.map((x) => x * 2) // Right(84)
left.mapLeft((e) => e.toUpperCase()) // Left("ERROR")
right.flatMap((x) => Right(x.toString())) // Right("42")

// Pattern match: .fold() or .match()
right.fold(
  (err) => `Error: ${err}`,
  (val) => `Success: ${val}`,
) // "Success: 42"
```

### Try<T>

```typescript
// Create: Try(() => potentially_throwing_function())
const success = Try(() => 42)
const failure = Try(() => {
  throw new Error("Failed")
})

// Transform: .map(), .flatMap(), .recover()
success.map((x) => x * 2) // Success(84)
failure.recover("default") // Success("default")
success.flatMap((x) => Try(() => x.toString())) // Success("42")

// Pattern match: .fold() or .match()
success.fold(
  (err) => `Error: ${err.message}`,
  (val) => `Success: ${val}`,
) // "Success: 42"
```

### List<T>

```typescript
// Create: List([...elements])
const list = List([1, 2, 3, 4, 5])

// Access: .head(), .tail(), .at(index)
list.head() // Some(1)
list.tail() // List([2, 3, 4, 5])

// Transform: .map(), .flatMap(), .filter()
list.map((x) => x * 2) // List([2, 4, 6, 8, 10])
list.filter((x) => x % 2 === 0) // List([2, 4])
list.flatMap((x) => List([x, x])) // List([1, 1, 2, 2, 3, 3, 4, 4, 5, 5])

// Reduce: .foldLeft(), .foldRight()
list.foldLeft(0)((acc, x) => acc + x) // 15
```

### Map<K, V>

```typescript
// Create: Map({key: value})
const map = Map({ a: 1, b: 2, c: 3 })

// Access: .get(key), .orElse(key, default)
map.get("a") // Some(1)
map.orElse("d", 0) // 0

// Transform: .map(), .filter()
map.map((v) => v * 2) // Map({a: 2, b: 4, c: 6})
map.filter((v) => v > 1) // Map({b: 2, c: 3})
```

### Set<T>

```typescript
// Create: Set([...elements])
const set = Set([1, 2, 3, 4, 5])

// Operations: .add(), .remove(), .has()
set.add(6) // Set([1, 2, 3, 4, 5, 6])
set.remove(3) // Set([1, 2, 4, 5])
set.has(2) // true

// Set operations: .union(), .intersect(), .difference()
const set2 = Set([4, 5, 6, 7])
set.union(set2) // Set([1, 2, 3, 4, 5, 6, 7])
set.intersect(set2) // Set([4, 5])
```

### Task

```typescript
// Create: Task().Sync() or Task().Async()
const syncTask = Task().Sync(
  () => 42,
  (err) => new Error(`Failed: ${err}`),
)

const asyncTask = Task().Async(
  async () => await fetchData(),
  async (err) => new Error(`Fetch failed: ${err}`),
)

// From promise
const fetchUser = Task({ name: "UserFetch" }).fromPromise(fetchUserAPI)

// Usage
syncTask.then((value) => console.log(value)).catch((error) => console.error(error))
```

### Tuple

```typescript
// Create: Tuple(...values)
const pair = Tuple(42, "hello")

// Access: .first(), .second(), etc.
pair.first() // 42
pair.second() // "hello"

// Transform: .map(), .mapFirst(), .mapSecond()
pair.mapFirst((x) => x * 2) // Tuple(84, "hello")
```

## Common Patterns

### Type Safety

```typescript
// Branded types
type UserId = Brand<string, "UserId">
const UserId = (id: string): UserId => {
  if (!/^U\d{6}$/.test(id)) throw new Error("Invalid ID format")
  return id as UserId
}

// Type-safe functions
function getUserById(id: UserId): User {
  /* ... */
}
getUserById(UserId("U123456")) // Works
getUserById("U123456") // Type error
```

### Error Handling

```typescript
// Option for nullable values
const maybeUser = Option(findUser(id))
maybeUser.fold(
  () => console.log("User not found"),
  (user) => console.log("User:", user.name),
)

// Either for errors with context
const validationResult = validateForm(formData)
validationResult.fold(
  (errors) => handleErrors(errors),
  (data) => processForm(data),
)

// Try for exception safety
const parseResult = Try(() => JSON.parse(input))
parseResult.fold(
  (err) => console.error("Parse error:", err.message),
  (data) => console.log("Data:", data),
)
```

### Chaining Operations

```typescript
// Option chain
const userCity = Option(user)
  .flatMap((u) => Option(u.address))
  .flatMap((a) => Option(a.city))
  .orElse("Unknown")

// Either chain
parseInput(input)
  .flatMap(validateData)
  .flatMap(transformData)
  .fold(
    (err) => handleError(err),
    (result) => displayResult(result),
  )

// List processing
List([1, 2, 3, 4, 5])
  .filter((n) => n % 2 === 0)
  .map((n) => n * n)
  .foldLeft(0)((acc, n) => acc + n) // 20 (4 + 16)
```

### Pattern Matching

```typescript
// Using match method
result.match({
  Some: (value) => `Found: ${value}`,
  None: () => "Not found",
})

// Using fold method
either.fold(
  (left) => `Error: ${left}`,
  (right) => `Success: ${right}`,
)

// Using MatchableUtils
const isPositive = MatchableUtils.when(
  (n: number) => n > 0,
  (n) => `Positive: ${n}`,
)

const isNegative = MatchableUtils.when(
  (n: number) => n < 0,
  (n) => `Negative: ${n}`,
)

const defaultCase = MatchableUtils.default((n: number) => `Zero: ${n}`)

// Usage
isPositive(42) ?? isNegative(42) ?? defaultCase(42) // "Positive: 42"
```

### Functional Composition

```typescript
// Using pipe for sequential operations
import { pipe } from "functype"

const result = pipe(
  Option(input),
  (opt) => opt.map((s) => s.trim()),
  (opt) => opt.filter((s) => s.length > 0),
  (opt) => opt.map((s) => parseInt(s, 10)),
  (opt) => opt.filter((n) => !isNaN(n)),
  (opt) => opt.orElse(0),
)

// Converting between types
import { FoldableUtils } from "functype"

const optionAsList = FoldableUtils.toList(option)
const listAsOption = FoldableUtils.toOption(list)
const tryAsEither = FoldableUtils.toEither(tryVal, "Default error")
```

## Key Principles

1. **Immutability**: All data structures return new instances when modified
2. **Type Safety**: Strong TypeScript typing throughout the library
3. **Null Safety**: No null/undefined values within containers (Option, Either, etc.)
4. **Error Handling**: Explicit error handling using functional patterns
5. **Pattern Matching**: Consistent APIs for inspecting and handling variants
6. **Composability**: Methods designed for chaining and composition
7. **Consistency**: Similar patterns across different data structures

## Common Imports

```typescript
// Full package import (not recommended for production)
import { Option, Either, Try, List } from "functype"

// Optimized imports for tree-shaking
import { Option } from "functype/option"
import { Either } from "functype/either"
import { List } from "functype/list"

// Individual constructor imports
import { some, none } from "functype/option"
import { right, left } from "functype/either"
```

## Type Class Hierarchy

- **Functor**: `map` - Transform values while preserving structure
  - **Applicative**: Apply functions inside containers
    - **Monad**: `flatMap` - Chain operations that return containerized values
      - **Foldable**: `fold`, `foldLeft`, `foldRight` - Collapse structure
        - **Traversable**: Convert/sequence containers

## Anti-Patterns to Avoid

1. ❌ **Unnecessary Unwrapping**:

   ```typescript
   // Bad
   if (option.isDefined()) {
     doSomething(option.get())
   } else {
     doSomethingElse()
   }

   // Good
   option.fold(
     () => doSomethingElse(),
     (value) => doSomething(value),
   )
   ```

2. ❌ **Throwing from Inside Containers**:

   ```typescript
   // Bad
   option.map((value) => {
     if (!isValid(value)) throw new Error("Invalid")
     return transform(value)
   })

   // Good
   option.flatMap((value) => (isValid(value) ? Option(transform(value)) : Option(null)))
   ```

3. ❌ **Not Using Composition**:

   ```typescript
   // Bad
   const a = option.map((x) => x + 1)
   const b = a.filter((x) => x > 10)
   const c = b.orElse(0)

   // Good
   const result = option
     .map((x) => x + 1)
     .filter((x) => x > 10)
     .orElse(0)
   ```

4. ❌ **Mixing Imperative and Functional Styles**:

   ```typescript
   // Bad
   let result = 0
   option.fold(
     () => {
       result = 42
     },
     (value) => {
       result = value
     },
   )

   // Good
   const result = option.orElse(42)
   ```
