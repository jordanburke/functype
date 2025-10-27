export async function GET() {
  const markdown = `# Either<L,R>

Express computation results with potential failures using Left (error) and Right (success).

## Overview

Either represents a value that can be one of two types: Left (typically an error) or Right (typically a success value). It's ideal for operations that can fail with meaningful error information.

## Key Features

- **Error Context**: Unlike Option, Either preserves error information
- **Type Safety**: Both error and success types are statically typed
- **Composable**: Chain operations that can fail while preserving errors
- **Railway-Oriented Programming**: Operations continue on Right, short-circuit on Left

## Creating Either Values

\`\`\`typescript
import { Either, Left, Right } from "functype"

// Direct construction
const success = Right<string, number>(42)        // Right(42)
const failure = Left<string, number>("error")    // Left("error")

// From nullable
const either1 = Either.fromNullable(value, "Not found")
// Right(value) if value exists, Left("Not found") otherwise

// From predicate
const either2 = Either.fromPredicate(
  x => x > 0,
  x,
  "Must be positive"
)
\`\`\`

## Transforming Values

\`\`\`typescript
const either = Right<string, number>(5)

// map: Transform success value (Right)
const doubled = either.map(x => x * 2)           // Right(10)
Left("error").map(x => x * 2)                    // Left("error")

// mapLeft: Transform error value (Left)
const detailed = either.mapLeft(e => \`Error: \${e}\`)

// flatMap: Chain operations that return Either
const result = either.flatMap(x =>
  x > 0 ? Right(x * 2) : Left("negative")
)

// bimap: Transform both sides
const both = either.bimap(
  err => \`Error: \${err}\`,
  val => val * 2
)
\`\`\`

## Error Handling

\`\`\`typescript
const either = Right<string, number>(42)

// getOrElse: Provide default on Left
const value1 = either.getOrElse(0)               // 42
const value2 = Left("err").getOrElse(0)          // 0

// orElse: Provide alternative Either
const alt = Left("err").orElse(Right(10))        // Right(10)

// fold: Handle both cases
const result = either.fold(
  err => \`Failed: \${err}\`,
  val => \`Success: \${val}\`
)

// match: Named pattern matching
const msg = either.match({
  Left: e => \`Error: \${e}\`,
  Right: v => \`Value: \${v}\`
})
\`\`\`

## Checking State

\`\`\`typescript
const right = Right<string, number>(42)
const left = Left<string, number>("error")

right.isRight()     // true
right.isLeft()      // false

left.isRight()      // false
left.isLeft()       // true

// Extract values (unsafe - use with care)
right.get()         // 42
left.getLeft()      // "error"
\`\`\`

## Common Patterns

### Validation

\`\`\`typescript
function validateEmail(email: string): Either<string, string> {
  const regex = /^[^@]+@[^@]+\\.[^@]+$/
  return regex.test(email)
    ? Right(email)
    : Left("Invalid email format")
}

function validateAge(age: number): Either<string, number> {
  return age >= 18
    ? Right(age)
    : Left("Must be 18 or older")
}

// Chain validations
const result = validateEmail("user@example.com")
  .flatMap(email =>
    validateAge(25).map(age => ({ email, age }))
  )
// Right({ email: "user@example.com", age: 25 })
\`\`\`

### API Error Handling

\`\`\`typescript
async function fetchUser(id: string): Promise<Either<Error, User>> {
  try {
    const response = await fetch(\`/api/users/\${id}\`)
    if (!response.ok) {
      return Left(new Error(\`HTTP \${response.status}\`))
    }
    const user = await response.json()
    return Right(user)
  } catch (error) {
    return Left(error as Error)
  }
}

// Use the result
const userResult = await fetchUser("123")
const userName = userResult
  .map(u => u.name)
  .getOrElse("Unknown")
\`\`\`

### Accumulating Errors

\`\`\`typescript
function validateUser(data: unknown): Either<string[], User> {
  const errors: string[] = []

  if (!data.name) errors.push("Name is required")
  if (!data.email) errors.push("Email is required")
  if (data.age < 18) errors.push("Must be 18+")

  return errors.length > 0
    ? Left(errors)
    : Right(data as User)
}

const result = validateUser({ name: "", age: 16 })
// Left(["Name is required", "Must be 18+"])
\`\`\`

## Do-notation

\`\`\`typescript
import { Do, $ } from "functype"

const result = Do(function* () {
  const email = yield* $(validateEmail("user@example.com"))
  const age = yield* $(validateAge(25))
  const user = yield* $(createUser(email, age))
  return user
})
// result: Right(user) or Left(first error)

// Short-circuits on first Left
const failed = Do(function* () {
  const email = yield* $(validateEmail("invalid"))  // Left
  const age = yield* $(validateAge(25))             // Never executed
  return { email, age }
})
// failed: Left("Invalid email format")
\`\`\`

## Converting Between Types

\`\`\`typescript
import { Option, Try } from "functype"

const either = Right<string, number>(42)

// To Option (loses error information)
const opt = either.toOption()                // Some(42)
Left("err").toOption()                       // None

// From Option
const e1 = Option(42).toEither("Not found")  // Right(42)
const e2 = None().toEither("Not found")      // Left("Not found")

// From Try
const try1 = Try(() => 42)
const e3 = try1.toEither()                   // Right(42)
\`\`\`

## When to Use Either

### ✓ Use Either for:

- Operations that can fail with meaningful error messages
- Validation with specific error information
- API calls with structured error responses
- Railway-oriented programming patterns

### ✗ Avoid Either for:

- Simple presence/absence (use Option)
- Exceptions you want to catch (use Try)
- Multiple error accumulation (consider ValidatedNel - coming soon)

## Comparison to Alternatives

### Either vs Option

\`\`\`typescript
// Option: No error context
function find(id: string): Option<User> {
  const user = db.get(id)
  return Option(user)  // Just Some or None
}

// Either: With error context
function find(id: string): Either<string, User> {
  const user = db.get(id)
  return user
    ? Right(user)
    : Left(\`User \${id} not found\`)
}
\`\`\`

### Either vs Try

\`\`\`typescript
// Try: For operations that throw
const result = Try(() => JSON.parse(input))

// Either: For operations that return error values
const result = parseJSON(input)  // Returns Either<ParseError, Data>
\`\`\`

## Railway-Oriented Programming

Either enables railway-oriented programming where operations continue on the "success track" (Right) and short-circuit on the "error track" (Left):

\`\`\`typescript
const result = Right(rawData)
  .map(validate)              // Stay on Right if valid
  .flatMap(enrichData)        // Switch to Left if enrichment fails
  .map(transform)             // Only runs if still Right
  .flatMap(saveToDatabase)    // Only runs if still Right
  .fold(
    err => console.error("Failed:", err),
    data => console.log("Success:", data)
  )
\`\`\`

## API Reference

For complete API documentation, see the [Either API docs](https://functype.org/api-docs/classes/Either.html).

## Learn More

- [Option Documentation](https://functype.org/option)
- [Try Documentation](https://functype.org/try)
- [Do-notation Guide](https://functype.org/do-notation)
- [Feature Matrix](https://functype.org/feature-matrix)
`

  return new Response(markdown, {
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
    },
  })
}
