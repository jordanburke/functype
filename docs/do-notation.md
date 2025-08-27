# Do-notation: Scala-like For-Comprehensions in TypeScript

## Overview

Functype's Do-notation provides generator-based monadic comprehensions similar to Scala's for-comprehensions. It enables elegant composition of monadic operations without nested `flatMap` calls, making complex monadic chains more readable and maintainable.

## Comparison with Scala's For-Comprehensions

### Side-by-Side Examples

#### Basic Option Chaining

**Scala:**

```scala
val result = for {
  x <- Some(5)
  y <- Some(10)
} yield x + y
// result: Option[Int] = Some(15)
```

**Functype:**

```typescript
const result = Do(function* () {
  const x = yield* $(Option(5))
  const y = yield* $(Option(10))
  return x + y
})
// result: Option<number> with value 15
```

#### Error Propagation with Either

**Scala:**

```scala
val result = for {
  email <- validateEmail(input)  // Either[String, Email]
  user <- fetchUser(email)       // Either[String, User]
  profile <- loadProfile(user)   // Either[String, Profile]
} yield profile
```

**Functype:**

```typescript
const result = Do(function* () {
  const email = yield* $(validateEmail(input))
  const user = yield* $(fetchUser(email))
  const profile = yield* $(loadProfile(user))
  return profile
})
```

#### List Comprehensions (Cartesian Products)

**Scala:**

```scala
val pairs = for {
  x <- List(1, 2, 3)
  y <- List(10, 20)
} yield (x, y)
// List((1,10), (1,20), (2,10), (2,20), (3,10), (3,20))
```

**Functype:**

```typescript
const pairs = Do(function* () {
  const x = yield* $(List([1, 2, 3]))
  const y = yield* $(List([10, 20]))
  return { x, y }
})
// List with 6 elements (all combinations)
```

## Feature Mapping

| Scala Feature       | Functype Equivalent         | Notes                                |
| ------------------- | --------------------------- | ------------------------------------ |
| `x <- monad`        | `const x = yield* $(monad)` | Extract value from monad             |
| `yield expr`        | `return expr`               | Return final value                   |
| Value definitions   | Direct assignment           | `const z = x + y`                    |
| Multiple generators | Multiple yields             | Creates cartesian products for Lists |
| Short-circuiting    | Automatic                   | None/Left/Failure propagates         |
| Type inference      | TypeScript inference        | Use `$` helper for best results      |
| Async support       | `DoAsync`                   | For Promise-based operations         |

## Supported Monadic Types

All functype monadic types work with Do-notation:

- **Option<T>**: Some/None handling
- **Either<L,R>**: Left/Right error handling
- **List<T>**: Cartesian products
- **Try<T>**: Exception handling
- **Mixed types**: Via Reshapeable interface

## Key Differences from Scala

### 1. Guard Syntax

Scala supports guards within comprehensions:

```scala
for {
  x <- List(1, 2, 3, 4, 5)
  if x > 3
  y <- List(x, x * 2)
} yield y
```

Functype requires conditional logic with early returns:

```typescript
const result = Do(function* () {
  const x = yield* $(List([1, 2, 3, 4, 5]))
  if (x <= 3) {
    return yield* $(None<number>())
  }
  const y = yield* $(List([x, x * 2]))
  return y
})
  .filter((opt) => opt.isSome())
  .map((opt) => opt.get())
```

### 2. Pattern Matching in Generators

Scala allows pattern matching:

```scala
for {
  (x, y) <- List((1, 2), (3, 4))
} yield x + y
```

Functype uses object destructuring:

```typescript
const result = Do(function* () {
  const pair = yield* $(
    List([
      { x: 1, y: 2 },
      { x: 3, y: 4 },
    ]),
  )
  return pair.x + pair.y
})
```

### 3. First Monad Wins

In functype, the return type is determined by the first yielded monad:

```typescript
const result = Do(function* () {
  const x = yield* $(Option(5)) // First monad: Option
  const y = yield* $(Right(10)) // Different type: Either
  return x + y
})
// result type is Option<number> (matches first monad)
```

## Common Patterns

### Sequential Validation

```typescript
const registerUser = (email: string, password: string) =>
  Do(function* () {
    const validEmail = yield* $(validateEmail(email))
    const availableEmail = yield* $(checkEmailAvailable(validEmail))
    const hashedPassword = yield* $(hashPassword(password))
    const user = yield* $(createUser(availableEmail, hashedPassword))
    const emailSent = yield* $(sendWelcomeEmail(user))
    return { user, emailSent }
  })
```

### Data Pipeline

```typescript
const processData = (input: string) =>
  Do(function* () {
    const parsed = yield* $(Try(() => JSON.parse(input)))
    const validated = yield* $(validateSchema(parsed))
    const transformed = yield* $(transformData(validated))
    const saved = yield* $(saveToDatabase(transformed))
    return saved
  })
```

### Combining Multiple Sources

```typescript
const fetchUserData = (userId: string) =>
  Do(function* () {
    const user = yield* $(fetchUser(userId))
    const posts = yield* $(fetchUserPosts(user.id))
    const comments = yield* $(fetchUserComments(user.id))
    const profile = yield* $(buildProfile(user, posts, comments))
    return profile
  })
```

### Async Operations

