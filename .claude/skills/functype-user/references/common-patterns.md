# Common Functype Patterns

This document provides additional pattern examples and recipes for using functype in real-world scenarios.

## Null Safety Patterns

### Nested Optional Properties

```typescript
import { Option } from "functype/option"

interface User {
  profile?: {
    settings?: {
      theme?: string
    }
  }
}

// Instead of: user?.profile?.settings?.theme ?? 'light'
const theme = Option(user)
  .flatMap(u => Option(u.profile))
  .flatMap(p => Option(p.settings))
  .flatMap(s => Option(s.theme))
  .orElse('light')
```

### Optional Function Calls

```typescript
import { Option } from "functype/option"

// Instead of: callback?.()
Option(callback).map(fn => fn())

// With arguments
Option(callback).map(fn => fn(arg1, arg2))
```

### Conditional Value Assignment

```typescript
import { Option } from "functype/option"

// Instead of: const value = condition ? compute() : null
const value = Option(condition ? compute() : null)
  .orElse(defaultValue)

// Or using filter
const value = Option(compute())
  .filter(() => condition)
  .orElse(defaultValue)
```

## Error Handling Patterns

### Validation Chains

```typescript
import { Either, Left, Right } from "functype/either"

type ValidationError = string
type User = { email: string; age: number; username: string }

const validateEmail = (email: string): Either<ValidationError, string> =>
  email.includes("@") && email.includes(".")
    ? Right(email)
    : Left("Invalid email format")

const validateAge = (age: number): Either<ValidationError, number> =>
  age >= 18
    ? Right(age)
    : Left("Must be 18 or older")

const validateUsername = (username: string): Either<ValidationError, string> =>
  username.length >= 3
    ? Right(username)
    : Left("Username must be at least 3 characters")

function createUser(email: string, age: number, username: string): Either<ValidationError, User> {
  return validateEmail(email)
    .flatMap(validEmail =>
      validateAge(age).flatMap(validAge =>
        validateUsername(username).map(validUsername => ({
          email: validEmail,
          age: validAge,
          username: validUsername
        }))
      )
    )
}

// Usage
const result = createUser("test@example.com", 25, "alice")
  .fold(
    error => console.error("Validation failed:", error),
    user => console.log("User created:", user)
  )
```

### Multiple Error Types

```typescript
import { Either, Left, Right } from "functype/either"

type NetworkError = { type: 'network'; message: string }
type ParseError = { type: 'parse'; details: string }
type ValidationError = { type: 'validation'; field: string }

type AppError = NetworkError | ParseError | ValidationError

function fetchAndValidate(url: string): Either<AppError, Data> {
  return fetchData(url)
    .mapLeft<AppError>(msg => ({ type: 'network', message: msg }))
    .flatMap(parseData)
    .flatMap(validateData)
}
```

### Retry Logic with Try

```typescript
import { Try } from "functype/try"
import { Option } from "functype/option"

function retryOperation<T>(
  operation: () => T,
  maxAttempts: number = 3
): Try<T> {
  let lastError: Error | undefined

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const result = Try(operation)

    if (result.isSuccess()) {
      return result
    }

    lastError = result.fold(
      error => error,
      () => new Error("Unknown error")
    )
  }

  return Try(() => {
    throw lastError ?? new Error("All retry attempts failed")
  })
}

// Usage
const data = retryOperation(() => fetchFromAPI(), 3)
  .recover(error => {
    console.error("Failed after retries:", error)
    return cachedData
  })
```

## Collection Patterns

### GroupBy Implementation

```typescript
import { List } from "functype/list"

interface Item {
  category: string
  name: string
}

const items: Item[] = [
  { category: "fruit", name: "apple" },
  { category: "fruit", name: "banana" },
  { category: "vegetable", name: "carrot" }
]

const grouped = List(items)
  .foldLeft(new Map<string, Item[]>())(
    (acc, item) => {
      const existing = acc.get(item.category) ?? []
      return new Map(acc).set(item.category, [...existing, item])
    }
  )
```

### Partition by Predicate

```typescript
import { List } from "functype/list"

const numbers = List([1, 2, 3, 4, 5, 6])

const [evens, odds] = numbers.toArray().reduce(
  ([e, o], n) => n % 2 === 0 ? [[...e, n], o] : [e, [...o, n]],
  [[] as number[], [] as number[]]
)

// Or using filter
const evens = numbers.filter(n => n % 2 === 0)
const odds = numbers.filter(n => n % 2 !== 0)
```

