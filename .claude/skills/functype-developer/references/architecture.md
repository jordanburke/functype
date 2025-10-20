# Functype Architecture

Complete guide to functype's architectural patterns and design principles.

## Design Philosophy

Functype follows Scala's functional programming model adapted for TypeScript:

1. **Constructor functions** instead of classes
2. **Immutable** data structures
3. **Type-safe** operations with strict TypeScript
4. **Composable** APIs via function chaining
5. **Consistent** patterns across all types

## Core Patterns

### Constructor Pattern

All types use constructor functions that return objects with methods:

```typescript
// Pattern structure
export function TypeName<T>(value: T): TypeNameType<T> {
  return Base("TypeName", {
    // Interface methods
    map: <B>(f: (val: T) => B) => TypeName(f(value)),
    flatMap: <B>(f: (val: T) => TypeNameType<B>) => f(value),

    // Custom methods
    getValue: () => value,

    // Pipe for composition
    pipe: () => ({
      map: (f: (val: T) => any) => TypeName(value).map(f),
    }),
  })
}

// Companion methods
TypeName.empty = <T>() => TypeName<T>(/* empty value */)
TypeName.from = <T>(source: T[]) => TypeName<T>(/* construct */)
```

**Why not classes?**

- Enables better tree-shaking
- Simpler type inference
- Aligns with functional programming principles
- More flexible composition

### Base Pattern

The `Base` function from `core/base` adds common functionality:

```typescript
import { Base } from "@/core/base"

export function Option<T>(value: T | null | undefined): OptionType<T> {
  if (value == null) {
    return Base("None", {
      map: <B>(_f: (val: T) => B) => Option.none<B>(),
      // ... other methods
    })
  }

  return Base("Some", {
    map: <B>(f: (val: T) => B) => Option(f(value)),
    // ... other methods
  })
}
```

**Base provides:**

- `Typeable` interface with type metadata
- Standard `toString()` method
- Consistent object structure
- Type-safe access to internal state

**Implementation:**

```typescript
export function Base<T extends string, B extends Record<string, any>>(type: T, body: B): Typeable & B {
  return {
    ...body,
    getType: () => type,
    toString: () => `${type}(${JSON.stringify(body)})`,
  }
}
```

### Companion Pattern

Use the `Companion` utility to create function-objects:

```typescript
import { Companion } from "@/core/companion"

// Define constructor
function OptionConstructor<T>(value: T | null | undefined): OptionType<T> {
  // ... implementation
}

// Define companion methods
const OptionCompanion = {
  none: <T>() => OptionConstructor<T>(null),
  some: <T>(value: T) => OptionConstructor(value),
  from: <T>(value: T | null | undefined) => OptionConstructor(value),
}

// Combine constructor and companion
export const Option = Companion(OptionConstructor, OptionCompanion)
```

**Result:**

```typescript
// Constructor usage
const opt = Option(5)

// Companion method usage
const none = Option.none()
const some = Option.some(10)
```

## Type System

### Base Type Constraint

```typescript
import type { Type } from "@/functor"

// Use Type for generic constraints
function process<T extends Type>(value: T): void {
  // T can be any type
}
```

**Never use `any`:**

```typescript
// ❌ Wrong
function process(value: any): void

// ✅ Correct
function process<T extends Type>(value: T): void

// ✅ Or for uncertain types
function process(value: unknown): void
```

### Higher-Kinded Types (HKT)

Functype implements HKT to enable generic programming:

```typescript
// HKT allows abstracting over type constructors
type Functor<F, A> = {
  map<B>(f: (a: A) => B): Functor<F, B>
}

// This allows writing generic functions that work with any Functor
function double<F, A extends number>(fa: Functor<F, A>): Functor<F, A> {
  return fa.map((a) => a * 2)
}

// Works with Option<number>, Either<E, number>, List<number>, etc.
```

### Branded Types

Use the `Brand` module for nominal typing:

```typescript
import { Brand } from "@/brand"

// Create a branded type
type UserId = Brand<string, "UserId">

// Constructor with validation
const UserId = Brand<string, "UserId">(
  (value: string): Either<string, string> => (value.length > 0 ? Right(value) : Left("UserId cannot be empty")),
)

// Usage
const userId = UserId.from("user-123").fold(
  (error) => console.error(error),
  (id) => processUser(id), // id has type UserId, not string
)
```

