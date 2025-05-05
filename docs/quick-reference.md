# Functype Quick Reference

## Option<T>

```typescript
import { Option, Some, None } from "functype/option"

// Creation
Option(42)                     // Some(42)
Option(null)                   // None
Option(undefined)              // None
Some(42)                       // Some(42)
None()                         // None
Option.from(42)                // Some(42)
Option.none()                  // None

// Checking
option.isDefined()             // true if Some, false if None
option.isEmpty()               // true if None, false if Some

// Accessing
option.get()                   // Gets value or throws if None
option.getOrElse(defaultValue) // Gets value or returns default
option.getOrElseThrow(new Error("No value"))  // Gets value or throws custom error

// Transforming
option.map(x => x * 2)         // Transforms inner value
option.flatMap(x => Option(x.toString()))  // Chains with operations returning Option
option.filter(x => x > 10)     // None if predicate fails, unchanged if passes

// Pattern matching
option.fold(
  () => "empty",               // Called for None
  value => `value: ${value}`   // Called for Some
)

option.match({
  Some: value => `value: ${value}`,
  None: () => "empty"
})
```

## Either<L, R>

```typescript
import { Either, Left, Right } from "functype/either"

// Creation
Right<string, number>(42)     // Right<number>(42)
Left<string, number>("error") // Left<string>("error")
Either.right(42)              // Right(42)
Either.left("error")          // Left("error")
Either.fromNullable(value, "was null")  // Left if null/undefined

// Checking
either.isRight()               // true if Right, false if Left
either.isLeft()                // true if Left, false if Right

// Accessing
either.get()                   // Gets Right value or throws if Left
either.getOrElse(defaultValue) // Gets Right value or returns default
either.getLeft()               // Gets Left value or throws if Right

// Transforming
either.map(x => x * 2)         // Transforms Right value
either.mapLeft(e => `Error: ${e}`)  // Transforms Left value
either.flatMap(x => Right(x.toString()))  // Chains with operations returning Either
either.filter(
  x => x > 10,
  x => `${x} is too small`
)                              // Left if predicate fails

// Operations
either.swap()                  // Converts Left to Right and vice versa

// Pattern matching
either.fold(
  left => `Error: ${left}`,
  right => `Success: ${right}`
)

either.match({
  Right: value => `Success: ${value}`,
  Left: error => `Error: ${error}`
})
```

## Try<T>

```typescript
import { Try, Success, Failure } from "functype/try"

// Creation
Try(() => 42)                  // Success(42)
Try(() => { throw new Error("Failed") })  // Failure(Error)
Success(42)                    // Success(42)
Failure(new Error("Failed"))   // Failure(Error)

// Checking
tryVal.isSuccess()             // true if Success, false if Failure
tryVal.isFailure()             // true if Failure, false if Success

// Accessing
tryVal.get()                   // Gets value or throws original error
tryVal.getOrElse(defaultValue) // Gets value or returns default
tryVal.error                   // Gets error for Failure

// Error handling
tryVal.recover(defaultValue)   // Success with original value or default
tryVal.recoverWith(() => Try(() => backup()))  // Tries alternative computation on failure

// Transforming
tryVal.map(x => x * 2)         // Maps success value
tryVal.flatMap(x => Try(() => operation(x)))  // Chains with operations returning Try

// Conversions
tryVal.toOption()              // Option.Some for Success, Option.None for Failure
tryVal.toEither()              // Either.Right for Success, Either.Left for Failure

// Pattern matching
tryVal.fold(
  error => `Error: ${error.message}`,
  value => `Success: ${value}`
)

tryVal.match({
  Success: value => `Success: ${value}`,
  Failure: error => `Error: ${error.message}`
})
```

## List<T>

```typescript
import { List } from "functype/list"

// Creation
List([1, 2, 3])                // List([1, 2, 3])
List.empty<number>()           // List([])

// Properties
list.isEmpty()                 // true if empty, false otherwise
list.size()                    // Number of elements

// Accessing
list.head()                    // Option.Some with first element or None if empty
list.tail()                    // List with all elements except the first
list.at(2)                     // Option.Some with element at index or None

// Adding/removing
list.add(4)                    // New list with element added
list.addAll([4, 5, 6])         // New list with elements added
list.remove(2)                 // New list with element removed
list.removeAt(1)               // New list with element at index removed

// Transforming
list.map(x => x * 2)           // List with transformed elements
list.flatMap(x => List([x, x * 2]))  // Transform + flatten
list.filter(x => x % 2 === 0)  // List with elements matching predicate

// Slicing
list.take(2)                   // First n elements
list.drop(2)                   // All elements after first n
list.slice(1, 3)               // Elements from start to end (exclusive)

// Finding
list.find(x => x > 10)         // Option.Some with first match or None
list.exists(x => x > 10)       // true if any element matches predicate
list.forAll(x => x > 0)        // true if all elements match predicate
list.count(x => x % 2 === 0)   // Count of elements matching predicate

// Aggregating
list.foldLeft(0)((acc, x) => acc + x)  // Reduce from left to right
list.foldRight(0)((x, acc) => x + acc)  // Reduce from right to left
list.reduce((a, b) => a + b)   // Reduce (without initial value)

// Operations
list.reverse()                 // Reversed list
list.sort((a, b) => a - b)     // Sorted list
list.distinct()                // List with duplicates removed
list.concat(List([4, 5, 6]))   // Lists combined
list.groupBy(x => x % 2 === 0 ? 'even' : 'odd')  // Map of grouped elements
```

