# New Features in functype

This document summarizes the new functionality added to functype, with code examples for each feature.

## 1. Conditional Expressions (Cond)

Scala-inspired conditional expressions that eliminate early returns and ensure all code paths return values.

### Basic Usage

```typescript
import { Cond } from "@/conditional"

// Simple if/else chain
const size = Cond.of<string>()
  .when(value > 100, "large")
  .elseWhen(value > 50, "medium")
  .else("small")

// With lazy evaluation for expensive operations
const result = Cond.of<number>()
  .when(isPremium, () => calculatePremiumDiscount())
  .when(isLoyal, () => calculateLoyaltyDiscount())
  .else(0)
```

### Pattern Matching

```typescript
// Exhaustive matching for string/number literals
type Status = "pending" | "success" | "error"
const message = Cond.match<Status>(status)({
  pending: "Waiting...",
  success: "Done!",
  error: "Failed!",
})

// With function values
const result = Cond.match(action)({
  compute: () => expensiveComputation(),
  cache: () => getCachedValue(),
  skip: () => defaultValue,
})
```

### Lazy Evaluation

```typescript
// Defers evaluation until needed
const message = Cond.lazy<string>()
  .when(
    () => isError(),
    () => computeErrorMessage(),
  )
  .when(
    () => isWarning(),
    () => computeWarningMessage(),
  )
  .else(() => "Success")

// Complex conditional with expensive checks
const result = Cond.lazy<Action>()
  .when(
    () => user.role === "admin" && checkAdminPermissions(),
    () => ({ type: "admin", permissions: loadAdminPermissions() }),
  )
  .else(() => ({ type: "guest", permissions: [] }))
```

## 2. Pattern Matching (Match)

Type-safe pattern matching with exhaustiveness checking.

### Basic Pattern Matching

```typescript
import { Match } from "@/conditional"

// Match with predicates
const result = Match(value)
  .case((x) => x > 50, "large")
  .case((x) => x > 25, "medium")
  .default("small")

// Match exact values
const message = Match(status)
  .caseValue("pending", "Please wait...")
  .caseValue("success", "Operation completed")
  .default("Unknown status")

// Match multiple values
const dayType = Match(day)
  .caseValues(["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"], "Weekday")
  .caseValues(["Saturday", "Sunday"], "Weekend")
  .default("Invalid day")
```

### Exhaustive Matching

```typescript
// Type-safe exhaustive matching for union types
type Color = "red" | "green" | "blue"
const hex = Match.exhaustive<Color, string>({
  red: "#FF0000",
  green: "#00FF00",
  blue: "#0000FF",
})(color)

// For function values, wrap in object
type Operation = "add" | "subtract" | "multiply"
const ops = Match.exhaustive<Operation, { fn: (a: number, b: number) => number }>({
  add: { fn: (a, b) => a + b },
  subtract: { fn: (a, b) => a - b },
  multiply: { fn: (a, b) => a * b },
})
const compute = ops("multiply").fn
const result = compute(4, 5) // 20
```

### Partial Matching

```typescript
// Partial matching with default
const httpMessage = Match.partial<number, string>({
  200: "OK",
  404: "Not Found",
  500: "Server Error",
}).withDefault("Unknown Status")(httpCode)

// With function default
const getMessage = Match.partial<number, string>({
  0: "Zero",
  1: "One",
  2: "Two",
}).withDefault((n) => `Number: ${n}`)
```

### Guard Patterns

```typescript
// Pattern matching with guard conditions
const grade = Match.withGuards<number, string>([
  [(n) => n >= 90, "A"],
  [(n) => n >= 80, "B"],
  [(n) => n >= 70, "C"],
  [(n) => n >= 60, "D"],
]).withDefault("F")(score)

// With function results
const category = Match.withGuards<number, string>([
  [(n) => n < 13, (n) => `Child (${n} years)`],
  [(n) => n < 20, (n) => `Teenager (${n} years)`],
  [(n) => n < 60, (n) => `Adult (${n} years)`],
]).withDefault("Unknown")(age)
```

## 3. Validated Brands

Runtime validation for branded types with type safety.

### Basic Usage

