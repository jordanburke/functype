# Conditional Module

This module provides Scala-inspired conditional expressions that avoid early returns and enforce exhaustive pattern matching.

## Cond - Conditional Expressions

Replace traditional if/else chains with functional conditional expressions:

```typescript
import { Cond } from "@/conditional"

// Basic if/else
const result = Cond.of<string>()
  .when(x > 10, "large")
  .else("small")

// Multiple conditions
const grade = Cond.of<string>()
  .when(score >= 90, "A")
  .elseWhen(score >= 80, "B")
  .elseWhen(score >= 70, "C")
  .else("F")

// Lazy evaluation
const message = Cond.lazy<string>()
  .when(
    () => isError(),
    () => computeErrorMessage(),
  )
  .else(() => "Success")
```

## Match - Pattern Matching

Type-safe pattern matching with exhaustiveness checking:

```typescript
import { Match } from "@/conditional"

// Basic matching
const result = Match(value)
  .case((x) => x > 50, "large")
  .case((x) => x > 25, "medium")
  .default("small")

// Exhaustive matching for union types
type Status = "pending" | "success" | "error"
const message = Match.exhaustive<Status, string>({
  pending: "Waiting...",
  success: "Done!",
  error: "Failed!",
})(status)

// Partial matching with default
const httpMessage = Match.partial<number, string>({
  200: "OK",
  404: "Not Found",
  500: "Server Error",
}).withDefault((code) => `Status: ${code}`)(statusCode)

// Guard patterns
const category = Match.withGuards<number, string>([
  [(n) => n < 13, "Child"],
  [(n) => n < 20, "Teenager"],
  [(n) => n < 60, "Adult"],
]).withDefault("Senior")(age)
```

## Integration with functype

These patterns work seamlessly with other functype constructs:

```typescript
// With Option
const maybeValue = Option(someValue).map((v) =>
  Cond.of<string>()
    .when(v > 10, "large")
    .else("small"),
)

// With Either
const result = Either.tryCatch(() => someOperation()).map((value) =>
  Match(value).case(isValid, processValue).default(handleInvalid),
)
```

## Extension Points

This module is designed to be minimal and focused on functype's patterns. For more advanced pattern matching needs:

1. **ts-pattern**: Consider using [ts-pattern](https://github.com/gvergnaud/ts-pattern) for advanced pattern matching with wildcards, guards, and complex nested patterns.

2. **Future TypeScript**: TypeScript may add native pattern matching in the future. Our API is designed to be easily migrated when that happens.

3. **Custom Extensions**: The pattern can be extended with custom matchers:

```typescript
// Example extension point (not implemented)
const CustomMatch = {
  ...Match,
  shape:
    <T>(pattern: Partial<T>) =>
    (value: T) =>
      boolean,
}
```

## Design Philosophy

- **No Early Returns**: All paths must return a value
- **Type Safety**: Exhaustive checking for union types
- **Functional**: Expressions, not statements
- **Composable**: Works with pipes and other functional constructs
- **Minimal**: Simple API for common cases, extensible for complex needs
