# Tuple Enhanced with Modern TypeScript Features

## What's Improved

Our enhanced `Tuple` implementation leverages modern TypeScript features:

1. **Const type parameters** (TypeScript 5.0+)
2. **Variadic tuple types** (TypeScript 4.0+)
3. **Stronger type inference** for tuple elements

## Examples

### Basic Usage

```typescript
import { Tuple } from "@/tuple"

// Create a tuple with mixed types
const personTuple = Tuple(["John Doe", 42, true])

// Access values with type safety
const name = personTuple.get(0) // Type is string
const age = personTuple.get(1) // Type is number
const active = personTuple.get(2) // Type is boolean

// Transform the tuple
const mapped = personTuple.map((values) => values.map((x) => (typeof x === "number" ? x * 2 : x)))
```

### Preserving Literal Types

```typescript
// Using 'as const' with the enhanced implementation
const literalTuple = Tuple([1, "hello", true] as const)

// TypeScript now knows the exact types:
const first = literalTuple.get(0) // Type is exactly 1 (not just number)
const second = literalTuple.get(1) // Type is exactly 'hello' (not just string)
const third = literalTuple.get(2) // Type is exactly true (not just boolean)

// Benefits:
// - Better type checking
// - Autocomplete shows exact values
// - Prevents invalid index access
```

### Type-Level Utilities (for future improvements)

```typescript
// Example of potential future type utilities
type FirstElement<T extends Tuple<unknown[]>> = T extends Tuple<[infer F, ...unknown[]]> ? F : never

// Extract first element's type
type First = FirstElement<typeof literalTuple> // Would be 1

// Could expand to other utilities like:
// - LastElement
// - RemoveFirst
// - Prepend<T, Item>
// - etc.
```

## When Is This Useful?

1. **Strong typing for heterogeneous collections**:
   - When you need to store different types in a fixed structure
   - When you want type safety beyond what arrays provide

2. **APIs returning fixed-length, mixed-type results**:
   - When a function returns multiple values of different types

3. **Data transformation pipelines**:
   - When you need to transform data while preserving type information

4. **Configuration objects with fixed format**:
   - When config must follow a specific format with specific types at each position