```typescript
import { ValidatedBrand } from "@/branded"

// Create a custom validated brand
const Email = ValidatedBrand("Email", (s: string) => /^[^@]+@[^@]+\.[^@]+$/.test(s))

const email = Email.of("user@example.com") // Option<Brand<"Email", string>>
const invalid = Email.of("not-an-email") // None

// With Either for error messages
const result = Email.from("test@example.com") // Right(Brand<"Email", string>)
const error = Email.from("invalid") // Left("Invalid Email: validation failed")

// Type guard usage
if (Email.is(value)) {
  // value is Brand<"Email", string>
}
```

### Predefined Brands

```typescript
import { PositiveNumber, NonEmptyString, EmailAddress, BoundedNumber, BoundedString, PatternString } from "@/branded"

// Positive numbers
const price = PositiveNumber.of(19.99) // Some(Brand<"PositiveNumber", number>)
const invalid = PositiveNumber.of(-5) // None

// Non-empty strings
const name = NonEmptyString.of("John") // Some(Brand<"NonEmptyString", string>)

// Email validation
const email = EmailAddress.from("user@example.com")
  .map((email) => sendWelcomeEmail(email))
  .orElse("Invalid email address")

// Bounded numbers
const Percentage = BoundedNumber("Percentage", 0, 100)
const Port = BoundedNumber("Port", 1, 65535)

// Bounded strings
const Username = BoundedString("Username", 3, 20)

// Pattern-based validation
const HexColor = PatternString("HexColor", /^#[0-9a-f]{6}$/i)
const PhoneNumber = PatternString("PhoneNumber", /^\+?[1-9]\d{1,14}$/)
```

### Brand Refinement

```typescript
// Refine existing brands
const SmallPositiveInteger = PositiveNumber.refine("SmallPositiveInteger", (n) => Number.isInteger(n) && n < 100)

// Chain validations
const validNumber = PositiveNumber.unsafeOf(50)
const refined = SmallPositiveInteger.of(validNumber) // Some
```

## 4. Lazy Lists

Efficient lazy evaluation for collections with deferred computation.

### Basic Usage

```typescript
import { LazyList } from "@/list"

// Basic lazy evaluation
const result = LazyList([1, 2, 3, 4, 5])
  .map((x) => x * 2)
  .filter((x) => x > 5)
  .toArray() // [6, 8, 10]

// From generator function
function* naturals() {
  let n = 1
  while (true) yield n++
}

const firstTenSquares = LazyList(naturals())
  .map((x) => x * x)
  .take(10)
  .toArray() // [1, 4, 9, 16, 25, 36, 49, 64, 81, 100]
```

### Infinite Sequences

```typescript
// Powers of 2
const powers = LazyList.iterate(1, (x) => x * 2)
  .take(10)
  .toArray() // [1, 2, 4, 8, 16, 32, 64, 128, 256, 512]

// Fibonacci sequence
const fib = LazyList.iterate([0, 1], ([a, b]) => [b, a + b])
  .map(([a]) => a)
  .take(8)
  .toArray() // [0, 1, 1, 2, 3, 5, 8, 13]

// Repeating values
LazyList.repeat("x", 5).toArray() // ["x", "x", "x", "x", "x"]
LazyList.repeat(0).take(3).toArray() // [0, 0, 0]

// Cycling through values
LazyList.cycle([1, 2, 3]).take(7).toArray() // [1, 2, 3, 1, 2, 3, 1]
```

### Ranges and Generation

```typescript
// Number ranges
LazyList.range(1, 6).toArray() // [1, 2, 3, 4, 5]
LazyList.range(0, 10, 2).toArray() // [0, 2, 4, 6, 8]
LazyList.range(10, 0, -1).toArray() // [10, 9, 8, 7, 6, 5, 4, 3, 2, 1]

// Sum of squares from 1 to 100
const sum = LazyList.range(1, 101)
  .map((x) => x * x)
  .reduce((a, b) => a + b, 0) // 338350

// Generate with function
let counter = 0
LazyList.generate(() => counter++)
  .take(5)
  .toArray() // [0, 1, 2, 3, 4]
```

### Efficient Processing

