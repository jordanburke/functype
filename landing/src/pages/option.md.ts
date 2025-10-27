export async function GET() {
  const markdown = `# Option<T>

Safe handling of nullable values in TypeScript.

## Overview

Option is a container that either holds a value (Some) or represents the absence of a value (None). It eliminates null pointer exceptions by making nullable values explicit in the type system.

## Key Features

- **Type Safety**: TypeScript enforces explicit handling of empty cases
- **Chainable Operations**: Transform values with map, flatMap, and filter
- **Pattern Matching**: Handle Some/None cases with fold() and match()
- **Composable**: Works seamlessly with Do-notation for complex workflows

## Creating Options

\`\`\`typescript
import { Option, Some, None } from "functype"

// From a value (returns Some if not null/undefined, None otherwise)
const opt1 = Option(5)                    // Some(5)
const opt2 = Option(null)                 // None
const opt3 = Option(undefined)            // None

// Direct construction
const some = Some(42)                     // Some(42)
const none = None()                       // None

// From nullable
const opt4 = Option.fromNullable(value)   // Some(value) or None

// Conditional creation
const opt5 = Option.when(x > 0, x)        // Some(x) if x > 0, else None
\`\`\`

## Transforming Values

\`\`\`typescript
const opt = Option(5)

// map: Transform the value inside
const doubled = opt.map(x => x * 2)       // Some(10)

// flatMap: Chain operations that return Options
const result = opt.flatMap(x =>
  x > 0 ? Some(x * 2) : None()
)

// filter: Keep value only if predicate is true
const filtered = opt.filter(x => x > 3)   // Some(5)

// orElse: Provide alternative Option
const value = None().orElse(Some(10))     // Some(10)
\`\`\`

## Extracting Values

\`\`\`typescript
const opt = Option(42)

// getOrElse: Provide default value
const value1 = opt.getOrElse(0)           // 42
const value2 = None().getOrElse(0)        // 0

// fold: Pattern match on Some/None
const result = opt.fold(
  () => "empty",
  value => \`got \${value}\`
)  // "got 42"

// match: Named pattern matching
const msg = opt.match({
  Some: v => \`Value: \${v}\`,
  None: () => "No value"
})

// orThrow: Get value or throw error
const value3 = opt.orThrow()              // 42
const value4 = None().orThrow()           // throws Error
\`\`\`

## Checking State

\`\`\`typescript
const opt = Option(5)

opt.isSome()        // true
opt.isNone()        // false

None().isSome()     // false
None().isNone()     // true

// Check with predicate
opt.exists(x => x > 3)    // true
\`\`\`

## Working with Collections

\`\`\`typescript
import { Option, List } from "functype"

// Convert to List
const opt = Option(5)
const list = opt.toList()                 // List([5])
None().toList()                           // List([])

// Flatten list of Options
const opts = List([Some(1), None(), Some(3)])
const values = opts.flatMap(x => x)       // List([1, 3])
\`\`\`

## Do-notation

\`\`\`typescript
import { Do, $ } from "functype"

const result = Do(function* () {
  const x = yield* $(Option(5))
  const y = yield* $(Option(10))
  const z = yield* $(Option(15))
  return x + y + z
})
// result: Some(30)

// Short-circuits on None
const failed = Do(function* () {
  const x = yield* $(Option(5))
  const y = yield* $(None())              // Stops here
  const z = yield* $(Option(15))          // Never executed
  return x + y + z
})
// failed: None
\`\`\`

## When to Use Option

### ✓ Use Option for:

- Function return values that might not exist (find, search, lookup)
- Optional configuration values
- Nullable database results
- Chaining operations where any step might fail

### ✗ Avoid Option for:

- Error cases with context (use Either instead)
- Operations that can throw exceptions (use Try instead)
- Boolean flags (use boolean directly)

## Comparison to Alternatives

### Option vs null/undefined

\`\`\`typescript
// Without Option (unsafe)
function findUser(id: string): User | null {
  return users.get(id) ?? null
}
const user = findUser("123")
const name = user.name  // Runtime error if null!

// With Option (safe)
function findUser(id: string): Option<User> {
  return Option(users.get(id))
}
const user = findUser("123")
const name = user.map(u => u.name).getOrElse("Unknown")  // Safe!
\`\`\`

### Option vs Either

- **Option**: Represents presence/absence (Some/None)
- **Either**: Represents success/failure with error information (Right/Left)

\`\`\`typescript
// Option: No error context
const result: Option<number> = None()

// Either: With error context
const result: Either<string, number> = Left("Not found")
\`\`\`

## Common Patterns

### Safe property access

\`\`\`typescript
const user = Option(getUser())
const email = user.flatMap(u => Option(u.email))
const domain = email.map(e => e.split('@')[1])
\`\`\`

### Chaining lookups

\`\`\`typescript
const result = Do(function* () {
  const userId = yield* $(findUserId(username))
  const user = yield* $(findUser(userId))
  const profile = yield* $(loadProfile(user.id))
  return profile
})
\`\`\`

### Providing defaults

\`\`\`typescript
const config = loadConfig()
  .map(c => c.timeout)
  .getOrElse(5000)  // Default timeout
\`\`\`

## API Reference

For complete API documentation, see the [Option API docs](https://functype.org/api-docs/classes/Option.html).

## Learn More

- [Either Documentation](https://functype.org/either)
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