## Map<K, V>

```typescript
import { Map } from "functype/map"

// Creation
Map({ a: 1, b: 2, c: 3 })      // Map({a: 1, b: 2, c: 3})
Map.empty<string, number>()    // Empty map

// Properties
map.isEmpty()                  // true if empty
map.size()                     // Number of entries
map.has('a')                   // true if key exists

// Accessing
map.get('a')                   // Option.Some with value or None
map.getOrElse('a', 0)          // Value or default
map.keys()                     // List of keys
map.values()                   // List of values
map.entries()                  // List of [key, value] tuples

// Modifying
map.add('d', 4)                // New map with entry added
map.addAll({ d: 4, e: 5 })     // New map with entries added
map.remove('a')                // New map with key removed
map.removeAll(['a', 'b'])      // New map with keys removed

// Transforming
map.map(v => v * 2)            // Map with transformed values
map.mapEntries(([k, v]) => [`key_${k}`, v * 2])  // Transform both keys and values
map.filter(v => v > 1)         // Map with entries matching predicate
map.filterKeys(k => k !== 'a') // Map with entries having keys matching predicate

// Operations
map.merge(Map({ c: 30, d: 40 }))  // Maps combined (right values override)
map.mergeWith(
  Map({ c: 30, d: 40 }),
  (v1, v2) => v1 + v2
)                              // Maps combined with custom function

// Conversions
map.toObject()                 // Standard JS object
```

## Set<T>

```typescript
import { Set } from "functype/set"

// Creation
Set([1, 2, 3])                 // Set([1, 2, 3])
Set.empty<number>()            // Empty set

// Properties
set.isEmpty()                  // true if empty
set.size()                     // Number of elements
set.has(2)                     // true if element exists

// Modifying
set.add(4)                     // New set with element added
set.addAll([4, 5])             // New set with elements added
set.remove(2)                  // New set with element removed
set.removeAll([1, 2])          // New set with elements removed

// Transforming
set.map(x => x * 2)            // Set with transformed elements
set.flatMap(x => Set([x, x + 1]))  // Transform + flatten
set.filter(x => x % 2 === 0)   // Set with elements matching predicate

// Set operations
set.union(Set([3, 4, 5]))      // Union of sets
set.intersect(Set([2, 3, 4]))  // Intersection of sets
set.difference(Set([3, 4]))    // Elements in this set but not in other
set.symmetricDifference(Set([3, 4]))  // Elements in either set but not both
set.isSubsetOf(Set([1, 2, 3, 4]))  // true if all elements in other set
```

## FPromise<T, E>

```typescript
import { FPromise } from "functype/fpromise"

// Creation
FPromise.resolve(42)           // Resolves with value
FPromise.reject(new Error())   // Rejects with error
FPromise.fromPromise(fetch('/api'))  // From standard Promise

// From functions
FPromise.tryCatch(
  () => JSON.parse(data),
  err => new Error(`Parse error: ${err}`)
)

FPromise.tryCatchAsync(
  async () => await fetch('/api').then(r => r.json()),
  err => new Error(`Fetch error: ${err}`)
)

// Transforming
promise.map(x => x * 2)        // Transform success value
promise.mapError(e => new Error(`Enhanced: ${e}`))  // Transform error
promise.flatMap(x => FPromise.resolve(x.toString()))  // Chain with another FPromise

// Error handling
promise.recover(defaultValue)  // Default if rejected
promise.recoverWith(err => FPromise.resolve(`Recovered from ${err}`))  // Alternative promise on error

// Side effects
promise.tap(value => console.log(value))  // Side effect on success
promise.tapError(err => console.error(err))  // Side effect on error

// Combining
FPromise.all([p1, p2, p3])     // All promises succeed
FPromise.race([p1, p2])        // First to resolve
FPromise.any([p1, p2])         // First to resolve successfully

// Timeouts
FPromise.timeout(
  promise,
  1000,
  () => new Error("Timed out")
)                             // Rejects if promise takes too long

// Pattern matching
promise.fold(
  err => `Error: ${err}`,
  val => `Success: ${val}`
)                             // Handle both outcomes

// Conversion
promise.toPromise()           // Convert to standard Promise
```

## Task

