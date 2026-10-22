# Functype Quick Reference

## Option<T>

```typescript
import { Option, Some, None } from "functype/option"

// Creation
Option(42) // Some(42)
Option(null) // None
Option(undefined) // None
Some(42) // Some(42)
None() // None
Option.from(42) // Some(42)
Option.none() // None

// Checking
option.isSome() // true if Some, false if None
option.isNone() // true if None, false if Some
option.isEmpty // same as isNone(), as a property

// Accessing
option.orThrow() // Gets value or throws if None
option.orElse(defaultValue) // Gets value or returns default
option.orThrow(new Error("No value")) // Gets value or throws custom error

// Transforming
option.map((x) => x * 2) // Transforms inner value
option.flatMap((x) => Option(x.toString())) // Chains with operations returning Option
option.filter((x) => x > 10) // None if predicate fails, unchanged if passes

// Pattern matching
option.fold(
  () => "empty", // Called for None
  (value) => `value: ${value}`, // Called for Some
)

option.match({
  Some: (value) => `value: ${value}`,
  None: () => "empty",
})
```

## Either<L, R>

```typescript
import { Either, Left, Right } from "functype/either"

// Creation
Right<string, number>(42) // Right<number>(42)
Left<string, number>("error") // Left<string>("error")
Either.right(42) // Right(42)
Either.left("error") // Left("error")
Either.fromNullable(value, "was null") // Left if null/undefined

// Checking
either.isRight() // true if Right, false if Left
either.isLeft() // true if Left, false if Right

// Accessing
either.orThrow() // Gets Right value or throws if Left
either.orElse(defaultValue) // Gets Right value or returns default
either.swap().orThrow() // Gets Left value or throws if Right

// Transforming
either.map((x) => x * 2) // Transforms Right value
either.mapLeft((e) => `Error: ${e}`) // Transforms Left value
either.flatMap((x) => Right(x.toString())) // Chains with operations returning Either
either.filterOrElse(
  (x) => x > 10,
  (x) => `${x} is too small`,
) // Left if predicate fails

// Operations
either.swap() // Converts Left to Right and vice versa

// Pattern matching
either.fold(
  (left) => `Error: ${left}`,
  (right) => `Success: ${right}`,
)

either.match({
  Right: (value) => `Success: ${value}`,
  Left: (error) => `Error: ${error}`,
})
```

## Try<T>

```typescript
import { Try } from "functype/try"

// Creation
Try(() => 42) // Success(42)
Try(() => {
  throw new Error("Failed")
}) // Failure(Error)
Try.success(42) // Success(42)
Try.failure(new Error("Failed")) // Failure(Error)

// Checking
tryVal.isSuccess() // true if Success, false if Failure
tryVal.isFailure() // true if Failure, false if Success

// Accessing
tryVal.orThrow() // Gets value or throws original error
tryVal.orElse(defaultValue) // Gets value or returns default
tryVal.error // Gets error for Failure

// Error handling
tryVal.recover(() => defaultValue) // Success with original value or default
tryVal.recoverWith(() => Try(() => backup())) // Tries alternative computation on failure

// Transforming
tryVal.map((x) => x * 2) // Maps success value
tryVal.flatMap((x) => Try(() => operation(x))) // Chains with operations returning Try

// Conversions
tryVal.toOption() // Option.Some for Success, Option.None for Failure
tryVal.toEither((error) => error.message) // Either.Right for Success, Either.Left for Failure

// Pattern matching
tryVal.fold(
  (error) => `Error: ${error.message}`,
  (value) => `Success: ${value}`,
)

tryVal.match({
  Success: (value) => `Success: ${value}`,
  Failure: (error) => `Error: ${error.message}`,
})
```

## List<T>

