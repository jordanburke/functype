---
name: functype
description: Help developers use functype functional programming patterns in their TypeScript projects. Use this skill when converting imperative/OOP code to functional patterns, looking up functype APIs and methods, handling nulls with Option, managing errors with Either/Try, or working with immutable collections like List and Set.
---

# Functype User Guide

## Overview

Transform TypeScript code to use functype - a Scala-inspired functional programming library providing type-safe alternatives to null checks, exceptions, and imperative patterns. This skill helps integrate Option, Either, Try, List, and other functional types into projects.

## When to Use This Skill

Trigger this skill when users:

- Convert imperative code to functional patterns
- Look up functype APIs or methods
- Handle nullable values or optional chaining
- Replace try-catch with functional error handling
- Work with immutable collections
- Debug functype code or understand error messages

## Quick Start

### Installation

```bash
npm install functype
# or
pnpm add functype
```

### Core Imports

```typescript
// Import from main bundle
import { Option, Either, Left, Right, Try, List } from "functype"
```

## Constructor vs Companion Methods

Functype collections provide multiple ways to create instances:

| Method         | Use When                     | Example                |
| -------------- | ---------------------------- | ---------------------- |
| `List([...])`  | Creating from existing array | `List(existingArray)`  |
| `List.of(...)` | Inline literal values        | `List.of(1, 2, 3)`     |
| `List.empty()` | Empty collections (typed)    | `List.empty<number>()` |

### Decision Guide

**Use Constructor `List([...])` when:**

- Converting existing arrays: `List(data.items)`
- Spreading iterables: `List([...set])`
- Variables holding arrays: `List(myArray)`

**Use `List.of(...)` when:**

- Inline literal values: `List.of(1, 2, 3)`
- Cleaner for small fixed lists: `List.of("a", "b", "c")`
- No need to wrap in array brackets

**Use `List.empty()` when:**

- Starting with empty collection: `List.empty<User>()`
- Type parameter needed but no initial values
- Returns singleton (efficient for repeated calls)

### Examples

```typescript
// Constructor - wrapping existing data
const users = List(fetchedUsers)
const items = List([...existingSet])

// .of() - inline literals
const colors = List.of("red", "green", "blue")
const primes = Set.of(2, 3, 5, 7, 11)

// .empty() - typed empty collections
const errors = List.empty<string>()
const cache = Map.empty<string, User>()
```

## Pattern Conversion Guide

### Null/Undefined Checks → Option

**Before (Imperative):**

```typescript
if (value !== null && value !== undefined) {
  return value.toUpperCase()
}
return ""
```

**After (Functype):**

```typescript
Option(value)
  .map((v) => v.toUpperCase())
  .orElse("")
```

### Optional Chaining → Option Chain

**Before:**

```typescript
const url = user?.profile?.avatar?.url
```

**After:**

```typescript
const url = Option(user)
  .flatMap((u) => Option(u.profile))
  .flatMap((p) => Option(p.avatar))
  .map((a) => a.url)
  .orElse("/default-avatar.png")
```

### Try-Catch → Try or Either

**Before:**

```typescript
try {
  return JSON.parse(str)
} catch (e) {
  return null
}
```

**After (with Try):**

```typescript
Try(() => JSON.parse(str))
  .toOption()
  .orElse(null)
```

**After (with Either):**

```typescript
Try(() => JSON.parse(str))
  .toEither()
  .fold(
    (error) => `Parse failed: ${error.message}`,
    (data) => data,
  )
```

### Array Operations → List

**Before:**

```typescript
array.filter((x) => x > 0).map((x) => x * 2)
```

**After:**

```typescript
List(array)
  .filter((x) => x > 0)
  .map((x) => x * 2)
  .toArray()
```

### If-Else Chains → Cond

**Before:**

```typescript
if (x > 10) {
  return "big"
} else if (x > 5) {
  return "medium"
} else {
  return "small"
}
```

**After:**

```typescript
import { Cond } from "functype"

Cond.start<string>()
  .case(x > 10, "big")
  .case(x > 5, "medium")
  .otherwise("small")
```

### Switch Statements → Match

**Before:**

```typescript
switch (status) {
  case "success":
    return data
  case "error":
    return null
  default:
    return undefined
}
```

**After:**

```typescript
import { Match } from "functype"

Match(status)
  .case("success", () => data)
  .case("error", () => null)
  .exhaustive()
```

## Common Use Cases

### Validation with Either

