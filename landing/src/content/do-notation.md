# Do-Notation

Scala-like for-comprehensions for composing monadic operations.

## Overview

Do-notation provides generator-based monadic comprehensions inspired by Scala's for-comprehensions. It makes complex monadic chains readable and maintainable by eliminating nested flatMap calls.

## Basic Usage

```typescript
import { Do, $ } from "functype/do"
import { Option } from "functype/option"

// Instead of nested flatMaps
const nested = Option(1).flatMap((a) => Option(2).flatMap((b) => Option(3).map((c) => a + b + c)))

// Use Do-notation
const clean = Do(function* () {
  const a = yield* $(Option(1))
  const b = yield* $(Option(2))
  const c = yield* $(Option(3))
  return a + b + c
}) // Some(6)
```

## The $ Helper

The `$` function enables TypeScript type inference with generators:

```typescript
import { Do, $ } from "functype/do"

const result = Do(function* () {
  const x = yield* $(Option(42)) // x is number, not unknown
  return x * 2
})
```

## Short-Circuiting

Do-notation automatically propagates None/Left/Failure:

```typescript
// Option - stops on None
const result = Do(function* () {
  const a = yield* $(Option(1))
  const b = yield* $(Option.none<number>()) // stops here
  const c = yield* $(Option(3))
  return a + b + c
}) // None

// Either - stops on Left
const validated = Do(function* () {
  const name = yield* $(validateName(input)) // Left stops chain
  const email = yield* $(validateEmail(input))
  return { name, email }
})
```

## Supported Types

Do-notation works with any monad in functype:

### Option

```typescript
const result = Do(function* () {
  const user = yield* $(findUser(id))
  const profile = yield* $(user.profile)
  const email = yield* $(profile.email)
  return email
}) // Option<string>
```

### Either

```typescript
const result = Do(function* () {
  const name = yield* $(validateName(input.name))
  const age = yield* $(validateAge(input.age))
  const email = yield* $(validateEmail(input.email))
  return { name, age, email }
}) // Either<ValidationError, User>
```

### Try

```typescript
const result = Do(function* () {
  const config = yield* $(Try(() => readConfig()))
  const db = yield* $(Try(() => connectDB(config)))
  const users = yield* $(Try(() => db.query("SELECT * FROM users")))
  return users
}) // Try<User[]>
```

### List (Cartesian Products)

```typescript
const combinations = Do(function* () {
  const x = yield* $(List([1, 2, 3]))
  const y = yield* $(List(["a", "b"]))
  return `${x}${y}`
}) // List(["1a", "1b", "2a", "2b", "3a", "3b"])
```

## Async Do-Notation

For async operations, use `DoAsync`:

```typescript
import { DoAsync, $ } from "functype/do"

const result = await DoAsync(async function* () {
  const user = yield* $(Task.async("getUser", () => fetchUser()))
  const posts = yield* $(Task.async("getPosts", () => fetchPosts(user.id)))
  return { user, posts }
})
```

## Performance

Do-notation is highly optimized:

- **Option/Either/Try**: Near-zero overhead
- **List comprehensions**: 175x faster than nested flatMaps
- Uses direct iteration instead of creating intermediate structures

## Key Features

- **Scala-Inspired**: Similar syntax to Scala's for-comprehensions
- **Type-Safe**: Full TypeScript inference with the $ helper
- **Short-Circuiting**: None/Left/Failure automatically propagates
- **High Performance**: Optimized for List comprehensions

## When to Use Do-Notation

- Chaining 3+ monadic operations
- List comprehensions (cartesian products)
- Complex validation pipelines
- When readability matters more than micro-optimization

## Comparison

```typescript
// Without Do-notation
const result = getUser(id).flatMap((user) =>
  getProfile(user.profileId).flatMap((profile) =>
    getSettings(profile.settingsId).map((settings) => ({ user, profile, settings })),
  ),
)

// With Do-notation
const result = Do(function* () {
  const user = yield* $(getUser(id))
  const profile = yield* $(getProfile(user.profileId))
  const settings = yield* $(getSettings(profile.settingsId))
  return { user, profile, settings }
})
```

## API Reference

See full API documentation at [functype API docs](https://jordanburke.github.io/functype/modules/do.html)