```typescript
import { List } from "functype/list"

// Creation
List([1, 2, 3]) // List([1, 2, 3])
List.empty<number>() // List([])

// Properties
list.isEmpty // true if empty, false otherwise
list.size // Number of elements

// Accessing
list.headOption // Option.Some with first element or None if empty
list.head // First element, or undefined if empty
list.tail // List with all elements except the first
list.get(2) // Option.Some with element at index or None

// Adding/removing
list.add(4) // New list with element added
list.concat(List([4, 5, 6])) // New list with elements added
list.remove(2) // New list with the value 2 removed
list.removeAt(1) // New list with element at index removed

// Transforming
list.map((x) => x * 2) // List with transformed elements
list.flatMap((x) => List([x, x * 2])) // Transform + flatten
list.filter((x) => x % 2 === 0) // List with elements matching predicate

// Slicing
list.take(2) // First n elements
list.drop(2) // All elements after first n
list.slice(1, 3) // Elements from start to end (exclusive)

// Finding
list.find((x) => x > 10) // Option.Some with first match or None
list.exists((x) => x > 10) // true if any element matches predicate
!list.exists((x) => !(x > 0)) // true if all elements match predicate (List has no forAll)
list.partition((x) => x > 0) // [matching, rest]
list.count((x) => x % 2 === 0) // Count of elements matching predicate

// Aggregating
list.foldLeft(0)((acc, x) => acc + x) // Reduce from left to right
list.foldRight(0)((x, acc) => x + acc) // Reduce from right to left
list.reduce((a, b) => a + b) // Reduce (without initial value)

// Operations
list.reverse() // Reversed list
list.sorted((a, b) => a - b) // Sorted list
list.sortBy((x) => -x) // Sorted by a key
list.distinct() // List with duplicates removed
list.concat(List([4, 5, 6])) // Lists combined
list.groupBy((x) => (x % 2 === 0 ? "even" : "odd")) // native Map of key to List
```

## Map<K, V>

```typescript
import { Map } from "functype/map"
import { Option } from "functype/option"
import { Tuple } from "functype/tuple"

// Creation
Map([
  ["a", 1],
  ["b", 2],
]) // From [key, value] pairs
Map.of<string, number>(["a", 1], ["b", 2]) // Variadic
Map.empty<string, number>() // Empty map

// Properties (getters, not calls)
map.isEmpty // true if empty
map.size // Number of entries

// Accessing
map.has("a") // true if the key is present, even when its value is undefined
map.get("a") // Some(value) or None
map.getOrElse("a", 0) // Value or default
map.orElse("a", Option(0)) // Option of the value, or the alternative Option
map.keys() // List<K>, insertion order
map.values() // List<V>, insertion order
map.contains(Tuple(["a", 1])) // true if that exact entry is present (value compared with ===)
map.toList() // List of Tuple<[K, V]> entries
for (const [k, v] of map) {
} // Iterates [key, value] pairs

// Modifying (each returns a new Map)
map.add(Tuple(["d", 4])) // Entry added or replaced; add takes one Tuple
map.remove("a") // Key removed

// Transforming
map.map((v) => v * 2) // Values transformed, keys kept
map.flatMap((entry) => [[`key_${entry.get(0)}`, entry.get(1)]]) // Entries to new [key, value] pairs
map.fold(0, (acc, entry) => acc + entry.get(1)) // Fold over Tuple entries

// Conversions
map.toValue() // { _tag: "Map", value: [K, V][] }
map.toSet() // Set of Tuple<[K, V]> entries
```

## Set<T>

```typescript
import { Set } from "functype/set"

// Creation
Set([1, 2, 3]) // Set([1, 2, 3])
Set.empty<number>() // Empty set

// Properties
set.isEmpty // true if empty
set.size // Number of elements
set.has(2) // true if element exists

// Modifying
set.add(4) // New set with element added
set.remove(2) // New set with element removed

// Transforming
set.map((x) => x * 2) // Set with transformed elements
set.flatMap((x) => Set([x, x + 1])) // Transform + flatten
set.filter((x) => x % 2 === 0) // Set with elements matching predicate

// Set operations: there is no union/intersection method yet, so build them from the basics
const other = Set([3, 4, 5])
Set([...set, ...other]) // Union
set.filter((x) => other.has(x)) // Intersection
set.filter((x) => !other.has(x)) // Elements in this set but not in other
Set([...set.filter((x) => !other.has(x)), ...other.filter((x) => !set.has(x))]) // In either set but not both
!set.exists((x) => !other.has(x)) // true if this set is a subset of other
```

