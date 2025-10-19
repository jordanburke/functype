# Functype Quick Reference

Quick lookup guide for common functype operations.

## Construction

| Type | Constructor | Example |
|------|------------|---------|
| Option | `Option(value)` | `Option("hello")`, `Option.none()` |
| Either | `Right(value)` or `Left(error)` | `Right(42)`, `Left("error")` |
| Try | `Try(() => expression)` | `Try(() => JSON.parse(str))` |
| List | `List(array)` or `List.from(array)` | `List([1, 2, 3])` |
| Set | `Set(array)` | `Set([1, 2, 3])` |
| Map | `Map<K,V>()` | `Map<string, number>()` |
| Lazy | `Lazy(() => expression)` | `Lazy(() => expensiveComputation())` |

## Transformation

| Operation | Method | Example |
|-----------|--------|---------|
| Transform value | `map(fn)` | `Option(5).map(x => x * 2)` |
| Flatten nested | `flatMap(fn)` | `Option(user).flatMap(u => Option(u.email))` |
| Filter by condition | `filter(predicate)` | `Option(value).filter(x => x > 0)` |
| Combine values | `ap(wrappedFn)` | `Option(5).ap(Option(x => x * 2))` |

## Extraction

| Operation | Method | Example | Returns |
|-----------|--------|---------|---------|
| With default | `orElse(default)` | `option.orElse("N/A")` | `T` |
| With alternative | `or(alternative)` | `option.or(Option("alt"))` | `Option<T>` |
| Or throw | `orThrow(error?)` | `option.orThrow()` | `T` or throws |
| Or null | `orNull()` | `option.orNull()` | `T \| null` |
| Or undefined | `orUndefined()` | `option.orUndefined()` | `T \| undefined` |
| Pattern match | `fold(onEmpty, onValue)` | `option.fold(() => 0, x => x)` | `R` |

## Predicates

| Check | Method | Returns |
|-------|--------|---------|
| Has value (Option) | `isSome()` | `boolean` |
| Is empty (Option) | `isNone()` | `boolean` |
| Is success (Either) | `isRight()` | `boolean` |
| Is error (Either) | `isLeft()` | `boolean` |
| Is success (Try) | `isSuccess()` | `boolean` |
| Is failure (Try) | `isFailure()` | `boolean` |
| Contains value | `contains(value)` | `boolean` |
| Is empty (List) | `isEmpty()` | `boolean` |

## Collection Operations

| Operation | Method | Example |
|-----------|--------|---------|
| Add element | `append(elem)` | `list.append(4)` |
| Add at start | `prepend(elem)` | `list.prepend(0)` |
| Combine lists | `concat(other)` | `list.concat(otherList)` |
| First element | `head()` | `list.head()` |
| Rest of list | `tail()` | `list.tail()` |
| First (safe) | `headOption()` | `list.headOption()` |
| Reduce left | `foldLeft(init)(fn)` | `list.foldLeft(0)((sum, n) => sum + n)` |
| Reduce right | `foldRight(init)(fn)` | `list.foldRight(0)((n, sum) => sum + n)` |
| Standard reduce | `reduce(fn, init)` | `list.reduce((acc, n) => acc + n, 0)` |

## Conversion

| From | To | Method |
|------|----|---------|
| Option | Either | `fold(() => Left(error), v => Right(v))` |
| Option | Try | N/A (not direct) |
| Try | Option | `toOption()` |
| Try | Either | `toEither()` |
| Either | Option | `fold(() => Option.none(), v => Option(v))` |
| List | Array | `toArray()` |
| List | Set | `toSet()` |
| Array | List | `List.from(array)` or `List(array)` |
| Set | List | `List.from(set)` |

## Common Patterns Cheat Sheet

### Null Safety
```typescript
// Before
const name = user?.name ?? "Unknown"

// After
const name = Option(user).map(u => u.name).orElse("Unknown")
```

