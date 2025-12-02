# Functype Interface

The `Functype` interface provides a unified contract for functional data structures in the functype library. It combines commonly implemented functional programming traits into a single interface, making it easier to create consistent and interoperable data structures.

## Overview

The functype library implements multiple functional programming interfaces that data structures commonly implement together:

- **AsyncMonad** - Functor, Applicative, Monad, and AsyncMonad operations
- **Traversable** - Collection-like operations (size, isEmpty, contains, reduce)
- **Extractable** - Safe value extraction methods
- **Serializable** - JSON, YAML, and Binary serialization
- **Pipe** - Function composition
- **Foldable** - Pattern matching and folding operations
- **Matchable** - Tagged union pattern matching

The `Functype` interface combines all of these into a single contract.

## Interface Variants

### Functype<A, Tag>

The complete interface for full-featured functional data structures:

```typescript
export interface Functype<A, Tag extends string = string>
  extends AsyncMonad<A>,
    Traversable<A>,
    Extractable<A>,
    Serializable<A>,
    Pipe<A>,
    Foldable<A>,
    Matchable<A, Tag> {
  readonly _tag: Tag
  toValue(): { _tag: Tag; value: A }
}
```

### FunctypeMinimal<A, Tag>

A minimal version for simpler data structures that don't need the full monadic interface:

```typescript
export interface FunctypeMinimal<A, Tag extends string = string>
  extends Serializable<A>,
    Pipe<A>,
    Foldable<A>,
    Matchable<A, Tag> {
  readonly _tag: Tag
  toValue(): { _tag: Tag; value: A }
}
```

### FunctypeCollection<A, Tag>

Extends Functype with iteration support for collection types:

```typescript
export interface FunctypeCollection<A, Tag extends string = string> extends Functype<A, Tag>, Iterable<A> {}
```

## Usage

### Existing Types

Many functype data structures already implement the required interfaces and can be typed as Functype:

```typescript
import { Option, Either, List } from "functype"
import type { Functype } from "functype/functor"

// Option implements Functype
const opt: Functype<number, "Some" | "None"> = Option(42)

// Either implements most of Functype (except Traversable size/isEmpty/contains)
const either: Either<string, number> = Right(42)

// List implements FunctypeCollection
const list: FunctypeCollection<number, "List"> = List([1, 2, 3])
```

### Creating New Types

To create a new data structure that implements Functype:

```typescript
import type { Functype, Type } from "functype"

type BoxTag = "Empty" | "Full"

class Box<T extends Type> implements Functype<T, BoxTag> {
  constructor(
    public readonly _tag: BoxTag,
    private readonly _value?: T,
  ) {}

  // Implement all required methods...
  map<U extends Type>(f: (value: T) => U): Box<U> {
    return this._tag === "Full" && this._value !== undefined ? new Box<U>("Full", f(this._value)) : new Box<U>("Empty")
  }

  // ... other method implementations
}
```

See `functype-example.ts` for a complete implementation example.

## Benefits

1. **Consistency**: All data structures implementing Functype have the same rich set of operations
2. **Interoperability**: Functions can work with any Functype without knowing the specific type
3. **Type Safety**: The Tag parameter ensures pattern matching is exhaustive
4. **Discoverability**: IDEs can show all available methods when working with Functype

## Common Patterns

### Generic Functions

You can write functions that work with any Functype:

```typescript
function processValue<A, Tag extends string>(functype: Functype<A, Tag>, processor: (value: A) => A): Functype<A, Tag> {
  return functype.map(processor)
}

// Works with any Functype implementation
const result1 = processValue(Option(42), (x) => x * 2)
const result2 = processValue(List([1, 2, 3]), (x) => x * 2)
```

### Pattern Matching

All Functype implementations support pattern matching:

```typescript
function describe<A, Tag extends string>(functype: Functype<A, Tag>): string {
  return functype.match({
    // Pattern matching is type-safe based on the Tag
    // Implementation must handle all possible tags
  } as any) // Type assertion needed for generic matching
}
```

## Migration Guide

If you have an existing data structure that implements most of these interfaces:

1. Add the `Functype` import
2. Update your type declaration to extend `Functype<YourType, YourTags>`
3. Ensure you have `_tag` property and `toValue()` method
4. The TypeScript compiler will guide you through any missing implementations

Example:

```typescript
// Before
type MyType<T> = {
  // ... properties
} & Monad<T> &
  Foldable<T> &
  Serializable<T>

// After
import type { Functype } from "functype/functor"

type MyType<T> = {
  // ... properties
} & Functype<T, "Empty" | "Full">
```