## Functional Interfaces

### Functor

Maps over contained values while preserving structure:

```typescript
export interface Functor<T> {
  map<B>(f: (value: T) => B): Functor<B>
}

// Example implementation
export function Option<T>(value: T | null | undefined): OptionType<T> {
  if (value == null) {
    return Base("None", {
      map: <B>(_f: (val: T) => B) => Option.none<B>(),
    })
  }

  return Base("Some", {
    map: <B>(f: (val: T) => B) => Option(f(value)),
  })
}
```

**Laws:**

1. Identity: `fa.map(x => x) === fa`
2. Composition: `fa.map(f).map(g) === fa.map(x => g(f(x)))`

### Applicative

Applies wrapped functions to wrapped values:

```typescript
export interface Applicative<T> extends Functor<T> {
  ap<B>(ff: Applicative<(value: T) => B>): Applicative<B>
}

// Example implementation
export function Option<T>(value: T | null | undefined): OptionType<T> {
  return Base("Option", {
    map: /* ... */,
    ap: <B>(ff: OptionType<(value: T) => B>): OptionType<B> => {
      return ff.flatMap(f => Option(value).map(f))
    },
  })
}
```

**Laws:**

1. Identity: `v.ap(pure(x => x)) === v`
2. Homomorphism: `pure(x).ap(pure(f)) === pure(f(x))`
3. Interchange: `u.ap(pure(y)) === pure(f => f(y)).ap(u)`

### Monad

Sequences operations that return wrapped values:

```typescript
export interface Monad<T> extends Applicative<T> {
  flatMap<B>(f: (value: T) => Monad<B>): Monad<B>
}

// Example implementation
export function Option<T>(value: T | null | undefined): OptionType<T> {
  return Base("Option", {
    map: /* ... */,
    ap: /* ... */,
    flatMap: <B>(f: (val: T) => OptionType<B>): OptionType<B> => {
      return value == null ? Option.none<B>() : f(value)
    },
  })
}
```

**Laws:**

1. Left identity: `pure(a).flatMap(f) === f(a)`
2. Right identity: `m.flatMap(pure) === m`
3. Associativity: `m.flatMap(f).flatMap(g) === m.flatMap(x => f(x).flatMap(g))`

### Foldable

Extracts values via pattern matching:

```typescript
export interface Foldable<T> {
  fold<B>(onEmpty: () => B, onValue: (value: T) => B): B
  foldLeft<B>(z: B): (op: (b: B, a: T) => B) => B
  foldRight<B>(z: B): (op: (a: T, b: B) => B) => B
}

// Example implementation
export function Option<T>(value: T | null | undefined): OptionType<T> {
  return Base("Option", {
    fold: <B>(onEmpty: () => B, onValue: (val: T) => B): B => {
      return value == null ? onEmpty() : onValue(value)
    },
    foldLeft:
      <B>(z: B) =>
      (op: (b: B, a: T) => B): B => {
        return value == null ? z : op(z, value)
      },
    foldRight:
      <B>(z: B) =>
      (op: (a: T, b: B) => B): B => {
        return value == null ? z : op(value, z)
      },
  })
}
```

### Traversable

Collections with size, iteration, and reduction:

```typescript
export interface Traversable<T> {
  size: number
  isEmpty: boolean
  contains(value: T): boolean
  reduce<B>(f: (acc: B, value: T) => B, initial: B): B
  reduceRight<B>(f: (value: T, acc: B) => B, initial: B): B
}

// Example implementation
export function List<T>(items: T[]): ListType<T> {
  return Base("List", {
    size: items.length,
    isEmpty: items.length === 0,
    contains: (value: T) => items.includes(value),
    reduce: <B>(f: (acc: B, val: T) => B, initial: B): B => {
      return items.reduce(f, initial)
    },
    reduceRight: <B>(f: (val: T, acc: B) => B, initial: B): B => {
      return items.reduceRight((acc, val) => f(val, acc), initial)
    },
  })
}
```

### Serializable

JSON/YAML/binary serialization:

