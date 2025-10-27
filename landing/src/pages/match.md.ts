export async function GET() {
  const markdown = `# Pattern Matching

Type-safe pattern matching with Match and Cond for functional control flow.

## Overview

Functype provides two complementary tools for pattern matching and conditional logic:
- **Match**: Pattern matching on values with exhaustiveness checking
- **Cond**: Conditional expressions based on predicates

Both enable functional control flow without early returns or imperative if/else chains.

## Match - Pattern Matching

Match provides type-safe pattern matching with compile-time exhaustiveness checking.

### Basic Usage

\`\`\`typescript
import { Match } from "functype"

type Status = "pending" | "approved" | "rejected" | "cancelled"

const statusMessage = Match<Status, string>()
  .case("pending", "Your request is being processed")
  .case("approved", "Your request has been approved!")
  .case("rejected", "Sorry, your request was rejected")
  .case("cancelled", "Your request was cancelled")
  .exhaustive()

console.log(statusMessage("approved"))  // "Your request has been approved!"
\`\`\`

### With Transformations

\`\`\`typescript
const statusColor = Match<Status, string>()
  .case("pending", () => "yellow")
  .case("approved", () => "green")
  .case("rejected", () => "red")
  .case("cancelled", () => "gray")
  .exhaustive()

const color = statusColor("approved")  // "green"
\`\`\`

### Predicate Matching

\`\`\`typescript
const numberType = Match<number, string>()
  .case(0, "zero")
  .case((n) => n > 0, "positive")
  .case((n) => n < 0, "negative")
  .exhaustive()

console.log(numberType(42))   // "positive"
console.log(numberType(-5))   // "negative"
console.log(numberType(0))    // "zero"
\`\`\`

### Nested Pattern Matching

\`\`\`typescript
type User = {
  name: string
  age: number
  role: "admin" | "user"
  preferences?: { theme: "light" | "dark" }
}

const message = Match<User, string>(user)
  .case(
    { role: "admin", age: (n) => n >= 18, preferences: { theme: "dark" } },
    "Adult admin with dark mode"
  )
  .case(
    { role: "admin" },
    (u) => \`Admin: \${u.name}\`
  )
  .case(
    { role: "user" },
    (u) => \`Regular user: \${u.name}\`
  )
  .when((u) => u.age < 18, "Minor user - restricted access")
  .default("Unknown user type")
\`\`\`

### Exhaustiveness Checking

TypeScript enforces that all cases are covered when using \`.exhaustive()\`:

\`\`\`typescript
type Color = "red" | "green" | "blue"

// ✓ Compiles - all cases covered
const rgb1 = Match<Color, string>()
  .case("red", "#FF0000")
  .case("green", "#00FF00")
  .case("blue", "#0000FF")
  .exhaustive()

// ✗ Compile error - missing "blue" case
const rgb2 = Match<Color, string>()
  .case("red", "#FF0000")
  .case("green", "#00FF00")
  .exhaustive()  // Error: Not all cases covered
\`\`\`

### Default Cases

\`\`\`typescript
const message = Match<Status, string>()
  .case("pending", "Processing")
  .case("approved", "Done")
  .default("Unknown status")  // Handles rejected and cancelled

const value = message("rejected")  // "Unknown status"
\`\`\`

### Reusable Matchers

\`\`\`typescript
type Animal = {
  name: string
  canFly: boolean
  legs: number
}

const classifier = Match.builder<Animal, string>()
  .when((a) => a.canFly, "Flying creature")
  .case({ legs: 0 }, "Legless")
  .case({ legs: 2 }, "Biped")
  .case({ legs: 4 }, "Quadruped")
  .default("Other")
  .build()

const bird = { name: "Robin", canFly: true, legs: 2 }
const snake = { name: "Python", canFly: false, legs: 0 }

console.log(classifier(bird))   // "Flying creature"
console.log(classifier(snake))  // "Legless"
\`\`\`

## Cond - Conditional Expressions

Cond provides functional conditional logic based on predicates.

### Basic Usage

\`\`\`typescript
import { Cond } from "functype"

const grade = Cond<number, string>()
  .case((score) => score >= 90, "A")
  .case((score) => score >= 80, "B")
  .case((score) => score >= 70, "C")
  .case((score) => score >= 60, "D")
  .default("F")

console.log(grade(85))  // "B"
console.log(grade(55))  // "F"
\`\`\`

### With Transformations

\`\`\`typescript
const discount = Cond<number, number>()
  .case(
    (qty) => qty >= 100,
    (qty) => qty * 0.2  // 20% off for 100+
  )
  .case(
    (qty) => qty >= 50,
    (qty) => qty * 0.1  // 10% off for 50+
  )
  .case(
    (qty) => qty >= 10,
    (qty) => qty * 0.05  // 5% off for 10+
  )
  .default(0)

console.log(discount(150))  // 30 (20% of 150)
console.log(discount(5))    // 0 (no discount)
\`\`\`

### Multiple Conditions

\`\`\`typescript
const pricing = Cond<{ quantity: number; premium: boolean }, number>()
  .case(
    ({ quantity, premium }) => premium && quantity >= 100,
    ({ quantity }) => quantity * 10 * 0.3  // 30% off for premium + bulk
  )
  .case(
    ({ quantity, premium }) => premium,
    ({ quantity }) => quantity * 10 * 0.2  // 20% off for premium
  )
  .case(
    ({ quantity }) => quantity >= 100,
    ({ quantity }) => quantity * 10 * 0.1  // 10% off for bulk
  )
  .default(({ quantity }) => quantity * 10)  // Regular price

const cost = pricing({ quantity: 150, premium: true })  // 1050
\`\`\`

## Common Patterns

### State Machine

\`\`\`typescript
type State = "idle" | "loading" | "success" | "error"

const nextState = Match<State, State>()
  .case("idle", "loading")
  .case("loading", "success")
  .case("success", "idle")
  .case("error", "idle")
  .exhaustive()

let state: State = "idle"
state = nextState(state)  // "loading"
\`\`\`

### HTTP Status Codes

\`\`\`typescript
const statusCategory = Cond<number, string>()
  .case((code) => code >= 200 && code < 300, "Success")
  .case((code) => code >= 300 && code < 400, "Redirect")
  .case((code) => code >= 400 && code < 500, "Client Error")
  .case((code) => code >= 500, "Server Error")
  .default("Unknown")

console.log(statusCategory(404))  // "Client Error"
\`\`\`

### Type Discrimination

\`\`\`typescript
type Shape =
  | { type: "circle"; radius: number }
  | { type: "rectangle"; width: number; height: number }
  | { type: "triangle"; base: number; height: number }

const calculateArea = Match<Shape, number>()
  .case(
    { type: "circle" },
    (s) => Math.PI * s.radius ** 2
  )
  .case(
    { type: "rectangle" },
    (s) => s.width * s.height
  )
  .case(
    { type: "triangle" },
    (s) => (s.base * s.height) / 2
  )
  .exhaustive()

const circle = { type: "circle" as const, radius: 5 }
const area = calculateArea(circle)  // ~78.54
\`\`\`

### Complex Business Logic

\`\`\`typescript
type Order = {
  total: number
  isPremium: boolean
  itemCount: number
  country: string
}

const shippingCost = Cond<Order, number>()
  .case(
    (o) => o.isPremium && o.total >= 100,
    0  // Free shipping for premium + $100+
  )
  .case(
    (o) => o.total >= 50,
    5  // $5 flat rate for $50+
  )
  .case(
    (o) => o.country === "US",
    (o) => o.itemCount * 2  // $2 per item in US
  )
  .case(
    (o) => o.country === "CA",
    (o) => o.itemCount * 3  // $3 per item in Canada
  )
  .default((o) => o.itemCount * 5)  // $5 per item international

const cost = shippingCost({
  total: 75,
  isPremium: false,
  itemCount: 3,
  country: "US"
})  // 5
\`\`\`

## When to Use Match vs Cond

### Use Match for:

- Known literal values (status codes, enum-like types)
- Exhaustiveness checking on union types
- Pattern matching on object shapes
- Type discrimination with discriminated unions

### Use Cond for:

- Numeric ranges and thresholds
- Complex boolean conditions
- Priority-based logic (first match wins)
- Conditional transformations

## Benefits Over if/else

### Traditional if/else

\`\`\`typescript
function getGrade(score: number): string {
  if (score >= 90) return "A"
  if (score >= 80) return "B"
  if (score >= 70) return "C"
  if (score >= 60) return "D"
  return "F"
}
\`\`\`

### With Cond (functional, no early returns)

\`\`\`typescript
const getGrade = Cond<number, string>()
  .case((score) => score >= 90, "A")
  .case((score) => score >= 80, "B")
  .case((score) => score >= 70, "C")
  .case((score) => score >= 60, "D")
  .default("F")
\`\`\`

### Advantages

- **No early returns**: Purely functional
- **Reusable**: Create matcher once, use many times
- **Composable**: Chain with other operations
- **Type-safe**: Full TypeScript inference
- **Testable**: Easy to test in isolation

## API Reference

For complete API documentation, see:
- [Match API docs](https://functype.org/api-docs/modules/Match.html)
- [Cond API docs](https://functype.org/api-docs/modules/Cond.html)

## Learn More

- [Do-notation Guide](https://functype.org/do-notation)
- [Option Documentation](https://functype.org/option)
- [Either Documentation](https://functype.org/either)
- [Feature Matrix](https://functype.org/feature-matrix)
`

  return new Response(markdown, {
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
    },
  })
}