### Safe Head/Tail Operations

```typescript
import { List } from "functype/list"
import { Option } from "functype/option"

const list = List([1, 2, 3, 4, 5])

// Safe head (first element)
const first = list.headOption()  // Option<number>
  .orElse(0)

// Safe operations on tail
const restSum = list.tail()
  .foldLeft(0)((sum, n) => sum + n)
```

## Async Patterns

### Promise to Either

```typescript
import { Either, Left, Right } from "functype/either"

async function fetchUserSafe(id: string): Promise<Either<Error, User>> {
  try {
    const response = await fetch(`/api/users/${id}`)
    const data = await response.json()
    return Right(data)
  } catch (error) {
    return Left(error as Error)
  }
}

// Usage
const result = await fetchUserSafe("123")
result.fold(
  error => console.error("Failed to fetch user:", error),
  user => console.log("User:", user)
)
```

### Sequential Async Operations

```typescript
import { List } from "functype/list"

async function processInSequence<T, R>(
  items: T[],
  process: (item: T) => Promise<R>
): Promise<R[]> {
  const results: R[] = []

  for (const item of items) {
    const result = await process(item)
    results.push(result)
  }

  return results
}

// Usage with functype
const userIds = List(["1", "2", "3"])
const users = await processInSequence(
  userIds.toArray(),
  async (id) => fetchUser(id)
)
```

## Combining Types

### Option with Either

```typescript
import { Option } from "functype/option"
import { Either, Left, Right } from "functype/either"

// Convert Option to Either
const optionValue: Option<string> = Option("hello")
const eitherValue: Either<string, string> = optionValue
  .fold(
    () => Left("Value not found"),
    (value) => Right(value)
  )

// Or using helper
function optionToEither<E, T>(
  option: Option<T>,
  errorValue: E
): Either<E, T> {
  return option.fold(
    () => Left(errorValue),
    (value) => Right(value)
  )
}
```

### Try to Option

```typescript
import { Try } from "functype/try"
import { Option } from "functype/option"

const result = Try(() => JSON.parse(jsonString))
  .toOption()  // Built-in conversion
  .orElse(defaultObject)
```

## Performance Patterns

### Lazy Evaluation

```typescript
import { Lazy } from "functype/lazy"

// Expensive computation only runs when needed
const expensive = Lazy(() => {
  console.log("Computing...")
  return heavyComputation()
})

// Not computed yet...
console.log("Before access")

// Now it computes (only once)
const value1 = expensive.value()
const value2 = expensive.value()  // Uses cached value
```

### LazyList for Large Datasets

```typescript
import { LazyList } from "functype/lazylist"

// Infinite sequence
const naturals = LazyList.from(0, n => n + 1)

// Only computes what's needed
const firstTenEvens = naturals
  .filter(n => n % 2 === 0)
  .take(10)
  .toArray()  // [0, 2, 4, 6, 8, 10, 12, 14, 16, 18]
```

## Builder Patterns

### Fluent Configuration

```typescript
import { Option } from "functype/option"

class QueryBuilder {
  private _select: string[] = []
  private _where: string[] = []
  private _limit?: number

  select(...fields: string[]): this {
    this._select.push(...fields)
    return this
  }

  where(condition: string): this {
    this._where.push(condition)
    return this
  }

  limit(n: number): this {
    this._limit = n
    return this
  }

  build(): string {
    const select = `SELECT ${this._select.join(", ")}`
    const where = this._where.length > 0
      ? ` WHERE ${this._where.join(" AND ")}`
      : ""
    const limit = Option(this._limit)
      .map(n => ` LIMIT ${n}`)
      .orElse("")

    return select + where + limit
  }
}

// Usage
const query = new QueryBuilder()
  .select("id", "name", "email")
  .where("active = true")
  .limit(10)
  .build()
```

## Type Refinement

### Branded Types with ValidatedBrand

```typescript
import { ValidatedBrand } from "functype/brand"
import { Either } from "functype/either"

// Create branded types with validation
type Email = ValidatedBrand<string, "Email">

const Email = ValidatedBrand<string, "Email">(
  (value): Either<string, string> =>
    value.includes("@")
      ? Right(value)
      : Left("Invalid email format")
)

// Usage
const email = Email.from("test@example.com")
  .fold(
    error => console.error(error),
    validEmail => sendEmail(validEmail)  // Type is Email, not string
  )
```