# Functype Examples

This document provides comprehensive examples of using the Functype library. These examples are designed to help you understand the core concepts and practical applications of functional programming with TypeScript.

## Table of Contents

- [Option](#option)
- [Either](#either)
- [Try](#try)
- [List](#list)
- [Map](#map)
- [Set](#set)
- [FPromise](#fpromise)
- [Task](#task)
- [Branded Types](#branded-types)
- [Tuple](#tuple)
- [Foldable](#foldable)
- [Matchable](#matchable)
- [Common Patterns](#common-patterns)
- [Error Handling](#error-handling)
- [Real-World Examples](#real-world-examples)

## Option

The `Option` type represents a value that may or may not exist, similar to Maybe in other functional languages.

### Basic Usage

```typescript
import { Option, Some, None } from "functype"

// Creating Options
const withValue = Option(42) // Some(42)
const withoutValue = Option(null) // None
const withoutValue2 = Option(undefined) // None
const explicit1 = Some(42) // Some(42)
const explicit2 = None() // None

// Check if value exists
console.log(withValue.isDefined()) // true
console.log(withoutValue.isDefined()) // false
console.log(withValue.isEmpty()) // false
console.log(withoutValue.isEmpty()) // true

// Safe access to values
console.log(withValue.get()) // 42
// console.log(withoutValue.get())     // Would throw error - use getOrElse instead

// Default values
console.log(withValue.getOrElse(0)) // 42
console.log(withoutValue.getOrElse(0)) // 0

// Optional chaining alternative
const user = Option({ name: "John", address: { city: "New York" } })
const noUser = Option(null)

// With Option
const city1 = user
  .flatMap((u) => Option(u.address))
  .flatMap((a) => Option(a.city))
  .getOrElse("Unknown")
const city2 = noUser
  .flatMap((u) => Option(u.address))
  .flatMap((a) => Option(a.city))
  .getOrElse("Unknown")

console.log(city1) // "New York"
console.log(city2) // "Unknown"
```

### Transformations

```typescript
import { Option } from "functype"

const opt1 = Option(5)
const opt2 = Option(null)

// Map: transform the value if present
const doubled = opt1.map((x) => x * 2) // Some(10)
const doubledEmpty = opt2.map((x) => x * 2) // None

// FlatMap: chain operations that return Options
const stringLength = (s: string): Option<number> => (s ? Option(s.length) : None())

const name = Option("Alice")
const nameLength = name.flatMap(stringLength) // Some(5)

// Filter: keep value only if predicate is true
const greaterThan3 = opt1.filter((x) => x > 3) // Some(5)
const lessThan3 = opt1.filter((x) => x < 3) // None
```

### Pattern Matching

```typescript
import { Option } from "functype"

const opt = Option(42)
const empty = Option(null)

// Using fold for pattern matching
const result1 = opt.fold(
  () => "No value",
  (value) => `Value: ${value}`,
)
console.log(result1) // "Value: 42"

const result2 = empty.fold(
  () => "No value",
  (value) => `Value: ${value}`,
)
console.log(result2) // "No value"

// Using match for pattern matching
const display1 = opt.match({
  Some: (value) => `Found: ${value}`,
  None: () => "Not found",
})
console.log(display1) // "Found: 42"

const display2 = empty.match({
  Some: (value) => `Found: ${value}`,
  None: () => "Not found",
})
console.log(display2) // "Not found"
```

### Factory Methods

```typescript
import { Option } from "functype"

// Creating from nullable values
const fromNullable = Option.fromNullable(null) // None
const fromValue = Option.fromNullable(42) // Some(42)

// Creating from predicates
const fromPredicate = Option.fromPredicate(42, (n) => n > 0) // Some(42)

const fromFalsePredicate = Option.fromPredicate(-5, (n) => n > 0) // None

// Creating from try-catch blocks
const fromTry = Option.fromTry(() => JSON.parse('{"name":"John"}')) // Some({name: "John"})
const fromBadTry = Option.fromTry(() => JSON.parse("invalid json")) // None
```

## Either

The `Either` type represents a value of one of two possible types, typically used for error handling.

### Basic Usage

```typescript
import { Either, Left, Right } from "functype"

// Creating Either values
const success = Right<string, number>(42) // Right<number>(42)
const failure = Left<string, number>("error") // Left<string>("error")

// Check variants
console.log(success.isRight()) // true
console.log(success.isLeft()) // false
console.log(failure.isRight()) // false
console.log(failure.isLeft()) // true

// Safe access to values
console.log(success.get()) // 42
// console.log(failure.get())  // Would throw error - use getOrElse instead

// Default values
console.log(success.getOrElse(0)) // 42
console.log(failure.getOrElse(0)) // 0

// Get the left value
console.log(failure.getLeft()) // "error"
// console.log(success.getLeft()) // Would throw error
```

### Transformations

```typescript
import { Either, Left, Right } from "functype"

const success = Right<string, number>(5)
const failure = Left<string, number>("invalid input")

// Map: transform right value
const doubled = success.map((x) => x * 2) // Right(10)
const failureMap = failure.map((x) => x * 2) // Left("invalid input")

// MapLeft: transform left value
const upperError = failure.mapLeft((e) => e.toUpperCase()) // Left("INVALID INPUT")
const successMapLeft = success.mapLeft((e) => e.toUpperCase()) // Right(5)

// Flat map (chain operations)
const divide = (n: number): Either<string, number> => (n === 0 ? Left("Division by zero") : Right(10 / n))

const result1 = success.flatMap(divide) // Right(2)
const result2 = Right<string, number>(0).flatMap(divide) // Left("Division by zero")
const result3 = failure.flatMap(divide) // Left("invalid input")

// Swap left and right
const swapped = success.swap() // Left(5)
```

### Pattern Matching

```typescript
import { Either, Left, Right } from "functype"

const success = Right<string, number>(42)
const failure = Left<string, number>("error")

// Using fold for pattern matching
const result1 = success.fold(
  (left) => `Error: ${left}`,
  (right) => `Success: ${right}`,
)
console.log(result1) // "Success: 42"

const result2 = failure.fold(
  (left) => `Error: ${left}`,
  (right) => `Success: ${right}`,
)
console.log(result2) // "Error: error"

// Using match for pattern matching
const message1 = success.match({
  Right: (value) => `Result: ${value}`,
  Left: (error) => `Failed: ${error}`,
})
console.log(message1) // "Result: 42"

const message2 = failure.match({
  Right: (value) => `Result: ${value}`,
  Left: (error) => `Failed: ${error}`,
})
console.log(message2) // "Failed: error"
```

### Error Handling

```typescript
import { Either } from "functype"

// tryCatch for synchronous operations
const jsonResult = Either.tryCatch(
  () => JSON.parse('{"name":"John"}'),
  (e) => (e instanceof Error ? e.message : String(e)),
) // Right({name: "John"})

const badJsonResult = Either.tryCatch(
  () => JSON.parse("invalid json"),
  (e) => (e instanceof Error ? e.message : String(e)),
) // Left("Unexpected token i in JSON at position 0")

// tryCatchAsync for asynchronous operations
async function fetchData() {
  const result = await Either.tryCatchAsync(
    async () => {
      const res = await fetch("https://api.example.com/data")
      if (!res.ok) throw new Error(`HTTP error: ${res.status}`)
      return res.json()
    },
    (e) => (e instanceof Error ? e.message : String(e)),
  )

  return result.fold(
    (error) => console.error("Failed to fetch:", error),
    (data) => console.log("Data:", data),
  )
}
```

### Factory Methods

```typescript
import { Either } from "functype"

// Create from nullable values
const fromNull = Either.fromNullable(null, "Value was null") // Left("Value was null")
const fromValue = Either.fromNullable(42, "Value was null") // Right(42)

// Create from try-catch
const fromTry = Either.fromTry(
  () => JSON.parse('{"name":"John"}'),
  (e) => `Parse error: ${e}`,
) // Right({name: "John"})

// Create from predicate
const validNumber = Either.fromPredicate(
  42,
  (n) => n > 0,
  (n) => `Number ${n} is not positive`,
) // Right(42)

const invalidNumber = Either.fromPredicate(
  -5,
  (n) => n > 0,
  (n) => `Number ${n} is not positive`,
) // Left("Number -5 is not positive")
```

## Try

The `Try` type represents a computation that might throw an exception.

### Basic Usage

```typescript
import { Try, Success, Failure } from "functype"

// Creating Try values
const success = Try(() => 42) // Success(42)
const failure = Try(() => {
  throw new Error("Something went wrong")
}) // Failure(Error)

// Check variants
console.log(success.isSuccess()) // true
console.log(success.isFailure()) // false
console.log(failure.isSuccess()) // false
console.log(failure.isFailure()) // true

// Safe access
console.log(success.get()) // 42
// console.log(failure.get())  // Would throw the original error

// Default values
console.log(success.getOrElse(0)) // 42
console.log(failure.getOrElse(0)) // 0

// Access the error
console.log(failure.error.message) // "Something went wrong"
```

### Transformations

```typescript
import { Try } from "functype"

const success = Try(() => 5)
const failure = Try(() => {
  throw new Error("Division error")
})

// Map: transform success values
const doubled = success.map((x) => x * 2) // Success(10)
const failureMap = failure.map((x) => x * 2) // Failure(Error)

// Flat map (chain operations)
const divide = (n: number) =>
  Try(() => {
    if (n === 0) throw new Error("Division by zero")
    return 10 / n
  })

const result1 = success.flatMap(divide) // Success(2)
const result2 = Try(() => 0).flatMap(divide) // Failure(Error: Division by zero)
```

### Pattern Matching

```typescript
import { Try } from "functype"

const success = Try(() => 42)
const failure = Try(() => {
  throw new Error("Something went wrong")
})

// Using fold for pattern matching
const result1 = success.fold(
  (error) => `Error: ${error.message}`,
  (value) => `Success: ${value}`,
)
console.log(result1) // "Success: 42"

const result2 = failure.fold(
  (error) => `Error: ${error.message}`,
  (value) => `Success: ${value}`,
)
console.log(result2) // "Error: Something went wrong"

// Using match for pattern matching
const message1 = success.match({
  Success: (value) => `Result: ${value}`,
  Failure: (error) => `Failed: ${error.message}`,
})
console.log(message1) // "Result: 42"

const message2 = failure.match({
  Success: (value) => `Result: ${value}`,
  Failure: (error) => `Failed: ${error.message}`,
})
console.log(message2) // "Failed: Something went wrong"
```

### Recovery

```typescript
import { Try } from "functype"

const failure = Try(() => {
  throw new Error("Network error")
})

// Recover with a default value
const recovered = failure.recover(0) // Success(0)

// Recover with another Try
const recoveredTry = failure.recoverWith(() => Try(() => "Fallback")) // Success("Fallback")

// Convert to other types
const asEither = failure.toEither() // Left(Error: Network error)
const asOption = failure.toOption() // None
```

## List

The `List` type is an immutable list with functional operations.

### Basic Usage

```typescript
import { List } from "functype"

// Creating lists
const empty = List([]) // List([])
const numbers = List([1, 2, 3, 4, 5]) // List([1, 2, 3, 4, 5])
const mixed = List([1, "two", true]) // List([1, "two", true])

// Access elements
console.log(numbers.head()) // Option(1)
console.log(numbers.tail()) // List([2, 3, 4, 5])
console.log(empty.head()) // None

// Check properties
console.log(numbers.isEmpty()) // false
console.log(empty.isEmpty()) // true
console.log(numbers.size()) // 5

// Add/remove elements (immutably)
const withSix = numbers.add(6) // List([1, 2, 3, 4, 5, 6])
const without3 = numbers.remove(3) // List([1, 2, 4, 5])

// Convert to array
console.log(numbers.toArray()) // [1, 2, 3, 4, 5]
```

### Transformations

```typescript
import { List } from "functype"

const numbers = List([1, 2, 3, 4, 5])

// Map: transform each element
const doubled = numbers.map((x) => x * 2) // List([2, 4, 6, 8, 10])

// Filter: keep elements matching predicate
const evens = numbers.filter((x) => x % 2 === 0) // List([2, 4])

// FlatMap: transform and flatten
const pairs = numbers.flatMap((x) => List([x, x])) // List([1, 1, 2, 2, 3, 3, 4, 4, 5, 5])

// Take/Drop
const firstThree = numbers.take(3) // List([1, 2, 3])
const lastTwo = numbers.drop(3) // List([4, 5])

// Slicing
const middle = numbers.slice(1, 4) // List([2, 3, 4])
```

### Aggregations

```typescript
import { List } from "functype"

const numbers = List([1, 2, 3, 4, 5])

// Reduce (foldLeft)
const sum = numbers.foldLeft(0)((acc, x) => acc + x) // 15

// Right-associative fold
const sumRight = numbers.foldRight(0)((x, acc) => x + acc) // 15

// Find elements
const firstEven = numbers.find((x) => x % 2 === 0) // Some(2)
const noMatch = numbers.find((x) => x > 10) // None

// Check if elements exist
console.log(numbers.exists((x) => x === 3)) // true
console.log(numbers.forAll((x) => x < 10)) // true

// Count elements
console.log(numbers.count((x) => x % 2 === 0)) // 2
```

### Operations

```typescript
import { List } from "functype"

const list1 = List([1, 2, 3])
const list2 = List([4, 5, 6])

// Concatenation
const combined = list1.concat(list2) // List([1, 2, 3, 4, 5, 6])

// Reverse
const reversed = list1.reverse() // List([3, 2, 1])

// Sort
const unsorted = List([3, 1, 4, 2, 5])
const sorted = unsorted.sort((a, b) => a - b) // List([1, 2, 3, 4, 5])

// Unique values
const duplicates = List([1, 2, 2, 3, 3, 3])
const unique = duplicates.distinct() // List([1, 2, 3])

// Grouping
const grouped = List([1, 2, 3, 4, 5, 6]).groupBy((x) => (x % 2 === 0 ? "even" : "odd"))
// Map({ 'odd': List([1, 3, 5]), 'even': List([2, 4, 6]) })
```

### Pattern Matching

```typescript
import { List } from "functype"

const numbers = List([1, 2, 3])
const empty = List([])

// Using match for pattern matching
const result1 = numbers.match({
  NonEmpty: (values) => `Values: ${values.join(", ")}`,
  Empty: () => "No values",
})
console.log(result1) // "Values: 1, 2, 3"

const result2 = empty.match({
  NonEmpty: (values) => `Values: ${values.join(", ")}`,
  Empty: () => "No values",
})
console.log(result2) // "No values"
```

## Map

The `Map` type is an immutable key-value map with functional operations.

### Basic Usage

```typescript
import { Map } from "functype"

// Creating maps
const empty = Map<string, number>({})
const scores = Map({
  alice: 95,
  bob: 87,
  charlie: 92,
})

// Access elements
console.log(scores.get("alice")) // Some(95)
console.log(scores.get("dave")) // None
console.log(scores.getOrElse("dave", 0)) // 0

// Check properties
console.log(scores.isEmpty()) // false
console.log(empty.isEmpty()) // true
console.log(scores.size()) // 3
console.log(scores.has("bob")) // true

// Keys and values
console.log(scores.keys()) // List(["alice", "bob", "charlie"])
console.log(scores.values()) // List([95, 87, 92])

// Add/remove entries (immutably)
const withDave = scores.add("dave", 83) // Map with dave added
const withoutBob = scores.remove("bob") // Map without bob

// Convert to object
console.log(scores.toObject()) // { alice: 95, bob: 87, charlie: 92 }
```

### Transformations

```typescript
import { Map } from "functype"

const scores = Map({
  alice: 95,
  bob: 87,
  charlie: 92,
})

// Map: transform values
const grades = scores.map((score) => {
  if (score >= 90) return "A"
  if (score >= 80) return "B"
  return "C"
})
// Map({ alice: 'A', bob: 'B', charlie: 'A' })

// Filter entries
const highScores = scores.filter((score, key) => score >= 90)
// Map({ alice: 95, charlie: 92 })

// Map entries (both key and value)
const prefixed = scores.mapEntries(([key, value]) => [`student_${key}`, value])
// Map({ student_alice: 95, student_bob: 87, student_charlie: 92 })
```

### Aggregations

```typescript
import { Map } from "functype"

const scores = Map({
  alice: 95,
  bob: 87,
  charlie: 92,
})

// Fold
const total = scores.foldLeft(0)((acc, score) => acc + score) // 274
const report = scores.foldLeft("")((acc, score, name) => `${acc}${name}: ${score}\n`)
// "alice: 95\nbob: 87\ncharlie: 92\n"

// Find entries
const found = scores.find((score) => score > 90) // Some([alice, 95])
const notFound = scores.find((score) => score > 100) // None
```

### Operations

```typescript
import { Map } from "functype"

const group1 = Map({ alice: 95, bob: 87 })
const group2 = Map({ charlie: 92, dave: 88 })

// Merge maps
const allScores = group1.merge(group2)
// Map({ alice: 95, bob: 87, charlie: 92, dave: 88 })

// Override values
const updated = group1.merge(Map({ bob: 90 }))
// Map({ alice: 95, bob: 90 })

// Custom merge logic
const merged = group1.mergeWith(Map({ bob: 90 }), (v1, v2) => Math.max(v1, v2))
// Map({ alice: 95, bob: 90 })
```

## Set

The `Set` type is an immutable set collection with functional operations.

### Basic Usage

```typescript
import { Set } from "functype"

// Creating sets
const empty = Set<number>([])
const numbers = Set([1, 2, 3, 4, 5])
const withDuplicates = Set([1, 1, 2, 2, 3]) // Set([1, 2, 3])

// Check properties
console.log(numbers.isEmpty()) // false
console.log(empty.isEmpty()) // true
console.log(numbers.size()) // 5
console.log(numbers.has(3)) // true
console.log(numbers.has(10)) // false

// Add/remove elements (immutably)
const withSix = numbers.add(6) // Set([1, 2, 3, 4, 5, 6])
const without3 = numbers.remove(3) // Set([1, 2, 4, 5])

// Convert to array
console.log(numbers.toArray()) // [1, 2, 3, 4, 5]
```

### Transformations

```typescript
import { Set } from "functype"

const numbers = Set([1, 2, 3, 4, 5])

// Map: transform each element
const doubled = numbers.map((x) => x * 2) // Set([2, 4, 6, 8, 10])

// Filter: keep elements matching predicate
const evens = numbers.filter((x) => x % 2 === 0) // Set([2, 4])

// FlatMap: transform and flatten
const adjacents = numbers.flatMap((x) => Set([x - 1, x, x + 1]))
// Set([0, 1, 2, 3, 4, 5, 6])
```

### Set Operations

```typescript
import { Set } from "functype"

const set1 = Set([1, 2, 3, 4])
const set2 = Set([3, 4, 5, 6])

// Union
const union = set1.union(set2) // Set([1, 2, 3, 4, 5, 6])

// Intersection
const intersection = set1.intersect(set2) // Set([3, 4])

// Difference
const difference = set1.difference(set2) // Set([1, 2])

// Symmetric difference
const symmetricDiff = set1.symmetricDifference(set2) // Set([1, 2, 5, 6])

// Subset check
const subset = Set([1, 2])
console.log(subset.isSubsetOf(set1)) // true
console.log(set1.isSubsetOf(subset)) // false
```

### Aggregations

```typescript
import { Set } from "functype"

const numbers = Set([1, 2, 3, 4, 5])

// Fold
const sum = numbers.foldLeft(0)((acc, x) => acc + x) // 15

// Find elements
const firstEven = numbers.find((x) => x % 2 === 0) // Some(2)
const noMatch = numbers.find((x) => x > 10) // None

// Check if elements exist
console.log(numbers.exists((x) => x % 2 === 0)) // true
console.log(numbers.forAll((x) => x < 10)) // true
```

## FPromise

The `FPromise` type enhances JavaScript's Promise with functional operations and better error handling.

### Basic Usage

```typescript
import { FPromise } from "functype"

// Creating FPromises
const success = FPromise.resolve(42)
const failure = FPromise.reject(new Error("Something went wrong"))
const fromPromise = FPromise.fromPromise(fetch("https://api.example.com/data"))

// From regular functions
const compute = () => 42
const fp1 = FPromise.tryCatch(compute) // FPromise<number, Error>

// From async functions
const fetchData = async () => {
  const response = await fetch("https://api.example.com/data")
  if (!response.ok) throw new Error(`HTTP error: ${response.status}`)
  return response.json()
}

const fp2 = FPromise.tryCatch(fetchData) // FPromise<Data, Error>
```

### Transformations

```typescript
import { FPromise } from "functype"

const promise = FPromise.resolve(5)

// Map: transform success value
const doubled = promise.map((x) => x * 2) // FPromise<10, never>

// MapError: transform error value
const mappedError = promise.mapError((e) => new Error(`Enhanced error: ${e.message}`))

// FlatMap: chain operations
const nextOperation = (n: number) => FPromise.resolve(n.toString())
const chained = promise.flatMap(nextOperation) // FPromise<"5", never>

// Tap: perform side effects
const withLogging = promise.tap((value) => {
  console.log("Processing value:", value)
})

// TapError: side effects for errors
const withErrorLogging = promise.tapError((error) => {
  console.error("Error occurred:", error)
})
```

### Error Handling

```typescript
import { FPromise } from "functype"

const failedPromise = FPromise.reject(new Error("Network error"))

// Recover with a default value
const recovered = failedPromise.recover(0) // FPromise<0, never>

// Recover with another operation
const recoveredWith = failedPromise.recoverWith((err) => FPromise.resolve(`Recovered from: ${err.message}`))

// Handle both success and error paths
const handled = FPromise.resolve(42).fold(
  (err) => `Error: ${err.message}`,
  (value) => `Success: ${value}`,
) // FPromise<"Success: 42", never>

// Convert to standard Promise
const stdPromise = FPromise.resolve(42).toPromise()
stdPromise.then((value) => console.log(value)) // 42
```

### Parallel Operations

```typescript
import { FPromise } from "functype"

const p1 = FPromise.resolve(1)
const p2 = FPromise.resolve(2)
const p3 = FPromise.resolve(3)

// Parallel execution
const all = FPromise.all([p1, p2, p3]) // FPromise<[1, 2, 3], never>

// Race
const race = FPromise.race([FPromise.delay(100).map(() => "fast"), FPromise.delay(200).map(() => "slow")]) // FPromise<"fast", never>

// With timeout
const withTimeout = FPromise.timeout(
  FPromise.delay(2000).map(() => "result"),
  1000,
  () => new Error("Operation timed out"),
) // FPromise<never, Error> (times out)
```

### Retry Logic

```typescript
import { FPromise, retry } from "functype/fpromise"

const unreliableOperation = () => {
  // Simulate an operation that sometimes fails
  if (Math.random() < 0.7) {
    return FPromise.reject(new Error("Temporary failure"))
  }
  return FPromise.resolve("Success!")
}

// Basic retry
const retried = retry({
  task: unreliableOperation,
  maxRetries: 5,
}) // Will retry up to 5 times

// Advanced retry with backoff
const retriedWithBackoff = retry({
  task: unreliableOperation,
  maxRetries: 5,
  delay: 1000, // Start with 1 second delay
  backoffFactor: 2, // Double delay after each attempt
  maxDelay: 10000, // Cap delay at 10 seconds
  retryIf: (error) => error.message.includes("Temporary"), // Only retry certain errors
})
```

## Task

The `Task` type represents synchronous and asynchronous operations with error handling.

### Basic Usage

```typescript
import { Task } from "functype"

// Synchronous tasks
const syncTask = Task().Sync(
  () => 42, // Success function
  (error) => new Error(`Failed: ${error}`), // Error function
)

// Asynchronous tasks
const asyncTask = Task().Async(
  async () => {
    const response = await fetch("https://api.example.com/data")
    if (!response.ok) throw new Error(`HTTP error: ${response.status}`)
    return response.json()
  },
  async (error) => new Error(`Fetch failed: ${error}`),
)

// Named tasks (for debugging)
const namedTask = Task({ name: "UserFetch" }).Sync(
  () => ({ id: 1, name: "John Doe" }),
  (error) => new Error(`User fetch failed: ${error}`),
)

// Running tasks
syncTask.then((value) => console.log("Success:", value)).catch((error) => console.error("Error:", error))

// With async/await
async function runTask() {
  try {
    const result = await asyncTask
    console.log("Data:", result)
  } catch (error) {
    console.error("Failed:", error)
  }
}
```

### Adapting External APIs

```typescript
import { Task } from "functype"

// Convert promise-based APIs to Task
const fetchUser = (id: string): Promise<User> => fetch(`/api/users/${id}`).then((r) => r.json())

// Create a Task adapter
const getUser = Task({ name: "UserFetch" }).fromPromise(fetchUser)

// Use the task
getUser("user123")
  .then((user) => console.log(user))
  .catch((error) => console.error(error))

// Convert back to Promise when needed
const task = Task().Sync(() => "hello world")
const promise = Task().toPromise(task) // Promise<string>
```

### Composition

```typescript
import { Task } from "functype"

// Define component tasks
const fetchUser = Task({ name: "FetchUser" }).Async(
  async (userId: string) => {
    const response = await fetch(`/api/users/${userId}`)
    if (!response.ok) throw new Error(`HTTP error: ${response.status}`)
    return response.json()
  },
  async (error) => new Error(`User fetch failed: ${error}`),
)

const fetchPosts = Task({ name: "FetchPosts" }).Async(
  async (userId: string) => {
    const response = await fetch(`/api/users/${userId}/posts`)
    if (!response.ok) throw new Error(`HTTP error: ${response.status}`)
    return response.json()
  },
  async (error) => new Error(`Posts fetch failed: ${error}`),
)

// Compose tasks
async function getUserWithPosts(userId: string) {
  try {
    // Run tasks in sequence with dependencies
    const user = await fetchUser(userId)
    const posts = await fetchPosts(userId)
    return { user, posts }
  } catch (error) {
    console.error("Error:", error)
    throw error
  }
}

// Run parallel tasks
async function getMultipleUsers(userIds: string[]) {
  try {
    const userTasks = userIds.map((id) => fetchUser(id))
    const users = await Promise.all(userTasks)
    return users
  } catch (error) {
    console.error("Error:", error)
    throw error
  }
}
```

## Branded Types

Branded types provide nominal typing in TypeScript's structural type system, giving stronger type safety.

### Basic Usage

```typescript
import { Brand } from "functype/branded"

// Create branded types
type UserId = Brand<string, "UserId">
type Email = Brand<string, "Email">

// Create factory functions with validation
const UserId = (id: string): UserId => {
  if (!/^U\d{6}$/.test(id)) {
    throw new Error("Invalid user ID format")
  }
  return id as UserId
}

const Email = (email: string): Email => {
  if (!/^[^@]+@[^@]+\.[^@]+$/.test(email)) {
    throw new Error("Invalid email format")
  }
  return email as Email
}

// Usage
function getUserByEmail(email: Email): User {
  /* ... */
  return { id: "U123456" as UserId, email }
}

// Type safety in action
const email = Email("user@example.com")
const user = getUserByEmail(email) // Works

// These would cause type errors
// getUserByEmail("invalid")  // Error: Argument of type 'string' is not assignable to parameter of type 'Email'
// getUserByEmail(UserId("U123456"))  // Error: Argument of type 'UserId' is not assignable to parameter of type 'Email'
```

### Advanced Branded Types

```typescript
import { Brand } from "functype/branded"

// Numeric constraints
type PositiveInt = Brand<number, "PositiveInt">
type Percentage = Brand<number, "Percentage">

const PositiveInt = (n: number): PositiveInt => {
  if (!Number.isInteger(n) || n <= 0) {
    throw new Error("Must be a positive integer")
  }
  return n as PositiveInt
}

const Percentage = (n: number): Percentage => {
  if (n < 0 || n > 100) {
    throw new Error("Percentage must be between 0 and 100")
  }
  return n as Percentage
}

// String format validation
type ISBN = Brand<string, "ISBN">
type CreditCardNumber = Brand<string, "CreditCardNumber">

const ISBN = (isbn: string): ISBN => {
  // Simplified validation
  if (!/^\d{10}(\d{3})?$/.test(isbn.replace(/-/g, ""))) {
    throw new Error("Invalid ISBN format")
  }
  return isbn as ISBN
}

// Combining with Option for safe creation
import { Option } from "functype/option"

const SafeEmail = (email: string): Option<Email> => {
  try {
    return Option(Email(email))
  } catch (e) {
    return Option(null)
  }
}

// Usage
const maybeEmail = SafeEmail("invalid") // None
const validEmail = SafeEmail("user@example.com") // Some(Email)
```

## Tuple

The `Tuple` type provides a type-safe fixed-length array.

### Basic Usage

```typescript
import { Tuple } from "functype"

// Create tuples of different sizes and types
const pair = Tuple(42, "hello") // Tuple<[number, string]>
const triple = Tuple(true, 100, "world") // Tuple<[boolean, number, string]>

// Access elements (type-safe)
console.log(pair.first()) // 42
console.log(pair.second()) // "hello"
console.log(triple.third()) // "world"

// Destructuring
const [a, b] = pair.toArray() // a: number, b: string
console.log(a, b) // 42 "hello"

// Map individual elements
const mappedPair = pair.mapFirst((n) => n * 2) // Tuple(84, "hello")
const mappedPair2 = pair.mapSecond((s) => s.toUpperCase()) // Tuple(42, "HELLO")

// Map the entire tuple
const mapped = pair.map(([num, str]) => {
  return [num * 2, str.toUpperCase()] as [number, string]
}) // Tuple(84, "HELLO")
```

### Operations

```typescript
import { Tuple } from "functype"

// Swap elements
const pair = Tuple("first", "second")
const swapped = pair.swap() // Tuple("second", "first")

// Apply a function to tuple elements
const nums = Tuple(5, 10)
const sum = nums.apply((a, b) => a + b) // 15

// Combine tuples
const t1 = Tuple(1, "a")
const t2 = Tuple(true, 42)
const combined = t1.concat(t2) // Tuple(1, "a", true, 42)

// Convert to object with keys
const person = Tuple("John", 30)
const obj = person.toObject(["name", "age"]) // { name: "John", age: 30 }
```

### With Other Types

```typescript
import { Tuple, Option, Either } from "functype"

// Create tuples with Options
const maybePair = Tuple(Option(42), Option("hello"))

// Map with Options
const optResult = maybePair.mapFirst((opt) => opt.map((n) => n * 2))

// Create tuples with Either
const validationPair = Tuple(
  Either.fromNullable(42, "Missing first value"),
  Either.fromNullable(null, "Missing second value"),
)

// Check if all Either values are valid
const allValid = validationPair.toArray().every((either) => either.isRight()) // false

// Combine Tuple and Task
import { Task } from "functype"

const taskPair = Tuple(
  Task().Sync(() => "hello"),
  Task().Sync(() => 42),
)

// Run tasks in parallel
async function runBoth() {
  const [str, num] = await Promise.all(taskPair.toArray())
  console.log(str, num) // "hello" 42
}
```

## Foldable

The `Foldable` type class provides a common interface for data structures that can be "folded" to a single value.

### Using Foldable Interface

```typescript
import { FoldableUtils, Option, List, Try } from "functype"

// Different data structures implementing Foldable
const option = Option(5)
const list = List([1, 2, 3, 4, 5])
const tryVal = Try(() => 10)

// Using fold to pattern-match on data structures
option.fold(
  () => console.log("Empty option"),
  (value) => console.log(`Option value: ${value}`),
) // "Option value: 5"

// Left-associative fold (reduce from left to right)
const sum = list.foldLeft(0)((acc, value) => acc + value) // 15

// Right-associative fold (reduce from right to left)
const product = list.foldRight(1)((value, acc) => value * acc) // 120

// Using FoldableUtils to work with any Foldable
const isEmpty = FoldableUtils.isEmpty(option) // false
const size = FoldableUtils.size(list) // 5
```

### Converting Between Types

```typescript
import { FoldableUtils, Option, List, Either, Try } from "functype"

// Convert between data structure types
const opt = Option(42)
const list = List([1, 2, 3])
const either = Either.right<string, number>(10)
const tryVal = Try(() => "hello")

// Convert to List
const optAsList = FoldableUtils.toList(opt) // List([42])
const eitherAsList = FoldableUtils.toList(either) // List([10])

// Convert to Option (takes first element from collections)
const listAsOption = FoldableUtils.toOption(list) // Some(1)

// Convert to Either
const optAsEither = FoldableUtils.toEither(opt, "Empty") // Right(42)
const tryAsEither = FoldableUtils.toEither(tryVal, "Failed") // Right("hello")

// Extract all values from foldable structures
const listValues = FoldableUtils.values(list) // [1, 2, 3]
const optValues = FoldableUtils.values(opt) // [42]
```

## Matchable

The `Matchable` type class provides pattern matching capabilities for data structures.

### Basic Pattern Matching

```typescript
import { Option, Either, Try, List } from "functype"

// Pattern matching on Option
const opt = Option(42)
const optResult = opt.match({
  Some: (value) => `Found: ${value}`,
  None: () => "Not found",
})
console.log(optResult) // "Found: 42"

// Pattern matching on Either
const either = Either.fromNullable(null, "Missing value")
const eitherResult = either.match({
  Left: (error) => `Error: ${error}`,
  Right: (value) => `Value: ${value}`,
})
console.log(eitherResult) // "Error: Missing value"

// Pattern matching on Try
const tryVal = Try(() => JSON.parse('{"name":"John"}'))
const tryResult = tryVal.match({
  Success: (data) => `Name: ${data.name}`,
  Failure: (error) => `Parse error: ${error.message}`,
})
console.log(tryResult) // "Name: John"

// Pattern matching on List
const list = List([1, 2, 3])
const listResult = list.match({
  NonEmpty: (values) => `Values: ${values.join(", ")}`,
  Empty: () => "No values",
})
console.log(listResult) // "Values: 1, 2, 3"
```

### Advanced Pattern Matching

```typescript
import { MatchableUtils } from "functype"

// Create pattern matchers with guards
const isPositive = MatchableUtils.when(
  (n: number) => n > 0,
  (n) => `Positive: ${n}`,
)

const isZero = MatchableUtils.when(
  (n: number) => n === 0,
  () => "Zero",
)

const isNegative = MatchableUtils.when(
  (n: number) => n < 0,
  (n) => `Negative: ${n}`,
)

const defaultCase = MatchableUtils.default((n: number) => `Default: ${n}`)

// Using pattern matching with multiple conditions
function describeNumber(num: number): string {
  return isPositive(num) ?? isZero(num) ?? isNegative(num) ?? defaultCase(num)
}

console.log(describeNumber(42)) // "Positive: 42"
console.log(describeNumber(0)) // "Zero"
console.log(describeNumber(-10)) // "Negative: -10"
```

## Common Patterns

### Chaining Operations

```typescript
import { Option, Either, List } from "functype"

// Option chaining
const userInput = Option("  John Doe  ")
const processedName = userInput
  .map((s) => s.trim())
  .filter((s) => s.length > 0)
  .map((s) => s.toUpperCase())
  .getOrElse("ANONYMOUS")
console.log(processedName) // "JOHN DOE"

// Either chaining
function validateAge(age: number): Either<string, number> {
  if (!Number.isInteger(age)) return Either.left("Age must be an integer")
  if (age < 0) return Either.left("Age cannot be negative")
  if (age > 120) return Either.left("Age is too high")
  return Either.right(age)
}

const processAge = (input: string): Either<string, string> => {
  return Either.tryCatch(
    () => parseInt(input, 10),
    () => "Invalid number format",
  )
    .flatMap(validateAge)
    .map((age) => `Valid age: ${age}`)
}

console.log(processAge("35").getOrElse("Invalid age")) // "Valid age: 35"
console.log(processAge("abc").getOrElse("Invalid age")) // "Invalid age"

// List chaining
const numbers = List([1, 2, 3, 4, 5, 6, 7, 8, 9, 10])
const result = numbers
  .filter((n) => n % 2 === 0) // even numbers
  .map((n) => n * n) // square them
  .filter((n) => n > 20) // keep those > 20
  .take(2) // take first 2
  .foldLeft(0)((acc, n) => acc + n) // sum them
console.log(result) // 36 + 64 = 100
```

### Composition with Pipe

```typescript
import { Option, Either, List, pipe } from "functype"

// Pipe with Option
const result1 = pipe(
  Option(5),
  (opt) => opt.map((n) => n * 2),
  (opt) => opt.filter((n) => n > 5),
  (opt) => opt.getOrElse(0),
)
console.log(result1) // 10

// Pipe with Either
const result2 = pipe(
  Either.right<string, number>(42),
  (either) => either.map((n) => n.toString()),
  (either) => either.mapLeft((e) => new Error(e)),
  (either) => either.getOrElse("error"),
)
console.log(result2) // "42"

// Pipe with List and multiple data types
const result3 = pipe(
  List([1, 2, 3, 4]),
  (list) => list.map((n) => n * 2),
  (list) => Option(list.head().getOrElse(0)),
  (opt) => opt.filter((n) => n > 5),
  (opt) => Either.fromNullable(opt.getOrElse(null), "No valid value"),
  (either) =>
    either.fold(
      (err) => `Error: ${err}`,
      (val) => `Success: ${val}`,
    ),
)
console.log(result3) // "Success: 8"
```

## Error Handling

### Option for Nullable Values

```typescript
import { Option } from "functype"

// Option instead of null checks
function findUserById(id: string): Option<User> {
  const user = database.findUser(id) // might return null
  return Option(user)
}

// Usage
const userId = "user123"
const user = findUserById(userId)

// No need for null checks
const greet = user.map((u) => `Hello, ${u.name}!`).getOrElse("User not found")

// Method chaining without worrying about null
const userCity = user
  .flatMap((u) => Option(u.address))
  .flatMap((a) => Option(a.city))
  .getOrElse("Unknown location")
```

### Either for Error Handling

```typescript
import { Either } from "functype"

// Define domain-specific errors
class ValidationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "ValidationError"
  }
}

class NotFoundError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "NotFoundError"
  }
}

// Functions return Either instead of throwing
function validateEmail(email: string): Either<ValidationError, string> {
  const emailRegex = /^[^@]+@[^@]+\.[^@]+$/
  return emailRegex.test(email) ? Either.right(email) : Either.left(new ValidationError(`Invalid email: ${email}`))
}

function findUserByEmail(email: string): Either<NotFoundError, User> {
  const user = database.findUserByEmail(email)
  return user ? Either.right(user) : Either.left(new NotFoundError(`User not found for email: ${email}`))
}

// Chain operations with proper error handling
function processUserEmail(email: string): Either<Error, string> {
  return validateEmail(email)
    .flatMap((validEmail) => findUserByEmail(validEmail))
    .map((user) => `User ${user.name} found with email ${email}`)
}

// Usage
const result = processUserEmail("user@example.com")
result.fold(
  (error) => console.error(`Error: ${error.message}`),
  (success) => console.log(success),
)
```

### Try for Exception Handling

```typescript
import { Try, Option, Either } from "functype"

// Safely handle potentially throwing code
function parseJSON(json: string): Try<unknown> {
  return Try(() => JSON.parse(json))
}

// Parse configuration from JSON file
function loadConfig(filePath: string): Try<Config> {
  return Try(() => {
    const fileContents = fs.readFileSync(filePath, "utf8")
    return JSON.parse(fileContents) as Config
  })
}

// Usage
const config = loadConfig("/path/to/config.json").recover({ host: "localhost", port: 8080 }) // Default if loading fails

// Convert to other types as needed
const configOption: Option<Config> = config.toOption()
const configEither: Either<Error, Config> = config.toEither()
```

### FPromise for Async Error Handling

```typescript
import { FPromise } from "functype"

// API client with proper error handling
class ApiClient {
  private baseUrl: string

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl
  }

  fetchData<T>(endpoint: string): FPromise<T, Error> {
    return FPromise.tryCatchAsync(
      async () => {
        const response = await fetch(`${this.baseUrl}${endpoint}`)

        if (!response.ok) {
          throw new Error(`HTTP error: ${response.status}`)
        }

        return response.json() as Promise<T>
      },
      (error) => {
        if (error instanceof Error) {
          return error
        }
        return new Error(String(error))
      },
    )
  }

  submitData<T, R>(endpoint: string, data: T): FPromise<R, Error> {
    return FPromise.tryCatchAsync(
      async () => {
        const response = await fetch(`${this.baseUrl}${endpoint}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        })

        if (!response.ok) {
          throw new Error(`HTTP error: ${response.status}`)
        }

        return response.json() as Promise<R>
      },
      (error) => {
        if (error instanceof Error) {
          return error
        }
        return new Error(String(error))
      },
    )
  }
}

// Usage
const api = new ApiClient("https://api.example.com")

api
  .fetchData<User[]>("/users")
  .map((users) => users.map((u) => u.name))
  .fold(
    (error) => console.error(`Failed to fetch users: ${error.message}`),
    (names) => console.log(`User names: ${names.join(", ")}`),
  )

api
  .submitData<NewUser, User>("/users", { name: "Alice", email: "alice@example.com" })
  .map((user) => `Created user with ID: ${user.id}`)
  .recover("Failed to create user")
  .then((result) => console.log(result))
```

## Real-World Examples

### Form Validation

```typescript
import { Either, pipe } from "functype"

// Define validation types
type ValidationError = {
  field: string
  message: string
}

type FormData = {
  username: string
  email: string
  password: string
  age: string
}

// Validation functions
const validateUsername = (username: string): Either<ValidationError, string> => {
  if (!username) {
    return Either.left({ field: "username", message: "Username is required" })
  }
  if (username.length < 3) {
    return Either.left({ field: "username", message: "Username must be at least 3 characters" })
  }
  return Either.right(username)
}

const validateEmail = (email: string): Either<ValidationError, string> => {
  if (!email) {
    return Either.left({ field: "email", message: "Email is required" })
  }
  if (!/^[^@]+@[^@]+\.[^@]+$/.test(email)) {
    return Either.left({ field: "email", message: "Invalid email format" })
  }
  return Either.right(email)
}

const validatePassword = (password: string): Either<ValidationError, string> => {
  if (!password) {
    return Either.left({ field: "password", message: "Password is required" })
  }
  if (password.length < 8) {
    return Either.left({ field: "password", message: "Password must be at least 8 characters" })
  }
  return Either.right(password)
}

const validateAge = (age: string): Either<ValidationError, number> => {
  if (!age) {
    return Either.left({ field: "age", message: "Age is required" })
  }

  const numAge = parseInt(age, 10)
  if (isNaN(numAge)) {
    return Either.left({ field: "age", message: "Age must be a number" })
  }

  if (numAge < 18) {
    return Either.left({ field: "age", message: "You must be at least 18 years old" })
  }

  return Either.right(numAge)
}

// Validate form data
type ValidatedForm = {
  username: string
  email: string
  password: string
  age: number
}

function validateForm(form: FormData): Either<ValidationError[], ValidatedForm> {
  const usernameResult = validateUsername(form.username)
  const emailResult = validateEmail(form.email)
  const passwordResult = validatePassword(form.password)
  const ageResult = validateAge(form.age)

  // Collect all errors
  const errors: ValidationError[] = []

  if (usernameResult.isLeft()) errors.push(usernameResult.getLeft())
  if (emailResult.isLeft()) errors.push(emailResult.getLeft())
  if (passwordResult.isLeft()) errors.push(passwordResult.getLeft())
  if (ageResult.isLeft()) errors.push(ageResult.getLeft())

  // If there are any errors, return them
  if (errors.length > 0) {
    return Either.left(errors)
  }

  // Otherwise return the validated form
  return Either.right({
    username: usernameResult.get(),
    email: emailResult.get(),
    password: passwordResult.get(),
    age: ageResult.get(),
  })
}

// Usage
const formData: FormData = {
  username: "john",
  email: "john@example.com",
  password: "password123",
  age: "25",
}

const validationResult = validateForm(formData)

validationResult.fold(
  (errors) => {
    console.log("Validation failed:")
    errors.forEach((err) => {
      console.log(`- ${err.field}: ${err.message}`)
    })
  },
  (validData) => {
    console.log("Form is valid:", validData)
    // Process the valid form data...
  },
)
```

### Data Fetching and Processing

```typescript
import { FPromise, Option, Either, pipe, List } from "functype"

// Define types
type User = {
  id: string
  name: string
  email: string
}

type Post = {
  id: string
  userId: string
  title: string
  body: string
}

type Comment = {
  id: string
  postId: string
  name: string
  email: string
  body: string
}

// API client
class ApiClient {
  private baseUrl: string

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl
  }

  fetchUser(userId: string): FPromise<User, Error> {
    return this.fetchResource<User>(`/users/${userId}`)
  }

  fetchUserPosts(userId: string): FPromise<Post[], Error> {
    return this.fetchResource<Post[]>(`/users/${userId}/posts`)
  }

  fetchPostComments(postId: string): FPromise<Comment[], Error> {
    return this.fetchResource<Comment[]>(`/posts/${postId}/comments`)
  }

  private fetchResource<T>(endpoint: string): FPromise<T, Error> {
    return FPromise.tryCatchAsync(
      async () => {
        const response = await fetch(`${this.baseUrl}${endpoint}`)

        if (!response.ok) {
          throw new Error(`HTTP error: ${response.status}`)
        }

        return response.json() as Promise<T>
      },
      (error) => new Error(`API error: ${error}`),
    )
  }
}

// Use case: fetch a user's posts with comments
async function getUserContentSummary(userId: string) {
  const api = new ApiClient("https://jsonplaceholder.typicode.com")

  // Fetch user
  const userResult = await api.fetchUser(userId)

  if (userResult.isLeft()) {
    return `Error fetching user: ${userResult.getLeft().message}`
  }

  const user = userResult.get()

  // Fetch user's posts
  const postsResult = await api.fetchUserPosts(userId)

  if (postsResult.isLeft()) {
    return `Error fetching posts: ${postsResult.getLeft().message}`
  }

  const posts = postsResult.get()

  if (posts.length === 0) {
    return `User ${user.name} has no posts.`
  }

  // Take the latest post
  const latestPost = posts[0]

  // Fetch comments for the latest post
  const commentsResult = await api.fetchPostComments(latestPost.id)

  if (commentsResult.isLeft()) {
    return `Error fetching comments: ${commentsResult.getLeft().message}`
  }

  const comments = commentsResult.get()

  // Create summary
  return {
    user: {
      name: user.name,
      email: user.email,
    },
    postsCount: posts.length,
    latestPost: {
      title: latestPost.title,
      body: latestPost.body.substring(0, 100) + "...",
      commentsCount: comments.length,
    },
  }
}

// Usage
getUserContentSummary("1")
  .then((result) => console.log(JSON.stringify(result, null, 2)))
  .catch((error) => console.error("Error:", error))
```

### Event Sourcing

```typescript
import { Either, Option, List, Map } from "functype"

// Define domain types
type Event = {
  id: string
  timestamp: number
  type: string
  payload: unknown
}

type UserCreatedEvent = Event & {
  type: "UserCreated"
  payload: {
    id: string
    name: string
    email: string
  }
}

type UserUpdatedEvent = Event & {
  type: "UserUpdated"
  payload: {
    id: string
    name?: string
    email?: string
  }
}

type ItemAddedToCartEvent = Event & {
  type: "ItemAddedToCart"
  payload: {
    userId: string
    productId: string
    quantity: number
  }
}

type ItemRemovedFromCartEvent = Event & {
  type: "ItemRemovedFromCart"
  payload: {
    userId: string
    productId: string
  }
}

type CheckoutCompletedEvent = Event & {
  type: "CheckoutCompleted"
  payload: {
    userId: string
    total: number
  }
}

// Type guard functions
const isUserCreated = (event: Event): event is UserCreatedEvent => event.type === "UserCreated"

const isUserUpdated = (event: Event): event is UserUpdatedEvent => event.type === "UserUpdated"

const isItemAddedToCart = (event: Event): event is ItemAddedToCartEvent => event.type === "ItemAddedToCart"

const isItemRemovedFromCart = (event: Event): event is ItemRemovedFromCartEvent => event.type === "ItemRemovedFromCart"

const isCheckoutCompleted = (event: Event): event is CheckoutCompletedEvent => event.type === "CheckoutCompleted"

// User state derived from events
type User = {
  id: string
  name: string
  email: string
  cart: Map<string, number> // productId -> quantity
  checkoutHistory: List<{
    timestamp: number
    total: number
  }>
}

// Event store
class EventStore {
  private events: List<Event> = List([])

  append(event: Event): void {
    this.events = this.events.add(event)
  }

  appendMany(events: Event[]): void {
    this.events = this.events.concat(List(events))
  }

  getAllEvents(): List<Event> {
    return this.events
  }

  getEventsByUserId(userId: string): List<Event> {
    return this.events.filter((event) => {
      if (isUserCreated(event) || isUserUpdated(event)) {
        return (event.payload as { id: string }).id === userId
      }
      if (isItemAddedToCart(event) || isItemRemovedFromCart(event) || isCheckoutCompleted(event)) {
        return (event.payload as { userId: string }).userId === userId
      }
      return false
    })
  }
}

// User projection
class UserProjection {
  getUserState(userId: string, events: List<Event>): Option<User> {
    // Filter events for this user
    const userEvents = events.filter((event) => {
      if (isUserCreated(event) || isUserUpdated(event)) {
        return (event.payload as { id: string }).id === userId
      }
      if (isItemAddedToCart(event) || isItemRemovedFromCart(event) || isCheckoutCompleted(event)) {
        return (event.payload as { userId: string }).userId === userId
      }
      return false
    })

    // Find user creation event
    const creationEvent = userEvents.find(isUserCreated)

    if (creationEvent.isEmpty()) {
      return Option(null) // User not found
    }

    // Initial state from creation event
    let user: User = {
      id: creationEvent.get().payload.id,
      name: creationEvent.get().payload.name,
      email: creationEvent.get().payload.email,
      cart: Map<string, number>({}),
      checkoutHistory: List([]),
    }

    // Apply all other events in order
    const remainingEvents = userEvents.filter((e) => e.id !== creationEvent.get().id)

    return Option(
      remainingEvents.foldLeft(user)((state, event) => {
        if (isUserUpdated(event)) {
          return {
            ...state,
            name: event.payload.name ?? state.name,
            email: event.payload.email ?? state.email,
          }
        }

        if (isItemAddedToCart(event)) {
          return {
            ...state,
            cart: state.cart.add(event.payload.productId, event.payload.quantity),
          }
        }

        if (isItemRemovedFromCart(event)) {
          return {
            ...state,
            cart: state.cart.remove(event.payload.productId),
          }
        }

        if (isCheckoutCompleted(event)) {
          return {
            ...state,
            cart: Map<string, number>({}), // Clear cart
            checkoutHistory: state.checkoutHistory.add({
              timestamp: event.timestamp,
              total: event.payload.total,
            }),
          }
        }

        return state
      }),
    )
  }
}

// Usage example
const eventStore = new EventStore()
const userProjection = new UserProjection()

// Create some events
const events: Event[] = [
  {
    id: "e1",
    timestamp: Date.now() - 5000,
    type: "UserCreated",
    payload: {
      id: "user1",
      name: "John Doe",
      email: "john@example.com",
    },
  },
  {
    id: "e2",
    timestamp: Date.now() - 4000,
    type: "ItemAddedToCart",
    payload: {
      userId: "user1",
      productId: "product1",
      quantity: 2,
    },
  },
  {
    id: "e3",
    timestamp: Date.now() - 3500,
    type: "ItemAddedToCart",
    payload: {
      userId: "user1",
      productId: "product2",
      quantity: 1,
    },
  },
  {
    id: "e4",
    timestamp: Date.now() - 3000,
    type: "ItemRemovedFromCart",
    payload: {
      userId: "user1",
      productId: "product1",
    },
  },
  {
    id: "e5",
    timestamp: Date.now() - 2000,
    type: "CheckoutCompleted",
    payload: {
      userId: "user1",
      total: 29.99,
    },
  },
  {
    id: "e6",
    timestamp: Date.now() - 1000,
    type: "UserUpdated",
    payload: {
      id: "user1",
      email: "john.doe@example.com",
    },
  },
]

// Add events to store
eventStore.appendMany(events)

// Get user state
const userState = userProjection.getUserState("user1", eventStore.getAllEvents())

userState.fold(
  () => console.log("User not found"),
  (user) => {
    console.log("User:", user.name, user.email)
    console.log("Cart items:", user.cart.size())
    console.log("Checkout history:", user.checkoutHistory.size(), "orders")
    console.log("Latest order total:", user.checkoutHistory.head().getOrElse({ total: 0 }).total)
  },
)
```

These examples cover a wide range of use cases and demonstrate how to use Functype effectively in real-world applications. Feel free to adapt them to your specific needs!