```typescript
import { Task } from "functype/core/task"

// Synchronous tasks
const syncTask = Task().Sync(
  () => 42,
  err => new Error(`Failed: ${err}`)
)

// Asynchronous tasks
const asyncTask = Task().Async(
  async () => await fetch('/api').then(r => r.json()),
  async err => new Error(`Fetch failed: ${err}`)
)

// Named tasks (for debugging)
const namedTask = Task({ name: "UserFetch" }).Sync(
  () => ({ id: 1, name: "John" }),
  err => new Error(`User fetch failed: ${err}`)
)

// Adapting functions
const fetchAPI = (id: string): Promise<User> => fetch(`/api/users/${id}`).then(r => r.json())
const getUser = Task({ name: "UserFetch" }).fromPromise(fetchAPI)

// Usage (promise-like)
syncTask
  .then(value => console.log(value))  // 42
  .catch(err => console.error(err))

// Converting
const promise = Task().toPromise(syncTask)  // Standard Promise
```

## Tuple

```typescript
import { Tuple } from "functype/tuple"

// Creation
const pair = Tuple(42, "hello")
const triple = Tuple(true, 42, "hello")

// Accessing
pair.first()                   // 42
pair.second()                  // "hello"
triple.third()                 // "hello"
pair.toArray()                 // [42, "hello"]

// Transforming
pair.mapFirst(x => x * 2)      // Tuple(84, "hello")
pair.mapSecond(s => s.toUpperCase())  // Tuple(42, "HELLO")
pair.map(([a, b]) => [a * 2, b.toUpperCase()]) // Tuple(84, "HELLO")

// Operations
pair.swap()                    // Tuple("hello", 42)
pair.apply((a, b) => a + b.length)  // 47

// Combining
pair.concat(Tuple(true))       // Tuple(42, "hello", true)
```

## Branded Types

```typescript
import { Brand } from "functype/branded"

// Type definitions
type UserId = Brand<string, "UserId">
type Email = Brand<string, "Email">
type PositiveInt = Brand<number, "PositiveInt">

// Factory functions with validation
const UserId = (id: string): UserId => {
  if (!/^U\d{6}$/.test(id)) throw new Error("Invalid ID format")
  return id as UserId
}

const PositiveInt = (n: number): PositiveInt => {
  if (!Number.isInteger(n) || n <= 0) throw new Error("Not a positive integer")
  return n as PositiveInt
}

// Usage
function getUserById(id: UserId): User { /* ... */ }

// Type-safe calls
getUserById(UserId("U123456"))  // Works
// getUserById("U123456")       // Type error: string is not UserId
```

## Pattern Matching

```typescript
import { Option, Either, Try, List, MatchableUtils } from "functype"

// Built-in pattern matching
option.match({
  Some: value => `Found: ${value}`,
  None: () => "Not found"
})

either.match({
  Right: value => `Success: ${value}`,
  Left: error => `Error: ${error}`
})

list.match({
  NonEmpty: values => `Values: ${values.join(", ")}`,
  Empty: () => "No values"
})

// Custom pattern matching
const isPositive = MatchableUtils.when(
  (n: number) => n > 0,
  n => `Positive: ${n}`
)

const isZero = MatchableUtils.when(
  (n: number) => n === 0,
  () => "Zero"
)

const isNegative = MatchableUtils.when(
  (n: number) => n < 0,
  n => `Negative: ${n}`
)

const defaultCase = MatchableUtils.default(
  (x: number) => `Default: ${x}`
)

// Chain patterns with fallbacks
isPositive(42) ?? isZero(42) ?? isNegative(42) ?? defaultCase(42)  // "Positive: 42"
```

## Common Conversions

```typescript
import { Option, Either, Try, List, FoldableUtils } from "functype"

// Convert between types
FoldableUtils.toList(Option(42))          // List([42])
FoldableUtils.toList(Either.right(42))    // List([42])
FoldableUtils.toList(Try(() => 42))       // List([42])

FoldableUtils.toOption(List([1, 2, 3]))   // Some(1)
FoldableUtils.toOption(Either.right(42))  // Some(42)
FoldableUtils.toOption(Try(() => 42))     // Some(42)

FoldableUtils.toEither(Option(42), "Empty")  // Right(42)
FoldableUtils.toEither(Try(() => 42), "Failed")  // Right(42)

// Built-in conversions
option.toEither("No value")     // Either.Right or Either.Left
either.toOption()               // Option.Some or Option.None
tryVal.toEither()               // Either.Right or Either.Left with error
tryVal.toOption()               // Option.Some or Option.None
```

## Functional Composition

```typescript
import { pipe } from "functype/pipe"

// Pipe operations for cleaner sequential transformations
const result = pipe(
  Option("42"),
  opt => opt.map(s => s.trim()),
  opt => opt.map(s => parseInt(s, 10)),
  opt => opt.filter(n => !isNaN(n)),
  opt => opt.map(n => n * 2),
  opt => opt.getOrElse(0)
)  // 84

// Cross-type transformations
const mixed = pipe(
  Option("42"),
  opt => opt.map(s => parseInt(s, 10)),
  opt => opt.toEither("Invalid number"),
  e => e.map(n => n * 2),
  e => e.fold(
    err => `Error: ${err}`,
    val => `Result: ${val}`
  )
)  // "Result: 84"
```