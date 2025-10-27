export async function GET() {
  const markdown = `# Functype

A functional programming library for TypeScript with immutable data structures and type-safe patterns.

## Features

- **Type Safety**: Leverage TypeScript's type system for compile-time safety
- **Immutability**: All data structures are immutable by design
- **Composability**: Build complex programs from simple, composable functions
- **Scala-Inspired**: Familiar patterns from Scala's standard library

## Core Types

### Option<T>
Handle nullable values safely with Some and None types. Never deal with null/undefined again.

\`\`\`typescript
import { Option } from "functype"

const user = Option(findUser(id))
const name = user.map(u => u.name).getOrElse("Unknown")
\`\`\`

### Either<L,R>
Express computation results with potential failures using Left (error) and Right (success).

\`\`\`typescript
import { Either, Right, Left } from "functype"

function divide(a: number, b: number): Either<string, number> {
  return b === 0 ? Left("Division by zero") : Right(a / b)
}
\`\`\`

### List<A>
Immutable array with functional operations like map, filter, and reduce.

\`\`\`typescript
import { List } from "functype"

const numbers = List([1, 2, 3, 4])
const doubled = numbers.map(x => x * 2)  // List([2, 4, 6, 8])
\`\`\`

### Task
Handle synchronous and asynchronous operations with structured error handling.

\`\`\`typescript
import { Task } from "functype"

const result = await Task().Async(async () => {
  const data = await fetchData()
  return processData(data)
})
\`\`\`

## Advanced Features

### Do-notation
Scala-like for-comprehensions for monadic composition with optimized performance.

\`\`\`typescript
import { Do, $ } from "functype"

const result = Do(function* () {
  const x = yield* $(Option(5))
  const y = yield* $(Option(10))
  return x + y
})
\`\`\`

### Pattern Matching
Type-safe pattern matching with Match and Cond for functional control flow.

\`\`\`typescript
import { Match } from "functype"

const result = Match<Status, string>(status)
  .case("pending", "Processing...")
  .case("success", "Done!")
  .case("error", "Failed!")
  .exhaustive()
\`\`\`

## Installation

\`\`\`bash
npm install functype
# or
yarn add functype
# or
pnpm add functype
\`\`\`

## Quick Start

\`\`\`typescript
import { Option, Either, List, Do, $ } from "functype"

// Handle nullable values
const maybeUser = Option(getUser(id))
const userName = maybeUser.map(u => u.name).getOrElse("Guest")

// Express failures
const validation = Either.fromNullable(
  validateEmail(email),
  "Invalid email"
)

// Work with collections
const numbers = List([1, 2, 3, 4, 5])
const evens = numbers.filter(n => n % 2 === 0)

// Compose operations
const result = Do(function* () {
  const user = yield* $(maybeUser)
  const email = yield* $(validation)
  return { user, email }
})
\`\`\`

## Learn More

- [Option Documentation](https://functype.org/option)
- [Either Documentation](https://functype.org/either)
- [List Documentation](https://functype.org/list)
- [Task Documentation](https://functype.org/task)
- [Do-notation Guide](https://functype.org/do-notation)
- [Pattern Matching Guide](https://functype.org/match)
- [Feature Matrix](https://functype.org/feature-matrix)
- [API Documentation](https://functype.org/api-docs)

## Resources

- [GitHub Repository](https://github.com/jordanburke/functype)
- [NPM Package](https://www.npmjs.com/package/functype)
- [Issue Tracker](https://github.com/jordanburke/functype/issues)
`

  return new Response(markdown, {
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
    },
  })
}
