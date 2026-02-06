# Common Functype Patterns

This document provides additional pattern examples and recipes for using functype in real-world scenarios.

## Null Safety Patterns

### Nested Optional Properties

```typescript
import { Option } from "functype"

interface User {
  profile?: {
    settings?: {
      theme?: string
    }
  }
}

// Instead of: user?.profile?.settings?.theme ?? 'light'
const theme = Option(user)
  .flatMap((u) => Option(u.profile))
  .flatMap((p) => Option(p.settings))
  .flatMap((s) => Option(s.theme))
  .orElse("light")
```

### Optional Function Calls

```typescript
import { Option } from "functype"

// Instead of: callback?.()
Option(callback).map((fn) => fn())

// With arguments
Option(callback).map((fn) => fn(arg1, arg2))
```

### Conditional Value Assignment

```typescript
import { Option } from "functype"

// Instead of: const value = condition ? compute() : null
const value = Option(condition ? compute() : null).orElse(defaultValue)

// Or using filter
const value = Option(compute())
  .filter(() => condition)
  .orElse(defaultValue)
```

## Error Handling Patterns

### Validation Chains

```typescript
import { Either, Left, Right } from "functype"

type ValidationError = string
type User = { email: string; age: number; username: string }

const validateEmail = (email: string): Either<ValidationError, string> =>
  email.includes("@") && email.includes(".") ? Right(email) : Left("Invalid email format")

const validateAge = (age: number): Either<ValidationError, number> =>
  age >= 18 ? Right(age) : Left("Must be 18 or older")

const validateUsername = (username: string): Either<ValidationError, string> =>
  username.length >= 3 ? Right(username) : Left("Username must be at least 3 characters")

function createUser(email: string, age: number, username: string): Either<ValidationError, User> {
  return validateEmail(email).flatMap((validEmail) =>
    validateAge(age).flatMap((validAge) =>
      validateUsername(username).map((validUsername) => ({
        email: validEmail,
        age: validAge,
        username: validUsername,
      })),
    ),
  )
}

// Usage
const result = createUser("test@example.com", 25, "alice").fold(
  (error) => console.error("Validation failed:", error),
  (user) => console.log("User created:", user),
)
```

### Multiple Error Types

```typescript
import { Either, Left, Right } from "functype"

type NetworkError = { type: "network"; message: string }
type ParseError = { type: "parse"; details: string }
type ValidationError = { type: "validation"; field: string }

type AppError = NetworkError | ParseError | ValidationError

function fetchAndValidate(url: string): Either<AppError, Data> {
  return fetchData(url)
    .mapLeft<AppError>((msg) => ({ type: "network", message: msg }))
    .flatMap(parseData)
    .flatMap(validateData)
}
```

### Retry Logic with Try

```typescript
import { Try } from "functype"
import { Option } from "functype"

function retryOperation<T>(operation: () => T, maxAttempts: number = 3): Try<T> {
  let lastError: Error | undefined

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const result = Try(operation)

    if (result.isSuccess()) {
      return result
    }

    lastError = result.fold(
      (error) => error,
      () => new Error("Unknown error"),
    )
  }

  return Try(() => {
    throw lastError ?? new Error("All retry attempts failed")
  })
}

// Usage
const data = retryOperation(() => fetchFromAPI(), 3).recover((error) => {
  console.error("Failed after retries:", error)
  return cachedData
})
```

## Collection Patterns

### GroupBy

```typescript
import { List } from "functype"

interface Item {
  category: string
  name: string
}

const items = List<Item>([
  { category: "fruit", name: "apple" },
  { category: "fruit", name: "banana" },
  { category: "vegetable", name: "carrot" },
])

// Built-in groupBy returns Map<K, List<A>>
const grouped = items.groupBy((item) => item.category)
// Map { "fruit" => List([apple, banana]), "vegetable" => List([carrot]) }
```

### Partition by Predicate

```typescript
import { List } from "functype"

const numbers = List([1, 2, 3, 4, 5, 6])

// Built-in partition returns [matching, non-matching]
const [evens, odds] = numbers.partition((n) => n % 2 === 0)
// evens: List([2, 4, 6])
// odds: List([1, 3, 5])
```

### Safe Head/Tail Operations

```typescript
import { List } from "functype"

const list = List([1, 2, 3, 4, 5])

// Safe head (first element) - headOption is a property, not a method
const first = list.headOption.orElse(0) // Option<number>

// Safe last element
const end = list.lastOption.orElse(0) // Option<number>

// tail and init are properties
const restSum = list.tail.foldLeft(0)((sum, n) => sum + n)
const initSum = list.init.foldLeft(0)((sum, n) => sum + n)
```

## Async Patterns

### Promise to Either

```typescript
import { Either, Left, Right } from "functype"

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
  (error) => console.error("Failed to fetch user:", error),
  (user) => console.log("User:", user),
)
```

### Sequential Async Operations

```typescript
import { List } from "functype"

async function processInSequence<T, R>(items: T[], process: (item: T) => Promise<R>): Promise<R[]> {
  const results: R[] = []

  for (const item of items) {
    const result = await process(item)
    results.push(result)
  }

  return results
}

// Usage with functype
const userIds = List(["1", "2", "3"])
const users = await processInSequence(userIds.toArray(), async (id) => fetchUser(id))
```

