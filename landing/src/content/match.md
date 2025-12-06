# Match & Cond

Powerful pattern matching and conditional expressions.

## Overview

Match provides exhaustive pattern matching for Scala-style case expressions, while Cond offers functional conditional evaluation without early returns or if-else chains.

## Match

### Basic Usage

```typescript
import { Match } from "functype/conditional"

const result = Match(statusCode)
  .case(200, () => "OK")
  .case(404, () => "Not Found")
  .case(500, () => "Server Error")
  .default(() => "Unknown")
```

### Pattern Matching on Types

```typescript
const describe = Match(value)
  .case(
    (v): v is string => typeof v === "string",
    (s) => `String: ${s}`,
  )
  .case(
    (v): v is number => typeof v === "number",
    (n) => `Number: ${n}`,
  )
  .case(
    (v): v is boolean => typeof v === "boolean",
    (b) => `Boolean: ${b}`,
  )
  .default(() => "Unknown type")
```

### With Functype Types

Option, Either, Try, and other types have built-in match methods:

```typescript
// Option match
const greeting = Option(name).match({
  Some: (n) => `Hello, ${n}!`,
  None: () => "Hello, stranger!",
})

// Either match
const message = result.match({
  Left: (error) => `Error: ${error}`,
  Right: (value) => `Success: ${value}`,
})

// Try match
const output = tryValue.match({
  Success: (v) => `Got: ${v}`,
  Failure: (e) => `Failed: ${e.message}`,
})
```

## Cond

Cond provides conditional expressions without early returns:

### Basic Usage

```typescript
import { Cond } from "functype/conditional"

const grade = Cond<string>()
  .when(score >= 90, () => "A")
  .when(score >= 80, () => "B")
  .when(score >= 70, () => "C")
  .when(score >= 60, () => "D")
  .otherwise(() => "F")
```

### With Predicates

```typescript
const category = Cond<string>()
  .when(age < 13, () => "child")
  .when(age < 20, () => "teenager")
  .when(age < 65, () => "adult")
  .otherwise(() => "senior")
```

### Lazy Evaluation

Cond evaluates lazily - only the matching branch runs:

```typescript
const result = Cond<number>()
  .when(true, () => 1) // This runs
  .when(true, () => expensiveCompute()) // This doesn't run
  .otherwise(() => 0)
```

## Match vs Cond

| Feature  | Match                         | Cond                        |
| -------- | ----------------------------- | --------------------------- |
| Input    | Single value to match against | No input, checks conditions |
| Use Case | Value-based branching         | Predicate-based branching   |
| Pattern  | `Match(value).case(...)`      | `Cond().when(...)`          |

### When to Use Match

```typescript
// Matching on specific values
Match(httpMethod)
  .case("GET", () => handleGet())
  .case("POST", () => handlePost())
  .case("PUT", () => handlePut())
  .default(() => handleOther())

// Matching on discriminated unions
Match(action.type)
  .case("INCREMENT", () => state + 1)
  .case("DECREMENT", () => state - 1)
  .case("RESET", () => 0)
  .default(() => state)
```

### When to Use Cond

```typescript
// Complex conditional logic
const shipping = Cond<number>()
  .when(order.total > 100, () => 0)
  .when(order.isPrime, () => 0)
  .when(order.isLocal, () => 5)
  .otherwise(() => 10)

// Replacing if-else chains
const message = Cond<string>()
  .when(errors.length > 0, () => `${errors.length} errors found`)
  .when(warnings.length > 0, () => `${warnings.length} warnings`)
  .otherwise(() => "All good!")
```

## Key Features

- **Exhaustive Matching**: Type-safe pattern matching with default case enforcement
- **No Early Returns**: Functional style without breaking out of expressions
- **Type Inference**: Full TypeScript type inference for all branches
- **Composable**: Chain multiple conditions and patterns together

## When to Use Match & Cond

- Complex conditional logic with multiple cases (status codes, state machines)
- Avoiding if-else chains and early returns
- Pattern matching on monadic types (Option, Either, Try)
- Expression-based code where you need a value back

## Comparison with if-else

```typescript
// Traditional if-else (imperative)
let result: string
if (status === 200) {
  result = "OK"
} else if (status === 404) {
  result = "Not Found"
} else {
  result = "Unknown"
}

// Match (functional expression)
const result = Match(status)
  .case(200, () => "OK")
  .case(404, () => "Not Found")
  .default(() => "Unknown")
```

## API Reference

See full API documentation at [functype API docs](https://jordanburke.github.io/functype/modules/conditional.html)