## Task

```typescript
import { Task } from "functype/task"

// Synchronous tasks return a TaskOutcome (Ok or Err)
const syncTask = Task().Sync(
  () => 42,
  (err) => new Error(`Failed: ${String(err)}`),
)

// Asynchronous tasks return a Promise of a TaskOutcome
const asyncTask = Task().Async(
  async () => (await fetch("/api").then((r) => r.json())) as unknown,
  (err) => new Error(`Fetch failed: ${String(err)}`),
)

// Named tasks (for debugging and error identification)
const namedTask = Task({ name: "UserFetch" }).Sync(
  () => ({ id: 1, name: "John" }),
  (err) => new Error(`User fetch failed: ${String(err)}`),
)

// A throw becomes an Err; the outcome carries the task name
const outcome = await Task({ name: "DataProcessor" }).Async(() => {
  throw new Error("Processing failed")
})
outcome.fold(
  (error) => `Failed: ${error.message}`,
  (value) => `Done: ${String(value)}`,
)

// Companion functions
Task.success(42, { name: "SuccessResult" }) // Ok outcome
Task.fail(new Error("Failed"), data, { name: "FailureResult" }) // Err outcome with a name

// Adapting functions
const fetchAPI = (id: string): Promise<User> => fetch(`/api/users/${id}`).then((r) => r.json() as Promise<User>)
const getUser = Task.fromPromise(fetchAPI, { name: "UserFetch" })

// Converting
const promise = Task.toPromise(syncTask) // Standard Promise
```

## Tuple

```typescript
import { Tuple } from "functype/tuple"

// Creation: Tuple takes an array
const pair = Tuple([42, "hello"] as [number, string])
const triple = Tuple.triple(true, 42, "hello")
Tuple.pair("key", 42) // Tuple<[string, number]>
Tuple.of(1, "a", true) // Tuple<[number, string, boolean]>

// Accessing
pair.get(0) // 42
pair.get(1) // "hello"
triple.get(2) // "hello"
pair.length // 2
pair.toArray() // [42, "hello"]
const [n, s] = pair // destructures like an array (elements typed as the union)
pair.get(0) + pair.get(1).length // 47: use the parts directly (there is no apply)

// Transforming: map and flatMap receive the whole array
pair.map(([a, b]) => [a * 2, b.toUpperCase()] as [number, string]) // Tuple([84, "HELLO"])
pair.map(([a, b]) => [b, a] as [string, number]) // swap: Tuple(["hello", 42])
pair.flatMap(([a, b]) => Tuple([a, b, true] as [number, string, boolean])) // Tuple([42, "hello", true])

// Folding over the elements
pair.fold("", (acc, x) => acc + String(x)) // "42hello"
```

## Branded Types

```typescript
import { Brand } from "functype/branded"

// Type definitions
type UserId = Brand<"UserId", string>
type Email = Brand<"Email", string>
type PositiveInt = Brand<"PositiveInt", number>

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
declare function getUserById(id: UserId): User

// Type-safe calls
getUserById(UserId("U123456")) // Works
// getUserById("U123456")       // Type error: string is not UserId
```

## Pattern Matching

```typescript
import { Option, Either, Try, List, MatchableUtils } from "functype"

// Built-in pattern matching
option.match({
  Some: (value) => `Found: ${value}`,
  None: () => "Not found",
})

either.match({
  Right: (value) => `Success: ${value}`,
  Left: (error) => `Error: ${error}`,
})

list.match({
  NonEmpty: (values) => `Values: ${values.join(", ")}`,
  Empty: () => "No values",
})

// Custom pattern matching
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

const defaultCase = MatchableUtils.default((x: number) => `Default: ${x}`)

// Chain patterns with fallbacks
isPositive(42) ?? isZero(42) ?? isNegative(42) ?? defaultCase(42) // "Positive: 42"
```

## Http

