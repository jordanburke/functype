# Functype

![NPM Version](https://img.shields.io/npm/v/functype?link=https%3A%2F%2Fwww.npmjs.com%2Fpackage%2Ffunctype)
[![Node.js Build](https://github.com/jordanburke/functype/actions/workflows/pnpm-build.yml/badge.svg)](https://github.com/jordanburke/functype/actions/workflows/pnpm-build.yml)

## A Functional Programming Library for TypeScript

Functype is a lightweight functional programming library for TypeScript, drawing inspiration from functional programming paradigms, the Scala Standard Library, and ZIO. It provides a comprehensive set of utilities and abstractions designed to facilitate functional programming within TypeScript applications.

[API Documentation](https://jordanburke.github.io/functype/)

## Core Principles

- **Immutability**: All data structures are immutable, promoting predictable and side-effect-free code
- **Type Safety**: Leverages TypeScript's type system to ensure compile-time safety
- **Composability**: Provides abstractions for building complex programs from simple components
- **Functional Paradigms**: Embraces concepts like monads, functors, and type classes
- **Unified Interface**: All data structures implement a common hierarchy of interfaces for consistency

## Key Features

- **Option Type**: Handle nullable values with `Some` and `None` types
- **Either Type**: Express computation results with potential failures using `Left` and `Right`
- **List, Set, Map**: Immutable collection types with functional operators
- **Try Type**: Safely execute operations that might throw exceptions
- **Task**: Handle synchronous and asynchronous operations with error handling
- **Lazy**: Deferred computation with memoization
- **Tuple**: Type-safe fixed-length arrays
- **Typeable**: Runtime type identification with compile-time safety
- **Branded Types**: Nominal typing in TypeScript's structural type system
- **FPromise**: Enhanced Promise functionality with built-in error handling
- **Error Formatting**: Utilities for improved error visualization and logging
- **Unified Type Classes**: Consistent interfaces across all data structures

## Installation

```bash
# NPM
npm install functype

# Yarn
yarn add functype

# PNPM
pnpm add functype

# Bun
bun add functype
```

### Bundle Size Optimization

Functype is optimized for tree-shaking and offers multiple import strategies to minimize bundle size:

```typescript
// Selective module imports (recommended for production)
import { Option } from "functype/option"
import { Either } from "functype/either"

// Direct constructor imports (smallest bundle)
import { some, none } from "functype/option"
```

For detailed optimization strategies, see the [Bundle Optimization Guide](docs/BUNDLE_OPTIMIZATION.md).

## Usage Examples

### Option

```typescript
import { Option, Some, None } from "functype"

// Create options
const value = Option("hello") // Some("hello")
const empty = Option(null) // None
const explicit = Some(42) // Some(42)

// Transform values
const length = value.map((s) => s.length) // Some(5)
const nothing = empty.map((s) => s.length) // None

// Handle default values
const result = value.getOrElse("world") // "hello"
const fallback = empty.getOrElse("world") // "world"

// Conditionally filter
const filtered = value.filter((s) => s.length > 10) // None
```

### Either

```typescript
import { Either, Right, Left } from "functype"

// Success case
const success = Right<string, number>(42)
// Error case
const failure = Left<string, number>("error")

// Transform values (map only applies to Right)
const doubled = success.map((x) => x * 2) // Right(84)
const stillError = failure.map((x) => x * 2) // Left("error")

// Handle errors
const value = success.getOrElse(0) // 42
const fallback = failure.getOrElse(0) // 0

// Pattern matching with fold
const result = success.fold(
  (err) => `Error: ${err}`,
  (val) => `Success: ${val}`,
) // "Success: 42"
```

### List

```typescript
import { List } from "functype"

const numbers = List([1, 2, 3, 4])

// Transform
const doubled = numbers.map((x) => x * 2) // List([2, 4, 6, 8])

// Filter
const evens = numbers.filter((x) => x % 2 === 0) // List([2, 4])

// Reduce
const sum = numbers.foldLeft(0)((acc, x) => acc + x) // 10

// Add/remove elements (immutably)
const withFive = numbers.add(5) // List([1, 2, 3, 4, 5])
const without3 = numbers.remove(3) // List([1, 2, 4])

// Universal container operations
const hasEven = numbers.exists((x) => x % 2 === 0) // true
const firstEven = numbers.find((x) => x % 2 === 0) // Some(2)
const evenCount = numbers.count((x) => x % 2 === 0) // 2
```

### Try

```typescript
import { Try } from "functype"

// Safely execute code that might throw
const result = Try(() => {
  // Potentially throwing operation
  return JSON.parse('{"name": "John"}')
})

// Handle success/failure
if (result.isSuccess()) {
  console.log("Result:", result.get())
} else {
  console.error("Error:", result.error)
}

// Transform with map (only applies on Success)
const name = result.map((obj) => obj.name)

// Convert to Either
const either = result.toEither()
```

### Lazy

```typescript
import { Lazy } from "functype"

// Create lazy computations
const expensive = Lazy(() => {
  console.log("Computing...")
  return Math.random() * 1000
})

// Value is computed on first access and memoized
const value1 = expensive.get() // Logs "Computing...", returns number
const value2 = expensive.get() // Returns same number, no log

// Transform lazy values
const doubled = expensive.map((x) => x * 2)
const formatted = doubled.map((x) => `Value: ${x}`)

// Chain computations
const result = Lazy(() => 10)
  .flatMap((x) => Lazy(() => x + 5))
  .map((x) => x * 2)
  .get() // 30
```

### Task

Task v2 provides structured error handling with the **Ok/Err pattern**, returning `TaskOutcome<T>` for all operations:

```typescript
import { Task, Ok, Err, type TaskOutcome } from "functype"

// Task v2: All operations return TaskOutcome<T>
const syncResult = Task().Sync(() => "success")
// Returns: TaskSuccess<string> (extends TaskOutcome<string>)

const asyncResult = await Task().Async(async () => "value")
// Returns: TaskOutcome<string>

// Explicit Ok/Err returns for precise control
const explicitResult = await Task().Async(async (): Promise<TaskOutcome<string>> => {
  if (Math.random() > 0.5) {
    return Ok("success") // Explicit success
  }
  return Err<string>("failed") // Explicit failure
})

// Auto-wrapping: raw values become Ok, thrown errors become Err
const autoWrapped = await Task().Async(async () => {
  if (condition) {
    return "raw value" // Auto-wrapped as Ok("raw value")
  }
  throw new Error("failed") // Auto-wrapped as Err(error)
})

// Error recovery: error handlers can return Ok
const recovered = await Task().Async(
  async () => {
    throw new Error("initial error")
  },
  async (error) => Ok("recovered from error"), // Recovery!
)

// Working with results
if (asyncResult.isSuccess()) {
  console.log(asyncResult.value) // Access the success value
} else {
  console.error(asyncResult.error) // Access the error (Throwable)
}

// Chaining with TaskOutcome
const chainedResult = await Task().Async(async () => {
  const firstResult = await Task().Async(async () => "first")
  if (firstResult.isFailure()) {
    return firstResult // Propagate failure
  }

  const secondResult = await Task().Async(async () => "second")
  if (secondResult.isFailure()) {
    return secondResult
  }

  return Ok(`${firstResult.value} + ${secondResult.value}`)
})

// Converting promise-based functions to Task
const fetchUserAPI = (userId: string): Promise<User> => fetch(`/api/users/${userId}`).then((r) => r.json())

const fetchUser = Task.fromPromise(fetchUserAPI)
// Returns: (userId: string) => FPromise<TaskOutcome<User>>

const userResult = await fetchUser("user123")
if (userResult.isSuccess()) {
  console.log(userResult.value) // User object
}

// Convert TaskOutcome back to Promise (for interop)
const promise = Task.toPromise(asyncResult)
// Success → resolves with value
// Failure → rejects with error
```

### Branded Types

```typescript
import { Brand, ValidatedBrand } from "functype/branded"

// Create branded types for stronger type safety
type UserId = Brand<"UserId", string>
type Email = Brand<"Email", string>

// Simple branding - branded values ARE primitives!
const userId = Brand("UserId", "U123456")
console.log(userId) // "U123456" - it IS a string
console.log(typeof userId) // "string"
console.log(userId.toUpperCase()) // "U123456" - string methods work!

// Runtime-validated branding for safer input handling
const EmailValidator = ValidatedBrand("Email", (s: string) => /^[^@]+@[^@]+\.[^@]+$/.test(s))
const UserIdValidator = ValidatedBrand("UserId", (s: string) => /^U\d{6}$/.test(s))

// Safe creation with Option/Either return types
const email = EmailValidator.of("user@example.com") // Some(Brand<"Email", string>)
const invalidEmail = EmailValidator.of("invalid") // None

const userResult = UserIdValidator.from("U123456") // Right(Brand<"UserId", string>)
const userError = UserIdValidator.from("invalid") // Left("Invalid UserId: validation failed")

// Type safety in action
function getUserByEmail(email: Email): User {
  /* ... */
}

// These calls are type-safe
const userId = UserId("U123456")
const email = Email("user@example.com")
const user = getUserByEmail(email) // Works

// These would be type errors
getUserByEmail("invalid") // Type error: Argument of type 'string' is not assignable to parameter of type 'Email'
getUserByEmail(userId) // Type error: Argument of type 'UserId' is not assignable to parameter of type 'Email'
```

## Conditional Programming

Functype provides `Cond` and `Match` for functional conditional logic without early returns:

### Cond

```typescript
import { Cond } from "functype"

// Replace if-else chains with Cond
const grade = Cond<number, string>()
  .case((score) => score >= 90, "A")
  .case((score) => score >= 80, "B")
  .case((score) => score >= 70, "C")
  .case((score) => score >= 60, "D")
  .default("F")

console.log(grade(85)) // "B"
console.log(grade(55)) // "F"

// With transformation
const discount = Cond<number, number>()
  .case(
    (qty) => qty >= 100,
    (qty) => qty * 0.2, // 20% off for 100+
  )
  .case(
    (qty) => qty >= 50,
    (qty) => qty * 0.1, // 10% off for 50+
  )
  .case(
    (qty) => qty >= 10,
    (qty) => qty * 0.05, // 5% off for 10+
  )
  .default(0)

console.log(discount(150)) // 30 (20% of 150)
```

### Match

```typescript
import { Match } from "functype"

// Pattern matching with Match
type Status = "pending" | "approved" | "rejected" | "cancelled"

const statusMessage = Match<Status, string>()
  .case("pending", "Your request is being processed")
  .case("approved", "Your request has been approved!")
  .case("rejected", "Sorry, your request was rejected")
  .case("cancelled", "Your request was cancelled")
  .exhaustive()

console.log(statusMessage("approved")) // "Your request has been approved!"

// Match with predicates
const numberType = Match<number, string>()
  .case(0, "zero")
  .case((n) => n > 0, "positive")
  .case((n) => n < 0, "negative")
  .exhaustive()

console.log(numberType(42)) // "positive"
console.log(numberType(-5)) // "negative"
```

### Advanced Pattern Matching

Match supports exhaustive matching, nested patterns, and guards:

```typescript
import { Match } from "functype"

// Exhaustive matching with compile-time checking
type Status = "idle" | "loading" | "success" | "error"
const result = Match<Status, string>("success")
  .case("idle", "Waiting...")
  .case("loading", "Loading...")
  .case("success", "Done!")
  .case("error", "Failed!")
  .exhaustive() // Compile error if any case is missing

// Nested pattern matching
type User = {
  name: string
  age: number
  role: "admin" | "user"
  preferences?: { theme: "light" | "dark" }
}

const message = Match<User, string>(user)
  .case({ role: "admin", age: (n) => n >= 18, preferences: { theme: "dark" } }, "Adult admin with dark mode")
  .case({ role: "user" }, (u) => `Regular user: ${u.name}`)
  .when((u) => u.age < 18, "Minor user - restricted access")
  .default("Unknown user type")

// Reusable pattern matchers
const classifier = Match.builder<Animal, string>()
  .when((a) => a.canFly, "Flying creature")
  .case({ legs: 0 }, "Legless")
  .case({ legs: 2 }, "Biped")
  .case({ legs: 4 }, "Quadruped")
  .default("Other")
  .build()
```

## Fold

Functype includes a powerful `fold` operation for pattern matching and extracting values:

```typescript
import { Option, Either, Try, List } from "functype"

// Option fold
const opt = Option(5)
const optResult = opt.fold(
  () => "None",
  (value) => `Some(${value})`,
) // "Some(5)"

// Either fold
const either = Right<string, number>(42)
const eitherResult = either.fold(
  (left) => `Left(${left})`,
  (right) => `Right(${right})`,
) // "Right(42)"

// Try fold
const tryValue = Try(() => 10)
const tryResult = tryValue.fold(
  (error) => `Error: ${error.message}`,
  (value) => `Success: ${value}`,
) // "Success: 10"

// List fold
const list = List([1, 2, 3])
const listResult = list.foldLeft(0)((acc, num) => acc + num) // 6
```

## Foldable

Functype includes a `Foldable` type class that all data structures implement:

```typescript
import { FoldableUtils, Option, List, Try } from "functype"

// All data structures implement the Foldable interface
const option = Option(5)
const list = List([1, 2, 3, 4, 5])
const tryVal = Try(() => 10)

// Use fold to pattern-match on data structures
option.fold(
  () => console.log("Empty option"),
  (value) => console.log(`Option value: ${value}`),
)

// Use foldLeft for left-associative operations
const sum = list.foldLeft(0)((acc, value) => acc + value) // 15

// Use foldRight for right-associative operations
const product = list.foldRight(1)((value, acc) => value * acc) // 120

// Use FoldableUtils to work with any Foldable
const isEmpty = FoldableUtils.isEmpty(option) // false
const size = FoldableUtils.size(list) // 5
const convertedToList = FoldableUtils.toList(option) // List([5])
const convertedToEither = FoldableUtils.toEither(tryVal, "Error") // Right(10)
```

## Matchable

Functype includes a `Matchable` type class for enhanced pattern matching:

```typescript
import { Option, Either, Try, List, MatchableUtils } from "functype"

// Pattern matching on Option
const opt = Option(42)
const optResult = opt.match({
  Some: (value) => `Found: ${value}`,
  None: () => "Not found",
}) // "Found: 42"

// Pattern matching on Either
const either = Either.fromNullable(null, "Missing value")
const eitherResult = either.match({
  Left: (error) => `Error: ${error}`,
  Right: (value) => `Value: ${value}`,
}) // "Error: Missing value"

// Pattern matching on Try
const tryVal = Try(() => JSON.parse('{"name":"John"}'))
const tryResult = tryVal.match({
  Success: (data) => `Name: ${data.name}`,
  Failure: (error) => `Parse error: ${error.message}`,
}) // "Name: John"

// Pattern matching on List
const list = List([1, 2, 3])
const listResult = list.match({
  NonEmpty: (values) => `Values: ${values.join(", ")}`,
  Empty: () => "No values",
}) // "Values: 1, 2, 3"

// Using MatchableUtils for advanced pattern matching
const isPositive = MatchableUtils.when(
  (n: number) => n > 0,
  (n) => `Positive: ${n}`,
)

const defaultCase = MatchableUtils.default((n: number) => `Default: ${n}`)

// Using pattern guards in custom matching logic
const num = 42
const result = isPositive(num) ?? defaultCase(num) // "Positive: 42"
```

## Interface Hierarchy

All data structures in Functype implement a unified hierarchy of interfaces, providing consistent behavior across the library:

### Type Classes

Functype leverages type classes to provide common operations:

- **Functor**: Supports `map` operation for transforming wrapped values
- **Applicative**: Extends Functor with `ap` for applying wrapped functions
- **Monad**: Extends Applicative with `flatMap` for chaining operations
- **AsyncMonad**: Extends Monad with `flatMapAsync` for async operations
- **ContainerOps**: Universal operations for all containers (single-value and collections)
- **CollectionOps**: Operations specific to collections like List and Set

### Unified Interfaces

All data structures implement the `Functype` hierarchy:

```typescript
// Base interface for all data structures
interface FunctypeBase<A, Tag>
  extends AsyncMonad<A>,
    Traversable<A>,
    Serializable<A>,
    Foldable<A>,
    Typeable<Tag>,
    ContainerOps<A> {
  readonly _tag: Tag
}

// For single-value containers (Option, Either, Try)
interface Functype<A, Tag> extends FunctypeBase<A, Tag>, Extractable<A>, Pipe<A>, Matchable<A, Tag> {
  toValue(): { _tag: Tag; value: A }
}

// For collections (List, Set, Map)
interface FunctypeCollection<A, Tag>
  extends FunctypeBase<A, Tag>,
    Iterable<A>,
    Pipe<A[]>,
    Collection<A>,
    CollectionOps<A, FunctypeCollection<A, Tag>> {
  toValue(): { _tag: Tag; value: A[] }
  // Collections work with Iterable instead of Monad
  flatMap<B>(f: (value: A) => Iterable<B>): FunctypeCollection<B, Tag>
}
```

### Container Operations

All containers (Option, Either, Try, List, Set) support these universal operations:

```typescript
import { Option, List } from "functype"

const opt = Option(42)
const list = List([1, 2, 3, 4, 5])

// Universal operations work on both single-value and collections
opt.count((x) => x > 40) // 1
list.count((x) => x > 3) // 2

opt.find((x) => x > 40) // Some(42)
list.find((x) => x > 3) // Some(4)

opt.exists((x) => x === 42) // true
list.exists((x) => x === 3) // true

opt.forEach(console.log) // Logs: 42
list.forEach(console.log) // Logs: 1, 2, 3, 4, 5
```

## Type Safety

Functype leverages TypeScript's advanced type system to provide compile-time safety for functional patterns, ensuring that your code is both robust and maintainable.

```typescript
// Type inference works seamlessly
const option = Option(42)
// Inferred as number
const mappedValue = option.map((x) => x.toString())
// Inferred as string
```

## Error Formatting

Functype provides utilities for improved error visualization and logging:

```typescript
import { formatError, createErrorSerializer } from "functype/error"

// Create a nested task error
const innerTask = Task({ name: "DbQuery" }).Sync(() => {
  throw new Error("Database connection failed")
})

const outerTask = Task({ name: "UserFetch" }).Sync(() => {
  return innerTask.value
})

// Format the error for console display
console.error(
  formatError(outerTask.value as Error, {
    includeTasks: true,
    includeStackTrace: true,
    colors: true,
  }),
)

// Create a serializer for structured logging libraries like Pino
const errorSerializer = createErrorSerializer()

// Use with Pino
const logger = pino({
  serializers: { err: errorSerializer },
})

// Log the error with full context
logger.error(
  {
    err: outerTask.value,
    requestId: "req-123",
  },
  "Failed to fetch user data",
)
```

For more details, see the [Error Formatting Guide](docs/error-formatting.md).

## Roadmap / TODO

### High Priority

- [x] Complete LazyList Implementation
  - ✓ Add Foldable interface (fold, foldLeft, foldRight)
  - ✓ Add Pipe interface for composition
  - ✓ Add Serializable for persistence
  - ✓ Add Typeable support
- [ ] Implement NonEmptyList<A>
  - List guaranteed to have at least one element
  - Prevents empty list errors at compile time
  - Full standard interface implementation
  - Methods like `head` return `A` instead of `Option<A>`

### Medium Priority

- [ ] Implement ValidatedNel<E, A> for validation with error accumulation
  - Unlike Either, collects multiple errors
  - Uses NonEmptyList for error collection
  - Applicative instance combines errors
- [x] Enhance Pattern Matching
  - ✓ Add exhaustiveness checking at compile time
  - ✓ Support nested pattern matching
  - ✓ Add guard clauses (when conditions)
  - ✓ Support destructuring patterns
  - ✓ Consolidated into unified Match implementation
- [ ] Implement IO<A> monad for functional side effects
  - Lazy execution of effects
  - Composable IO operations
  - Integration with Task for async IO

### Low Priority

- [x] Complete Tuple Implementation
  - ✓ Add Foldable for tuple operations
  - ✓ Add Pipe interface for composition
  - ✓ Add Serializable for persistence
  - ✓ Add Companion pattern with utility methods
  - ✓ Added specialized pair() and triple() constructors
- [ ] Implement Lens<S, A> for immutable updates
  - Composable property access
  - Type-safe nested updates
  - Works with all functype data structures
- [ ] Add Reader/State monads for dependency injection and state management

### Completed Functionality

- [x] Add lazy evaluation structures (LazyList implemented, needs interface completion)
- [x] Add a proper Foldable type class interface
- [x] Implement Matchable type class for pattern matching
- [x] Implement Applicative and other functional type classes (for most types)

### Performance Optimizations

- [ ] Add memoization utilities
- [ ] Improve recursive operations for large collections
- [ ] Implement immutable data structures with structural sharing
- [ ] Add performance benchmarks
- [x] Optimize TreeShaking with sideEffects flag in package.json
- [x] Support selective module imports for smaller bundles
- [x] Add bundle size monitoring to CI/CD

### API Consistency

- [ ] Ensure all modules follow the Scala-inspired pattern:
  - Constructor functions that return objects with methods
  - Object methods for common operations
  - Companion functions for additional utilities
- [x] Align Task API with other monadic structures
- [ ] Standardize import patterns (@ imports vs relative paths)
- [x] Implement consistent error handling strategy for async operations

### Testing and Documentation

- [ ] Add observable test coverage metrics
- [x] Implement property-based testing
- [ ] Expand error handling tests
- [ ] Add interoperability tests with other libraries

### TypeScript Improvements

- [x] Enable stricter TypeScript settings (noImplicitAny: true)
- [x] Add noUncheckedIndexedAccess for safer array indexing
- [ ] Improve support for higher-kinded types:
  - Current type parameters work well for first-order types
  - Expand to support type constructors as parameters (F<A> => F<B>)
- [x] Add branded/nominal types for stronger type safety
- [ ] Implement more type-level utilities (conditional types, template literals)
- [ ] Leverage newer TypeScript features (const type parameters, tuple manipulation)

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

MIT License

Copyright (c) 2025 Jordan Burke

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