## Combining Types

### Option with Either

```typescript
import { Option } from "functype"
import { Either, Left, Right } from "functype"

// Convert Option to Either
const optionValue: Option<string> = Option("hello")
const eitherValue: Either<string, string> = optionValue.fold(
  () => Left("Value not found"),
  (value) => Right(value),
)

// Or using helper
function optionToEither<E, T>(option: Option<T>, errorValue: E): Either<E, T> {
  return option.fold(
    () => Left(errorValue),
    (value) => Right(value),
  )
}
```

### Try to Option

```typescript
import { Try } from "functype"
import { Option } from "functype"

const result = Try(() => JSON.parse(jsonString))
  .toOption() // Built-in conversion
  .orElse(defaultObject)
```

## Performance Patterns

### Lazy Evaluation

```typescript
import { Lazy } from "functype"

// Expensive computation only runs when needed
const expensive = Lazy(() => {
  console.log("Computing...")
  return heavyComputation()
})

// Not computed yet...
console.log("Before access")

// Now it computes (only once)
const value1 = expensive.value()
const value2 = expensive.value() // Uses cached value
```

### LazyList for Large Datasets

```typescript
import { LazyList } from "functype"

// Infinite sequence
const naturals = LazyList.from(0, (n) => n + 1)

// Only computes what's needed
const firstTenEvens = naturals
  .filter((n) => n % 2 === 0)
  .take(10)
  .toArray() // [0, 2, 4, 6, 8, 10, 12, 14, 16, 18]
```

## Builder Patterns

### Fluent Configuration

```typescript
import { Option } from "functype"

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
    const where = this._where.length > 0 ? ` WHERE ${this._where.join(" AND ")}` : ""
    const limit = Option(this._limit)
      .map((n) => ` LIMIT ${n}`)
      .orElse("")

    return select + where + limit
  }
}

// Usage
const query = new QueryBuilder().select("id", "name", "email").where("active = true").limit(10).build()
```

## Type Refinement

### Branded Types with ValidatedBrand

```typescript
import { ValidatedBrand, Either, Left, Right } from "functype"

// Create branded types with validation
type Email = ValidatedBrand<string, "Email">

const Email = ValidatedBrand<string, "Email">(
  (value): Either<string, string> => (value.includes("@") ? Right(value) : Left("Invalid email format")),
)

// Usage
const email = Email.from("test@example.com").fold(
  (error) => console.error(error),
  (validEmail) => sendEmail(validEmail), // Type is Email, not string
)
```

## IO Patterns

### Basic Effect Composition

```typescript
import { IO, Tag, Layer } from "functype"

// Define a service
interface UserService {
  findUser(id: string): Promise<User | null>
  saveUser(user: User): Promise<void>
}
const UserService = Tag<UserService>("UserService")

// Create effects that use the service
const getUser = (id: string) =>
  IO.gen(function* () {
    const service = yield* IO.service(UserService)
    const user = yield* IO.tryPromise({
      try: () => service.findUser(id),
      catch: (e) => new UserNotFoundError(id, e),
    })
    return user
  })

// Provide implementation
const live = Layer.fromValue(UserService, {
  findUser: async (id) => db.query(`SELECT * FROM users WHERE id = $1`, [id]),
  saveUser: async (user) => db.query(`INSERT INTO users...`),
})

// Run the program
const user = await getUser("123").provide(live).run()
```

### Error Handling with IO

```typescript
import { IO } from "functype"

class NetworkError extends Error {
  type = "NetworkError" as const
}
class ParseError extends Error {
  type = "ParseError" as const
}

const fetchData = IO.tryPromise({
  try: () => fetch(url),
  catch: () => new NetworkError("Failed to fetch"),
}).flatMap((response) =>
  IO.tryPromise({
    try: () => response.json(),
    catch: () => new ParseError("Failed to parse JSON"),
  }),
)

// Handle specific errors
const result = fetchData
  .catchTag("NetworkError", (e) => IO.succeed(fallbackData))
  .catchTag("ParseError", (e) => IO.succeed(defaultValue))
```

### Resource Management with Bracket

```typescript
import { IO } from "functype"

const program = IO.bracket({
  acquire: IO.sync(() => openConnection()),
  use: (conn) => IO.async(() => conn.query("SELECT * FROM users")),
  release: (conn) => IO.sync(() => conn.close()),
})
// Connection is always closed, even if query fails
```

## Do-Notation Patterns

### Sequential Dependent Operations

```typescript
import { Do, $, Option, Either } from "functype"

// Option comprehension
const userTheme = Do(function* () {
  const user = yield* $(Option(currentUser))
  const profile = yield* $(Option(user.profile))
  const settings = yield* $(Option(profile.settings))
  return settings.theme
}).orElse("light")

// Either validation chain
const validated = Do(function* () {
  const email = yield* $(validateEmail(input.email))
  const age = yield* $(validateAge(input.age))
  const name = yield* $(validateName(input.name))
  return { email, age, name }
})
```

### Cartesian Products

```typescript
import { Do, $, List } from "functype"

// All combinations of x and y
const pairs = Do(function* () {
  const x = yield* $(List([1, 2, 3]))
  const y = yield* $(List(["a", "b"]))
  return `${x}${y}`
})
// List(["1a", "1b", "2a", "2b", "3a", "3b"])
```