### Error Handling
```typescript
// Before
try {
  return riskyOperation()
} catch (e) {
  return defaultValue
}

// After
Try(() => riskyOperation()).orElse(defaultValue)
```

### Validation
```typescript
// Before
function validate(email: string): string | null {
  return email.includes("@") ? email : null
}

// After
function validate(email: string): Either<string, string> {
  return email.includes("@") ? Right(email) : Left("Invalid email")
}
```

### Array Processing
```typescript
// Before
const result = array
  .filter(x => x > 0)
  .map(x => x * 2)

// After (immutable)
const result = List(array)
  .filter(x => x > 0)
  .map(x => x * 2)
  .toArray()
```

## Pipeline Composition

### Option Pipeline
```typescript
Option(user)
  .flatMap(u => Option(u.profile))
  .flatMap(p => Option(p.settings))
  .map(s => s.theme)
  .filter(theme => validThemes.includes(theme))
  .orElse("default")
```

### Either Pipeline
```typescript
validateEmail(input)
  .flatMap(email => validateDomain(email))
  .flatMap(email => checkBlacklist(email))
  .fold(
    error => console.error(error),
    email => sendWelcome(email)
  )
```

### List Pipeline
```typescript
List(users)
  .filter(u => u.isActive)
  .map(u => u.email)
  .filter(email => email.includes("@"))
  .flatMap(email => List(email.split("@")))
  .toSet()
  .toArray()
```

## Do-Notation

For complex monadic workflows, some types support do-notation:

```typescript
import { Option } from "functype/option"

// Using do-notation for cleaner nested operations
const result = Option.Do(function* () {
  const user = yield* Option(currentUser)
  const profile = yield* Option(user.profile)
  const settings = yield* Option(profile.settings)
  return settings.theme
}).orElse("light")
```

## TypeScript Tips

### Type Inference
```typescript
// Compiler infers Option<number>
const num = Option(5)

// Explicit type when needed
const str: Option<string> = Option.none()

// Generic constraint
function process<T>(opt: Option<T>): T {
  return opt.orThrow()
}
```

### Type Guards
```typescript
const value: Option<string> = Option("hello")

if (value.isSome()) {
  // TypeScript still treats value as Option<string>
  // Use orElse or fold to extract
  const str = value.orElse("")
}
```

### Async Types
```typescript
// Promise with Option
async function fetchUser(id: string): Promise<Option<User>> {
  const user = await api.getUser(id)
  return Option(user)
}

// Promise with Either
async function fetchUserSafe(id: string): Promise<Either<Error, User>> {
  try {
    const user = await api.getUser(id)
    return Right(user)
  } catch (error) {
    return Left(error as Error)
  }
}
```

## Common Mistakes

| ❌ Wrong | ✅ Correct |
|---------|-----------|
| `Option(value).map(...)` without extraction | `Option(value).map(...).orElse(default)` |
| `Option(user).map(u => Option(u.email))` | `Option(user).flatMap(u => Option(u.email))` |
| `Try(() => x).orThrow()` in non-error contexts | `Try(() => x).orElse(fallback)` |
| `list.toArray().push(item)` (mutates) | `list.append(item).toArray()` |
| Using `any` type | Use proper type parameters: `Option<T>` |

## Performance Tips

1. **Use Lazy for expensive computations**
   ```typescript
   const expensive = Lazy(() => heavyComputation())
   // Only computed when accessed via .value()
   ```

2. **Use LazyList for large datasets**
   ```typescript
   LazyList.from(0, n => n + 1)
     .filter(n => n % 2 === 0)
     .take(10)
   ```

3. **Prefer selective imports**
   ```typescript
   import { Option } from "functype/option"  // Smaller bundle
   // vs
   import { Option } from "functype"  // Larger bundle
   ```

4. **Memoize with Lazy**
   ```typescript
   const memoized = Lazy(() => computeOnce())
   // Always returns same value after first computation
   ```