```typescript
// Process large datasets efficiently
const result = LazyList.range(1, 1000000)
  .filter((x) => x % 2 === 0)
  .map((x) => x * x)
  .take(5)
  .toArray() // [4, 16, 36, 64, 100]
// Only processes enough elements to get 5 results

// Short-circuit on find
const found = LazyList.range(1, 1000000)
  .map((x) => x * x)
  .find((x) => x > 1000) // Stops as soon as found

// Combining lazy lists
const evens = LazyList.range(0, 100, 2)
const odds = LazyList.range(1, 100, 2)
const pairs = evens.zip(odds).take(5).toArray() // [[0,1], [2,3], [4,5], [6,7], [8,9]]
```

## 5. Performance Benchmarking

Infrastructure for measuring and comparing performance.

### Usage

```bash
# Run all benchmarks
pnpm bench

# Run with UI
pnpm bench:ui

# Run specific benchmark
pnpm vitest bench test/benchmark/list.bench.ts
```

### Writing Benchmarks

```typescript
import { bench, describe } from "vitest"

describe("Performance Test", () => {
  bench("operation name", () => {
    // Code to benchmark
    someOperation()
  })

  // Compare implementations
  bench("List map", () => {
    List([1, 2, 3]).map((x) => x * 2)
  })

  bench("LazyList map", () => {
    LazyList([1, 2, 3])
      .map((x) => x * 2)
      .toArray()
  })
})
```

## Integration Examples

### Combining Cond with Option/Either

```typescript
// With Option
const result = Option(value).map((v) =>
  Cond.of<string>()
    .when(v > 10, "large")
    .else("small"),
)

// With Either
const processed = Either.tryCatch(() => riskyOperation()).map((value) =>
  Match(value).case(isValid, processValue).default(handleInvalid),
)
```

### Validated Brands with Pattern Matching

```typescript
const processRequest = (email: string, amount: number) =>
  Match.exhaustive<"valid" | "invalid", Either<string, Receipt>>({
    valid: () => {
      const validEmail = EmailAddress.unsafeOf(email)
      const validAmount = PositiveNumber.unsafeOf(amount)
      return Right(processPayment(validEmail, validAmount))
    },
    invalid: () => Left("Invalid input"),
  })(EmailAddress.is(email) && PositiveNumber.is(amount) ? "valid" : "invalid")
```

### Lazy Processing with Conditional Logic

```typescript
const pipeline = LazyList.range(1, 10000)
  .map((n) => ({
    value: n,
    category: Cond.of<string>()
      .when(n % 15 === 0, "FizzBuzz")
      .elseWhen(n % 3 === 0, "Fizz")
      .elseWhen(n % 5 === 0, "Buzz")
      .else(String(n)),
  }))
  .filter((item) => item.category !== String(item.value))
  .take(20)
  .toArray()
```

## Best Practices

1. **Use Cond for Simple Conditionals**: When you have if/else chains that return values
2. **Use Match for Complex Logic**: When matching on values or need exhaustive checking
3. **Prefer Lazy Evaluation**: Use LazyList when processing large datasets or infinite sequences
4. **Validate Early**: Use ValidatedBrand at system boundaries to ensure data integrity
5. **Combine Features**: These utilities work well together and with existing functype constructs

## Migration Guide

### From if/else to Cond

```typescript
// Before
let result
if (x > 10) {
  result = "large"
} else if (x > 5) {
  result = "medium"
} else {
  result = "small"
}

// After
const result = Cond.of<string>()
  .when(x > 10, "large")
  .elseWhen(x > 5, "medium")
  .else("small")
```

### From switch to Match

```typescript
// Before
switch (status) {
  case "pending":
    return "Waiting..."
  case "success":
    return "Done!"
  case "error":
    return "Failed!"
  default:
    return "Unknown"
}

// After
const result = Match.exhaustive<Status, string>({
  pending: "Waiting...",
  success: "Done!",
  error: "Failed!",
})(status)
```

### From Array operations to LazyList

```typescript
// Before (processes entire array)
const result = hugeArray
  .map((x) => expensiveOperation(x))
  .filter((x) => x > threshold)
  .slice(0, 10)

// After (processes only what's needed)
const result = LazyList(hugeArray)
  .map((x) => expensiveOperation(x))
  .filter((x) => x > threshold)
  .take(10)
  .toArray()
```
