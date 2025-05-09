# Higher-Kinded Types (HKT)

Higher-kinded types allow for writing generic code that works across different container types like `Option`, `List`, `Either`, and `Try`. This is a powerful abstraction that lets you create algorithms that work with any type that supports certain operations, without having to rewrite them for each specific type.

## Introduction

In functional programming, many operations like `map`, `flatMap`, or `sequence` follow similar patterns across different data structures. The HKT module provides a unified way to work with these operations for any supporting container type.

## Key Concepts

1. **Kind**: A type-level function representing a higher-kinded type relationship
2. **Container Types**: Data structures that contain values (Option, List, Either, etc.)
3. **Type Constructor**: A function that takes a type and returns a new type

## Basic Operations

### Map

Apply a function to a value inside a container:

```typescript
import { Option, HKT } from "functype"

const option = Option(42)
const doubled = HKT.map(option, (x) => x * 2) // Option(84)
```

### FlatMap

Apply a function that returns a container to a value inside a container, then flatten the result:

```typescript
const option = Option(42)
const result = HKT.flatMap(option, (x) => Option(x * 2)) // Option(84)
```

### Flatten

Flatten a nested container:

```typescript
const nestedOption = Option(Option(42))
const flattened = HKT.flatten(nestedOption) // Option(42)
```

## Advanced Operations

### Sequence

Transform a container of containers into a container of container (e.g., `Option<List<A>>` to `List<Option<A>>`):

```typescript
const optionOfList = Option(List([1, 2, 3]))
const listOfOptions = HKT.sequence(optionOfList)
// List([Option(1), Option(2), Option(3)])
```

### Traverse

Transform each element in a container using a function that returns another container type, then sequence the results:

```typescript
const list = List([1, 2, 3])
const result = HKT.traverse(list, (x) => Option(x * 2))
// Option(List([2, 4, 6]))
```

### Applicative (ap)

Apply a function inside a container to a value inside another container:

```typescript
const optionFn = Option((x: number) => x * 2)
const optionValue = Option(21)
const result = HKT.ap(optionFn, optionValue) // Option(42)
```

## Supported Container Types

The HKT module currently supports the following container types:

- `Option<A>`
- `List<A>`
- `Either<E, A>`
- `Try<A>`

## Creating Generic Algorithms

The power of HKT is in creating algorithms that work with any container type:

```typescript
// A function that works with any container implementing map
function increment<F extends (a: number) => any>(container: Kind<F, number>): Kind<F, number> {
  return HKT.map(container, (x) => x + 1)
}

// Works with any container
increment(Option(41)) // Option(42)
increment(List([1, 2, 3])) // List([2, 3, 4])
increment(Right<string, number>(41)) // Right(42)
```

## Implementing Your Own Container Types

To make your custom container types work with HKT, you need to:

1. Implement the appropriate methods (`map`, `flatMap`, etc.)
2. Add type checking in the HKT functions

This allows seamless integration with the rest of the functional programming ecosystem.