```typescript
export interface Serializable {
  serialize(): SerializationMethods<T>
}

export interface SerializationMethods<T> {
  toJSON(): string
  toYAML(): string
  toBinary(): Uint8Array
}

// Example implementation
import { createSerializable } from "@/core/serializable"

export function Option<T>(value: T | null | undefined): OptionType<T> {
  return Base("Option", {
    serialize: () =>
      createSerializable({
        type: "Option",
        value: value,
      }),
  })
}
```

## Module Organization

### Directory Structure

```
src/
├── core/           # Base patterns and utilities
│   ├── base.ts
│   ├── companion.ts
│   └── serializable.ts
├── functor/        # Functor type class
├── monad/          # Monad type class
├── option/         # Option type
│   └── index.ts
├── either/         # Either type
│   └── index.ts
└── index.ts        # Main exports

test/
├── option.spec.ts
├── either.spec.ts
└── ...
```

### Index Exports

Each module has an `index.ts` that re-exports its main type:

```typescript
// src/option/index.ts
export { Option } from "./option"
export type { OptionType } from "./option"
```

Main index re-exports everything:

```typescript
// src/index.ts
export { Option } from "./option"
export type { OptionType } from "./option"
export { Either, Left, Right } from "./either"
export type { EitherType } from "./either"
// ...
```

### Package Exports

`package.json` supports selective imports:

```json
{
  "exports": {
    ".": {
      "import": "./dist/esm/index.js",
      "require": "./dist/cjs/index.js",
      "types": "./dist/types/index.d.ts"
    },
    "./option": {
      "import": "./dist/esm/option/index.js",
      "require": "./dist/cjs/option/index.js",
      "types": "./dist/types/option/index.d.ts"
    }
  }
}
```

**Usage:**

```typescript
// Import from main bundle
import { Option, Either } from "functype"
```

## Performance Considerations

### Tree-Shaking

Functype is optimized for tree-shaking:

```json
{
  "sideEffects": false
}
```

This means unused exports are eliminated during bundling.

### Lazy Evaluation

Use `Lazy` and `LazyList` for deferred computation:

```typescript
import { Lazy } from "functype"

const expensive = Lazy(() => heavyComputation())
// Not computed yet

const value = expensive.value() // Computed once
const value2 = expensive.value() // Cached
```

### Immutability Cost

Immutable operations have overhead. For performance-critical code:

```typescript
// ❌ Slow for large lists
let result = List([])
for (let i = 0; i < 10000; i++) {
  result = result.append(i) // Creates new list each time
}

// ✅ Fast with native array, then convert
const items = []
for (let i = 0; i < 10000; i++) {
  items.push(i)
}
const result = List(items) // Single conversion
```

## Error Handling

### Error Patterns

```typescript
// ✅ Use Option for nullable values
Option(value).orElse(default)

// ✅ Use Either for errors with context
validateEmail(email)
  .fold(
    error => console.error(error),
    validEmail => send(validEmail)
  )

// ✅ Use Try for exceptions
Try(() => JSON.parse(str))
  .recover(error => defaultValue)

// ✅ Use Throwable for unexpected errors
throw new Throwable("Unexpected error", { context })
```

### ErrorFormatter

Use for structured error output:

```typescript
import { ErrorFormatter } from "@/core/error"

const error = new Error("Something went wrong")
const formatted = ErrorFormatter.format(error)

console.error(formatted.toString())
// Error: Something went wrong
//   at myFunction (file.ts:10:5)
//   ...
```

## Testing Architecture

### Test Organization

```
test/
├── option.spec.ts          # Option tests
├── either.spec.ts          # Either tests
├── integration/            # Integration tests
│   └── composition.spec.ts
└── property/               # Property-based tests
    └── functor.spec.ts
```

### Test Patterns

```typescript
describe("Option", () => {
  describe("Construction", () => {
    it("should create Some from non-null value", () => {
      const opt = Option(5)
      expect(opt.isSome()).toBe(true)
    })
  })

  describe("Functor Laws", () => {
    it("should satisfy identity", () => {
      const opt = Option(5)
      expect(opt.map((x) => x)).toEqual(opt)
    })
  })
})
```