```typescript
const processOrder = async (orderId: string) =>
  await DoAsync(async function* () {
    const order = yield* $(await fetchOrder(orderId))
    const inventory = yield* $(await checkInventory(order.items))
    const payment = yield* $(await processPayment(order.payment))
    const shipment = yield* $(await createShipment(order, payment))
    return { order, shipment }
  })
```

## Performance Characteristics

Based on comprehensive benchmarks:

### Strengths

- **List comprehensions**: Up to 175x faster than nested flatMaps for complex cartesian products
- **Readable code**: Eliminates deeply nested callback chains
- **Type safety**: Full TypeScript inference with the `$` helper

### Trade-offs

- **Simple chains**: Traditional flatMap is 1.5-2x faster for simple cases
- **Short-circuiting**: Direct None/Left checks are slightly faster
- **Generator overhead**: Small overhead from generator function execution

### When to Use Do-notation

**Use Do-notation when:**

- Chaining 3+ monadic operations
- Working with List comprehensions
- Mixing different monad types
- Prioritizing readability over micro-optimizations
- Implementing complex business logic flows

**Use traditional flatMap when:**

- Simple 1-2 step chains
- Performance-critical hot paths
- Working with a single monad type throughout

## Monadic Laws

Do-notation preserves the monadic laws:

### Left Identity

```typescript
const a = 5
const f = (x: number) => Option(x * 2)

const left = Do(function* () {
  const x = yield* $(Option(a))
  return yield* $(f(x))
})

const right = f(a)
// left equals right
```

### Right Identity

```typescript
const m = Option(10)

const result = Do(function* () {
  const x = yield* $(m)
  return yield* $(Option(x))
})
// result equals m
```

### Associativity

```typescript
const m = Option(5)
const f = (x: number) => Option(x * 2)
const g = (x: number) => Option(x + 1)

const left = Do(function* () {
  const x = yield* $(m)
  const y = yield* $(f(x))
  return yield* $(g(y))
})

const right = Do(function* () {
  const x = yield* $(m)
  return yield* $(
    Do(function* () {
      const y = yield* $(f(x))
      return yield* $(g(y))
    }),
  )
})
// left equals right
```

## Migration from Scala

If you're coming from Scala, here's a quick reference:

| Scala                   | Functype                             |
| ----------------------- | ------------------------------------ |
| `for { ... } yield ...` | `Do(function* () { ... })`           |
| `x <- someOption`       | `const x = yield* $(someOption)`     |
| `if condition`          | Use conditional with early return    |
| Multiple generators     | Multiple `yield*` statements         |
| `yield expression`      | `return expression`                  |
| For without yield       | Not supported (always returns value) |
| `withFilter`            | Post-filter the result               |

## Advanced Usage

### Nested Comprehensions

```typescript
const result = Do(function* () {
  const outer = yield* $(Option(5))

  const inner = yield* $(
    Do(function* () {
      const x = yield* $(Option(outer * 2))
      const y = yield* $(Option(x + 1))
      return y
    }),
  )

  return inner + outer
})
```

### Recursive Patterns

```typescript
const fibonacci = (n: number): Option<number> => {
  if (n <= 0) return None<number>()
  if (n <= 2) return Option(1)

  return Do(function* () {
    const prev1 = yield* $(fibonacci(n - 1))
    const prev2 = yield* $(fibonacci(n - 2))
    return prev1 + prev2
  })
}
```

### Converting Between Types

```typescript
const result = Do(function* () {
  const opt = yield* $(Option(5))
  const either = yield* $(Right<string, number>(10))
  const list = yield* $(List([15]))
  const tryVal = yield* $(Try(() => 20))
  return opt + either + list + tryVal
})

// Convert to any needed type
const asOption = result.toOption()
const asEither = result.toEither("error")
const asList = result.toList()
const asTry = result.toTry()
```

## Best Practices

1. **Use the $ helper**: Always wrap monads with `yield* $(monad)` for proper type inference
2. **Keep generators focused**: Each Do block should have a single responsibility
3. **Handle errors explicitly**: Use proper monad types for error cases
4. **Avoid side effects**: Keep generator bodies pure when possible
5. **Consider performance**: Use traditional flatMap for simple, performance-critical paths
6. **Document monad types**: Make return types clear in function signatures

## Troubleshooting

### Type Inference Issues

If TypeScript can't infer types properly:

```typescript
// Explicit type annotations
const result = Do(function* () {
  const x = yield* $(Option(5)) as unknown as number
  return x * 2
})

// Or use type assertions on the result
const typed = result as Option<number>
```

### Mixed Monad Types

When mixing different monad types, use Reshapeable:

```typescript
const mixed = Do(function* () {
  const a = yield* $(Option(5))
  const b = yield* $(Right(10))
  return a + b
})

// Explicitly convert to desired type
const asOption = mixed.toOption()
```

### Debugging

Use intermediate variables to debug:

```typescript
const result = Do(function* () {
  const x = yield* $(Option(5))
  console.log("x:", x) // Debug output

  const y = yield* $(Option(10))
  console.log("y:", y)

  return x + y
})
```

## Conclusion

Do-notation brings the elegance of Scala's for-comprehensions to TypeScript, providing a powerful tool for monadic composition. While it has some differences from Scala's implementation, it offers comparable functionality with excellent performance for complex scenarios and superior readability for monadic chains.
