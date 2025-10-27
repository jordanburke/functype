export async function GET() {
  const markdown = `# Do-notation

Scala-like for-comprehensions for TypeScript with optimized performance.

## Overview

Do-notation provides generator-based monadic composition similar to Scala's for-comprehensions. It offers a more readable way to chain operations across Option, Either, Try, List, and other monads, with **significant performance advantages** for List operations.

## Key Features

- **Readable Composition**: Chain multiple monadic operations naturally
- **Mixed Types**: Works with Option, Either, Try, List, and custom monads
- **Performance**: 2.5x to 12x faster than flatMap for List comprehensions
- **Type Safety**: Full TypeScript type inference
- **Short-circuiting**: Automatically stops on first failure

## Basic Usage

\`\`\`typescript
import { Do, $ } from "functype"
import { Option } from "functype"

// Simple Option chaining
const result = Do(function* () {
  const x = yield* $(Option(5))
  const y = yield* $(Option(10))
  return x + y
})
// result: Some(15)

// Short-circuits on None
const failed = Do(function* () {
  const x = yield* $(Option(5))
  const y = yield* $(Option.none())  // Stops here
  const z = yield* $(Option(15))     // Never executed
  return x + y + z
})
// failed: None
\`\`\`

## Working with Different Types

### Option

\`\`\`typescript
const validation = Do(function* () {
  const email = yield* $(validateEmail("user@example.com"))
  const username = yield* $(validateUsername("john"))
  const age = yield* $(validateAge(25))
  return { email, username, age }
})
// Returns Some({ email, username, age }) if all validations pass
// Returns None if any validation fails
\`\`\`

### Either

\`\`\`typescript
import { Either, Right, Left } from "functype"

const result = Do(function* () {
  const config = yield* $(loadConfig())           // Either<Error, Config>
  const db = yield* $(connectDatabase(config))    // Either<Error, Database>
  const user = yield* $(fetchUser(db, userId))    // Either<Error, User>
  return user
})
// Returns Right(user) on success
// Returns Left(error) on first failure
\`\`\`

### List Comprehensions (High Performance!)

List comprehensions with Do-notation are **2.5x to 12x faster** than traditional flatMap chains:

\`\`\`typescript
import { List } from "functype"

// Cartesian product - MUCH faster than flatMap!
const pairs = Do(function* () {
  const x = yield* $(List([1, 2, 3]))
  const y = yield* $(List([10, 20]))
  return { x, y, product: x * y }
})
// Result: List([
//   { x: 1, y: 10, product: 10 },
//   { x: 1, y: 20, product: 20 },
//   { x: 2, y: 10, product: 20 },
//   ...
// ])

// Filtered combinations
const filtered = Do(function* () {
  const x = yield* $(List([1, 2, 3, 4, 5]))
  const y = yield* $(List([1, 2, 3]))
  if (x + y < 5) {
    return { x, y, sum: x + y }
  }
})
// Only includes combinations where x + y < 5
\`\`\`

### Try

\`\`\`typescript
import { Try } from "functype"

const processing = Do(function* () {
  const raw = yield* $(Try(() => JSON.parse(input)))
  const validated = yield* $(Try(() => validate(raw)))
  const transformed = yield* $(Try(() => transform(validated)))
  return transformed
})
// Returns Success(result) if all succeed
// Returns Failure(error) on first exception
\`\`\`

## Mixed Monad Types

Use the Reshapeable interface to work with different monad types in the same Do block:

\`\`\`typescript
const mixed = Do(function* () {
  const a = yield* $(Option(5))              // From Option
  const b = yield* $(Right<string, number>(10))  // From Either
  const c = yield* $(List([15]))             // From List
  const d = yield* $(Try(() => 20))          // From Try
  return a + b + c + d
})

// Convert to desired output type
const asOption = mixed.toOption()            // Some(50)
const asEither = mixed.toEither("failed")    // Right(50)
const asList = mixed.toList()                // List([50])
\`\`\`

## Async Operations

\`\`\`typescript
import { DoAsync } from "functype"

const asyncResult = await DoAsync(async function* () {
  const user = yield* $(await fetchUser(userId))
  const posts = yield* $(await fetchPosts(user.id))
  const comments = yield* $(await fetchComments(posts[0].id))
  return { user, posts, comments }
})
\`\`\`

## Conditional Logic

\`\`\`typescript
const result = Do(function* () {
  const x = yield* $(Option(5))
  const y = yield* $(Option(10))

  // Conditional logic
  if (x > y) {
    return x - y
  } else {
    return y - x
  }
})

// With guards (filter-like behavior)
const filtered = Do(function* () {
  const x = yield* $(List([1, 2, 3, 4, 5]))
  const y = yield* $(List([1, 2, 3]))

  // Skip combinations that don't match
  if (x + y >= 5) {
    return  // Skips this combination
  }

  return { x, y }
})
\`\`\`

## Performance Comparison

### List Comprehensions

\`\`\`typescript
// Traditional flatMap (slower)
const traditional = List([1, 2, 3])
  .flatMap(x =>
    List([10, 20]).flatMap(y =>
      List([{ x, y }])
    )
  )

// Do-notation (2.5x to 12x faster!)
const optimized = Do(function* () {
  const x = yield* $(List([1, 2, 3]))
  const y = yield* $(List([10, 20]))
  return { x, y }
})
\`\`\`

### Performance Characteristics

- **List Comprehensions**: 2.5x to 12x faster than nested flatMap
- **Cartesian Products**: Huge performance win for multiple List yields
- **Smart Caching**: Constructor lookups cached after first type detection
- **Simple Monads**: ~2x slower than direct flatMap for 2-3 step chains

## When to Use Do-notation

### ✓ Best for:

- Complex List comprehensions (huge performance win!)
- Cartesian products and filtered combinations
- Mixed monad types (leveraging Reshapeable)
- Improved readability for multi-step operations
- 4+ sequential monadic operations

### ✗ Consider alternatives for:

- Simple 2-3 step Option/Either chains (flatMap is ~2x faster)
- Performance-critical hot paths with simple monads
- Early termination scenarios (flatMap auto-short-circuits more efficiently)

## Differences from Scala

### Syntax

\`\`\`scala
// Scala for-comprehension
for {
  x <- Option(5)
  y <- Option(10)
} yield x + y

// TypeScript Do-notation
Do(function* () {
  const x = yield* $(Option(5))
  const y = yield* $(Option(10))
  return x + y
})
\`\`\`

### Guards

\`\`\`scala
// Scala guard
for {
  x <- List(1, 2, 3, 4, 5)
  y <- List(1, 2, 3)
  if x + y < 5
} yield (x, y)

// TypeScript (early return)
Do(function* () {
  const x = yield* $(List([1, 2, 3, 4, 5]))
  const y = yield* $(List([1, 2, 3]))
  if (x + y >= 5) return  // Skip
  return { x, y }
})
\`\`\`

### Type Consistency

- **Scala**: Result type determined by first generator
- **TypeScript**: Same behavior - returns type of first yielded monad
- **Mixed types**: Use Reshapeable to convert between monad types

## Common Patterns

### Validation Pipeline

\`\`\`typescript
const userValidation = Do(function* () {
  const email = yield* $(validateEmail(input.email))
  const age = yield* $(validateAge(input.age))
  const country = yield* $(validateCountry(input.country))
  return { email, age, country }
})
\`\`\`

### Data Fetching Pipeline

\`\`\`typescript
const fetchUserData = await DoAsync(async function* () {
  const user = yield* $(await getUserById(userId))
  const profile = yield* $(await getProfile(user.profileId))
  const settings = yield* $(await getSettings(user.id))
  return { user, profile, settings }
})
\`\`\`

### List Processing

\`\`\`typescript
const combinations = Do(function* () {
  const color = yield* $(List(["red", "blue", "green"]))
  const size = yield* $(List(["small", "medium", "large"]))
  const price = yield* $(List([10, 20, 30]))
  return { color, size, price }
})
// Generates all 27 combinations
\`\`\`

### Error Handling

\`\`\`typescript
const processing = Do(function* () {
  const data = yield* $(Try(() => loadData()))
  const validated = yield* $(Try(() => validate(data)))
  const enriched = yield* $(Try(() => enrich(validated)))
  const saved = yield* $(Try(() => save(enriched)))
  return saved
})
// Returns Success(result) or Failure(first error)
\`\`\`

## API Reference

For complete API documentation, see the [Do-notation API docs](https://functype.org/api-docs/modules/Do.html).

## Learn More

- [Option Documentation](https://functype.org/option)
- [Either Documentation](https://functype.org/either)
- [List Documentation](https://functype.org/list)
- [Try Documentation](https://functype.org/try)
- [Feature Matrix](https://functype.org/feature-matrix)
`

  return new Response(markdown, {
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
    },
  })
}
