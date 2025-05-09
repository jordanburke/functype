# Functype Type Index

This document provides a comprehensive index of all types and data structures in the Functype library, along with the type classes each implements.

## Core Data Structures

| Data Structure   | Description                                          | Import Path          |
| ---------------- | ---------------------------------------------------- | -------------------- |
| `Option<T>`      | Represents a value that may or may not exist         | `functype/option`    |
| `Either<L, R>`   | Represents a value of one of two possible types      | `functype/either`    |
| `Try<T>`         | Represents a computation that might throw            | `functype/try`       |
| `List<T>`        | Immutable list collection                            | `functype/list`      |
| `Map<K, V>`      | Immutable key-value map                              | `functype/map`       |
| `Set<T>`         | Immutable set collection                             | `functype/set`       |
| `Tuple<...T>`    | Type-safe fixed-length array                         | `functype/tuple`     |
| `FPromise<T, E>` | Enhanced Promise with functional operations          | `functype/fpromise`  |
| `Task<T, E>`     | Represents sync/async operations with error handling | `functype/core/task` |
| `Brand<T, B>`    | Nominal typing for TypeScript                        | `functype/branded`   |
| `Identity<T>`    | Identity monad                                       | `functype/identity`  |
| `Stack<T>`       | Immutable stack collection                           | `functype/stack`     |

## Type Class Implementations

The table below shows which type classes each data structure implements.

| Data Structure   | Functor | Foldable | Matchable | Traversable | Serializable | Typeable | Valuable |
| ---------------- | ------- | -------- | --------- | ----------- | ------------ | -------- | -------- |
| `Option<T>`      | ✅      | ✅       | ✅        | ✅          | ✅           | ✅       | ✅       |
| `Either<L, R>`   | ✅      | ✅       | ✅        | ✅          | ✅           | ✅       | ✅       |
| `Try<T>`         | ✅      | ✅       | ✅        | ✅          | ✅           | ✅       | ✅       |
| `List<T>`        | ✅      | ✅       | ✅        | ✅          | ✅           | ✅       | ✅       |
| `Map<K, V>`      | ✅      | ✅       | ✅        | ❌          | ✅           | ✅       | ✅       |
| `Set<T>`         | ✅      | ✅       | ✅        | ❌          | ✅           | ✅       | ✅       |
| `Tuple<...T>`    | ✅      | ✅       | ❌        | ❌          | ✅           | ✅       | ✅       |
| `FPromise<T, E>` | ✅      | ❌       | ❌        | ❌          | ❌           | ✅       | ❌       |
| `Task<T, E>`     | ✅      | ❌       | ❌        | ❌          | ❌           | ✅       | ❌       |
| `Identity<T>`    | ✅      | ✅       | ✅        | ✅          | ✅           | ✅       | ✅       |
| `Stack<T>`       | ✅      | ✅       | ✅        | ❌          | ✅           | ✅       | ✅       |

## Type Classes

| Type Class       | Description                                         | Interface                                                         |
| ---------------- | --------------------------------------------------- | ----------------------------------------------------------------- |
| `Functor<F>`     | Mappable container types                            | `map<B>(f: (a: A) => B): F<B>`                                    |
| `Foldable<F>`    | Types that can be "folded" to a value               | `fold<B>(onEmpty: () => B, onValue: (a: A) => B): B`              |
| `Matchable<F>`   | Types that support pattern matching                 | `match<B>(patterns: { [key: string]: (...args: any[]) => B }): B` |
| `Traversable<F>` | Types that can be traversed and sequence operations | `traverse<G, B>(f: (a: A) => G<B>): G<F<B>>`                      |
| `Serializable`   | Types that can be serialized                        | `toJSON(): unknown`                                               |
| `Typeable`       | Types with runtime type information                 | `typeName(): string`                                              |
| `Valuable`       | Types with value equality comparison                | `equals(other: unknown): boolean`                                 |

## Detailed Type Constructors

### Option<T>