```typescript
import { Either, Left, Right } from "functype"

function validateEmail(email: string): Either<string, string> {
  return email.includes("@") ? Right(email) : Left("Invalid email format")
}

function validateUser(user: any): Either<string, User> {
  return validateEmail(user.email)
    .map((email) => ({ ...user, email }))
    .flatMap((u) => (u.age >= 18 ? Right(u) : Left("Must be 18 or older")))
}

const result = validateUser({ email: "test@example.com", age: 20 }).fold(
  (error) => console.error(error),
  (user) => console.log("Valid user:", user),
)
```

### Safe API Calls with Option

```typescript
import { Option } from "functype"

interface User {
  id: string
  name: string
  email?: string
}

function getUserEmail(userId: string): Option<string> {
  return Option(fetchUser(userId))
    .flatMap((user) => Option(user.email))
    .filter((email) => email.includes("@"))
}

const email = getUserEmail("123").orElse("no-reply@example.com")
```

### Error Recovery with Try

```typescript
import { Try } from "functype"

const parseConfig = Try(() => JSON.parse(configStr))
  .recover((error) => {
    console.warn("Using default config:", error)
    return defaultConfig
  })
  .map((config) => validateConfig(config))
```

### Collection Pipeline with List

```typescript
import { List } from "functype"

const users = List([
  { name: "Alice", hobbies: ["reading", "coding"] },
  { name: "Bob", hobbies: ["gaming", "music"] },
])

const allHobbies = users
  .flatMap((user) => List(user.hobbies))
  .toSet() // Remove duplicates
  .toArray()
```

## Additional Data Structures

### IO<R,E,A> - Effect Type

IO is a lazy, composable effect type with typed errors and dependency injection:

- **R** = Requirements (environment/dependencies needed)
- **E** = Error type (typed failures)
- **A** = Success type (value produced on success)

```typescript
import { IO, Tag, Layer } from "functype"

// Creation
IO.sync(() => computation())     // Sync operation
IO.succeed(value)                // Pure success
IO.fail(error)                   // Pure failure
IO.async(() => promise)          // Async operation
IO.tryPromise({                  // Promise with error mapping
  try: () => fetch(url),
  catch: (e) => new NetworkError(e)
})

// Dependency injection
const Database = Tag<DatabaseService>("Database")
const dbEffect = IO.service(Database)  // Access a service
const program = dbEffect.flatMap(db => IO.sync(() => db.query()))
program.provide(Layer.fromValue(Database, myDb))  // Provide deps

// Generator do-notation (cleaner syntax)
const program = IO.gen(function* () {
  const db = yield* IO.service(Database)
  const user = yield* IO.tryPromise(() => db.findUser(id))
  return user
})

// Execution
await effect.run()           // Returns Promise<A>
effect.runSync()             // Returns A (throws if async)
await effect.runEither()     // Returns Promise<Either<E,A>>
await effect.runExit()       // Returns Promise<Exit<E,A>>
```

### Tuple - Type-safe Fixed-length Array

```typescript
import { Tuple } from "functype"

const pair = Tuple(42, "hello")
pair.first()                 // 42
pair.second()                // "hello"
pair.mapFirst(x => x * 2)    // Tuple(84, "hello")
pair.swap()                  // Tuple("hello", 42)
pair.apply((a, b) => a + b.length)  // 47
pair.concat(Tuple(true))     // Tuple(42, "hello", true)
```

### Stack - Last-In-First-Out Collection

```typescript
import { Stack } from "functype"

Stack.empty<number>()
const stack = Stack.of(1, 2, 3)
stack.push(value)            // Returns new Stack
stack.pop()                  // Returns [Option<T>, Stack<T>]
stack.peek()                 // Returns Option<T>
stack.match({
  Empty: () => "empty stack",
  NonEmpty: (top, rest) => `top: ${top}`
})
```

### LazyList - Lazy-evaluated List

```typescript
import { LazyList } from "functype"

// Creation
LazyList([1, 2, 3])
LazyList.of(1, 2, 3)
LazyList.empty<number>()

// Infinite sequences
const naturals = LazyList.from(0, n => n + 1)
const evens = naturals.filter(n => n % 2 === 0).take(10)

// Operations are deferred until needed
const result = LazyList(hugeArray)
  .filter(x => x > 0)
  .map(x => x * 2)
  .take(5)
  .toArray()  // Only processes first 5 matching elements
```

## Do-Notation (Generator Comprehensions)

Scala-like for-comprehensions using JavaScript generators:

```typescript
import { Do, DoAsync, $ } from "functype"

// Synchronous comprehensions
const result = Do(function* () {
  const x = yield* $(Option(5))
  const y = yield* $(Option(10))
  return x + y
})  // Option(15)

// Async comprehensions
const asyncResult = await DoAsync(async function* () {
  const user = yield* $(await fetchUserAsync(userId))
  const profile = yield* $(await fetchProfileAsync(user.id))
  return { user, profile }
})

// Cartesian products with List (2.5x-12x faster than nested flatMap)
const pairs = Do(function* () {
  const x = yield* $(List([1, 2, 3]))
  const y = yield* $(List([10, 20]))
  return { x, y }
})  // List([{x:1,y:10}, {x:1,y:20}, {x:2,y:10}, ...])

// Mixed monad types with automatic conversion
const mixed = Do(function* () {
  const a = yield* $(Option(5))
  const b = yield* $(Right<string, number>(10))
  return a + b
})
```

**Note**: First monad determines return type. Uses Reshapeable for automatic type conversion.

## Companion Pattern & Type Guards

All types provide static type guards for narrowing:

```typescript
import { Option, Either, Try } from "functype"

// Option type guards
if (Option.isSome(option)) {
  option.value  // TypeScript knows value exists
}
if (Option.isNone(option)) {
  // Handle empty case
}

// Either type guards
if (Either.isRight(either)) {
  either.value  // TypeScript knows it's Right
}
if (Either.isLeft(either)) {
  either.value  // TypeScript knows it's error value
}

// Try type guards
if (Try.isSuccess(tryVal)) {
  tryVal.value  // TypeScript knows it succeeded
}
if (Try.isFailure(tryVal)) {
  tryVal.error  // TypeScript knows it failed
}
```

## Serialization

All Serializable types provide JSON, YAML, and binary serialization:

```typescript
// Serialization methods
option.serialize().toJSON()
option.serialize().toYAML()
option.serialize().toBinary()  // Uint8Array

// Deserialization
Option.fromJSON<string>(jsonString)
Option.fromYAML<string>(yamlString)
Option.fromBinary<string>(binaryData)
```

## Looking Up Functype APIs

### Feature Matrix Reference

For a complete overview of which methods are available on each data structure, consult the **Feature Matrix** at:

- `references/feature-matrix.md` (included with this skill)
- Or in the functype repo: `docs/FUNCTYPE_FEATURE_MATRIX.md`

The matrix shows which interfaces (Functor, Monad, Foldable, etc.) each type implements and what methods are available.

### Common Methods by Type

**Option<T>**

- `map`, `flatMap`, `filter`, `fold`
- `orElse`, `or`, `orNull`, `orUndefined`, `orThrow`
- `isSome`, `isNone`, `contains`

**Either<L, R>**

- `map`, `flatMap`, `fold`
- `orElse`, `or`, `swap`
- `isLeft`, `isRight`

**Try<T>**

- `map`, `flatMap`, `fold`
- `recover`, `recoverWith`
- `toOption`, `toEither`
- `isSuccess`, `isFailure`

**List<A>**

- `map`, `flatMap`, `filter`, `reduce`
- `foldLeft`, `foldRight`
- `append`, `prepend`, `concat`
- `head`, `tail`, `isEmpty`
- `toArray`, `toSet`

## Additional Resources

For pattern conversion help, examples, and API reference:

- **Feature Matrix**: See `references/feature-matrix.md` for complete interface/method reference
- **API Documentation**: https://jordanburke.github.io/functype/
- **GitHub Repository**: https://github.com/jordanburke/functype
- **CLI Documentation**: Run `npx functype` for LLM-optimized API reference

## Debugging Tips

### Understanding Error Messages

**"Type 'X' is not assignable to type 'Y'"**

- Ensure proper type parameters: `Option<string>` not `Option<any>`
- Check that chains maintain type consistency

**"Cannot read property 'map' of undefined"**

- Remember to construct the type: `Option(value)` not just `value`
- Some types require explicit constructors: `List([...])`, `Right(value)`

### Common Pitfalls

1. **Forgetting to extract values**

   ```typescript
   // Wrong - returns Option<string>
   const name = Option(user).map((u) => u.name)

   // Correct - returns string
   const name = Option(user)
     .map((u) => u.name)
     .orElse("Unknown")
   ```

2. **Using map instead of flatMap**

   ```typescript
   // Wrong - returns Option<Option<string>>
   Option(user).map((u) => Option(u.email))

   // Correct - returns Option<string>
   Option(user).flatMap((u) => Option(u.email))
   ```

3. **Mutating instead of transforming**

   ```typescript
   // Wrong - mutates original array
   const list = List([1, 2, 3])
   list.toArray().push(4)

   // Correct - creates new List
   const newList = list.append(4)
   ```

## Resources

### references/

- `feature-matrix.md` - Complete interface and method reference
- `common-patterns.md` - Additional pattern examples and recipes
- `quick-reference.md` - Cheat sheet for functype APIs

For more examples and detailed documentation, visit:

- **GitHub**: https://github.com/jordanburke/functype
- **Docs**: https://jordanburke.github.io/functype/