```typescript
import { Http, HttpErrors } from "functype/fetch"
import { IO } from "functype/io"

// Without validator — data is unknown
const effect = Http.get("/api/users") // IO<never, HttpError, HttpResponse<unknown>>

// With validator — T inferred from validate return type (BYOV: bring your own validator)
const users = Http.get("/api/users", {
  validate: (data) => z.array(UserSchema).parse(data),
}) // IO<never, HttpError, HttpResponse<User[]>>

const created = Http.post("/api/users", {
  body: { name: "Alice" },
  validate: (data) => UserSchema.parse(data),
}) // IO<never, HttpError, HttpResponse<User>>

// Configured client
const http = Http.client({
  baseUrl: "https://api.example.com",
  defaultHeaders: { Authorization: "Bearer token" },
})
const user = http.get("/users/1", { validate: (data) => UserSchema.parse(data) })

// Configured client with effectful request transformer (auth refresh, request IDs, logging)
const api = Http.client({
  baseUrl: "https://api.example.com",
  beforeRequest: (r) =>
    IO.succeed(r)
      .map((req) => ({ ...req, headers: { ...req.headers, "x-request-id": crypto.randomUUID() } }))
      .flatMap((req) =>
        IO.tryPromise({
          try: () => getToken(),
          catch: (e) => HttpErrors.networkError(req.url, req.method, e),
        }).map((token) => ({ ...req, headers: { ...req.headers, Authorization: `Bearer ${token}` } })),
      )
      .tap((req) => logger.info(req.method, req.url)),
})

// Compose with IO
Http.get("/api/users", { validate: (data) => z.array(UserSchema).parse(data) })
  .map((res) => res.data.filter((u) => u.active))
  .retry(3)
  .timeout(5000)

// Error handling
Http.get("/api/users/1", { validate: (data) => UserSchema.parse(data) })
  .catchTag("HttpStatusError", (e) => (e.status === 404 ? IO.succeed(defaultResponse) : IO.fail(e)))
  .catchTag("NetworkError", () => IO.succeed(cachedResponse))

// Run
await Http.get("/api/users/1", { validate: (data) => UserSchema.parse(data) }).runOrThrow() // HttpResponse<User>
await Http.get("/api/users/1").run() // Either<HttpError, HttpResponse<unknown>>
```

## Common Conversions

```typescript
import { Option, Either, Try, List, FoldableUtils } from "functype"

// Convert between types
FoldableUtils.toList(Option(42)) // List([42])
FoldableUtils.toList(Either.right(42)) // List([42])
FoldableUtils.toList(Try(() => 42)) // List([42])

List([1, 2, 3]).headOption // Some(1): a List is not a sum type, so take its head
FoldableUtils.toOption(Either.right(42)) // Some(42)
FoldableUtils.toOption(Try(() => 42)) // Some(42)

FoldableUtils.toEither(Option(42), "Empty") // Right(42)
FoldableUtils.toEither(
  Try(() => 42),
  "Failed",
) // Right(42)

// Built-in conversions
option.toEither("No value") // Either.Right or Either.Left
either.toOption() // Option.Some or Option.None
tryVal.toEither((error) => error) // Either.Right, or Either.Left with the error
tryVal.toOption() // Option.Some or Option.None
```

## Functional Composition

```typescript
import { Option } from "functype/option"

// Method chaining is the pipeline: each step returns a new container
const result = Option("42")
  .map((s) => s.trim())
  .map((s) => parseInt(s, 10))
  .filter((n) => !isNaN(n))
  .map((n) => n * 2)
  .orElse(0) // 84

// Cross-type transformations
const mixed = Option("42")
  .map((s) => parseInt(s, 10))
  .toEither("Invalid number")
  .map((n) => n * 2)
  .fold(
    (err) => `Error: ${err}`,
    (val) => `Result: ${val}`,
  ) // "Result: 84"
```

## Companion Pattern

All major types in functype use the Companion pattern for consistent API design:

```typescript
import { Option, Either, List, Try } from "functype"

// Constructor function usage
const opt = Option(42) // Constructor
const list = List([1, 2, 3]) // Constructor
const right = Either.right(42) // Companion method

// Companion methods (static methods)
Option.from(value) // Alias for constructor
Option.none<number>() // Create empty instance
Either.left<Error, number>(err) // Create Left
Either.right<Error, number>(42) // Create Right
List.fromJSON(jsonString) // Deserialize from JSON
Try.fromJSON(jsonString) // Deserialize from JSON

// Type guards as companion methods
if (Option.isSome(option)) {
  // TypeScript knows option.value is defined
  console.log(option.value)
}

if (Either.isRight(either)) {
  // TypeScript knows either has Right value
  console.log(either.value)
}

if (Try.isSuccess(tryValue)) {
  // TypeScript knows tryValue succeeded
  console.log(tryValue.orThrow())
}
```

## Type Guards

Use static type guards for better type narrowing:

```typescript
import { Option, Either, Try } from "functype"

// Option type guards
const option: Option<number> = Option(42)

if (Option.isSome(option)) {
  option.value // TypeScript knows: number (not number | undefined)
}

if (Option.isNone(option)) {
  // option.value is undefined here
}

// Either type guards
const either: Either<Error, number> = Either.right(42)

if (Either.isRight(either)) {
  either.value // TypeScript knows: number
}

if (Either.isLeft(either)) {
  either.value // TypeScript knows: Error
}

// Try type guards
const tryValue: Try<number> = Try(() => 42)

if (Try.isSuccess(tryValue)) {
  tryValue.error // TypeScript knows: undefined
}

if (Try.isFailure(tryValue)) {
  tryValue.error // TypeScript knows: Error
}
```

## Serialization

All major types support JSON/YAML/Binary serialization:

```typescript
import { Option, Either, List, Try } from "functype"

// Serialize to different formats
const option = Option(42)
const serialized = option.serialize()

const json = serialized.toJSON() // '{"_tag":"Some","value":42}'
const yaml = serialized.toYAML() // '_tag: Some\nvalue: 42'
const binary = serialized.toBinary() // Base64 encoded

// Deserialize from JSON
const opt1 = Option.fromJSON<number>('{"_tag":"Some","value":42}')
const opt2 = Option.fromYAML<number>("_tag: Some\nvalue: 42")
const opt3 = Option.fromBinary<number>(binary)

// Works with all types
const list = List([1, 2, 3])
const listJson = list.serialize().toJSON()
const restored = List.fromJSON<number>(listJson)

const either = Either.right<Error, number>(42)
const eitherJson = either.serialize().toJSON()
const restoredEither = Either.fromJSON<Error, number>(eitherJson)
```

## Custom Companion Types

Create your own types using the Companion pattern:

```typescript
import { Companion } from "functype/companion"

// 1. Define interface
interface Box<T> {
  value: T
  map: <U>(f: (v: T) => U) => Box<U>
  get: () => T
}

// 2. Constructor function
const BoxConstructor = <T>(value: T): Box<T> => ({
  value,
  map: <U>(f: (v: T) => U) => BoxConstructor(f(value)),
  get: () => value,
})

// 3. Companion object with static methods
const BoxCompanion = {
  of: <T>(value: T) => BoxConstructor(value),
  empty: <T>() => BoxConstructor(undefined as T),
}

// 4. Combine using Companion
export const Box = Companion(BoxConstructor, BoxCompanion)

// Usage
const box1 = Box(10) // Constructor
const box2 = Box.of(20) // Companion method
const box3 = Box.empty<number>()

box1.map((x) => x * 2).get() // 20
```

## Companion Helper Types

Work with Companion objects using helper types:

```typescript
import { Companion, type CompanionMethods, type InstanceType, isCompanion } from "functype/companion"
import { Option } from "functype/option"

// Companion type of a constructor (today this includes the call signature, not only the static methods)
type OptionMethods = CompanionMethods<typeof Option>

// Extract instance type
type OptionInstance = InstanceType<typeof Option>
// Option<unknown>

// Runtime type guard
if (isCompanion(Option)) {
  console.log("Option is a Companion object")
}

// Use with custom types
const Point = Companion((x: number, y: number) => ({ x, y }), { origin: () => ({ x: 0, y: 0 }) })

Point.origin() // { x: 0, y: 0 }

type PointInst = InstanceType<typeof Point>
const instance: PointInst = Point(1, 2)
```