```typescript
type Option<T> = Some<T> | None
```

**Variants:**

- `Some<T>` - Contains a value of type T
- `None` - Represents no value

### Either<L, R>

```typescript
type Either<L, R> = Left<L, R> | Right<L, R>
```

**Variants:**

- `Left<L, R>` - Contains a value of type L (typically an error)
- `Right<L, R>` - Contains a value of type R (success value)

### Try<T>

```typescript
type Try<T> = Success<T> | Failure<Error>
```

**Variants:**

- `Success<T>` - Contains a successfully computed value
- `Failure<Error>` - Contains an error from a failed computation

### List<T>

```typescript
type List<T> = {
  /* ... methods ... */
  [Symbol.iterator](): Iterator<T>
}
```

Immutable list supporting standard collection operations.

### Map<K, V>

```typescript
type Map<K, V> = {
  /* ... methods ... */
  [Symbol.iterator](): Iterator<[K, V]>
}
```

Immutable key-value map.

### Set<T>

```typescript
type Set<T> = {
  /* ... methods ... */
  [Symbol.iterator](): Iterator<T>
}
```

Immutable set with no duplicate elements.

### FPromise<T, E>

```typescript
type FPromise<T, E> = {
  /* ... methods ... */
  toPromise(): Promise<T>
}
```

Enhanced Promise with better error handling.

### Task<T, E>

```typescript
type Task<T, E> = {
  /* ... methods ... */
  then(onFulfilled: (value: T) => any): Promise<any>
  catch(onRejected: (reason: E) => any): Promise<any>
}
```

Represents synchronous and asynchronous operations.

### Identity<T>

```typescript
type Identity<T> = {
  /* ... methods ... */
  value: T
}
```

Identity monad that simply wraps a value.

## Higher-Kinded Types

Functype provides higher-kinded type emulation through the following interfaces:

```typescript
// Base higher-kinded type
interface HKT<URI, A> {
  readonly _URI: URI
  readonly _A: A
}

// Type-level functions
interface URItoKind<A> {
  readonly Option: Option<A>
  readonly Either: Either<unknown, A>
  readonly List: List<A>
  readonly Try: Try<A>
  readonly Identity: Identity<A>
  // ... other types ...
}
```

This allows for more advanced type operations and generic algorithms across containers.

## Type Utils

| Utility          | Description                               | Import Path          |
| ---------------- | ----------------------------------------- | -------------------- |
| `FoldableUtils`  | Utilities for working with Foldable types | `functype/foldable`  |
| `MatchableUtils` | Utilities for pattern matching            | `functype/matchable` |
| `pipe`           | Function composition utility              | `functype/pipe`      |

## Common Type Patterns

### Option Constructors

```typescript
Option(value) // Some(value) if value is non-null, None otherwise
Some(value) // Some(value) - explicitly create Some variant
None() // None - explicitly create None variant
Option.from(value) // Alias for Option(value)
Option.none() // Alias for None()
Option.some(value) // Alias for Some(value)
```

### Either Constructors

```typescript
Right<L, R>(value) // Right variant with value
Left<L, R>(error) // Left variant with error
Either.right<L, R>(value) // Alias for Right
Either.left<L, R>(error) // Alias for Left
Either.fromNullable(value, error) // Right if value is non-null, Left with error otherwise
```

### Try Constructors

```typescript
Try(() => computation) // Success or Failure depending on if computation throws
Success(value) // Explicitly create Success
Failure(error) // Explicitly create Failure
```

### List Constructors

```typescript
List([1, 2, 3]) // Create from array
List.empty<number>() // Empty list with specified type
```

### Type Class Composition

Example of composing operations using type classes:

```typescript
// Define a function that works with any Functor
function double<F extends HKT<any, number>>(functor: Functor<F, number>): F {
  return functor.map((x) => x * 2)
}

// Works with any Functor
double(Option(5)) // Some(10)
double(Either.right(5)) // Right(10)
double(List([1, 2, 3])) // List([2, 4, 6])
```
