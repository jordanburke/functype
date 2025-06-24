# Functor Type Class Migration Guide

## Overview

functype has refactored its type class hierarchy to better align with functional programming principles. This guide explains the changes and how to migrate your code.

## What Changed

### Before

```typescript
// Functor incorrectly included flatMap
export type Functor<A> = {
  map<B>(f: (value: A) => B): Functor<B>
  flatMap<B>(f: (value: A) => Functor<B>): Functor<B>
}

// Confusing abstract type
export type AbstractFunctor<A> = {
  map(f: (value: A) => Type): AbstractFunctor<Type>
  flatMap(f: (value: A) => AbstractFunctor<Type>): AbstractFunctor<Type>
}

// AsyncFunctor was standalone
export type AsyncFunctor<A> = {
  flatMapAsync(f: (value: A) => PromiseLike<AsyncFunctor<A>>): PromiseLike<AsyncFunctor<A>>
}

// Too specific array type
export type ArrayFunctor<A extends Type[]> = AbstractFunctor<A> & {
  map<U extends Type[]>(f: (value: A) => U): ArrayFunctor<U>
  flatMap<U extends Type[]>(f: (value: A) => ArrayFunctor<U>): ArrayFunctor<U>
}
```

### After

```typescript
// Functor only has map (correct FP definition)
export interface Functor<A extends Type> {
  map<B extends Type>(f: (value: A) => B): Functor<B>
}

// New Applicative interface
export interface Applicative<A extends Type> extends Functor<A> {
  ap<B extends Type>(ff: Applicative<(value: A) => B>): Applicative<B>
}

// Monad has flatMap
export interface Monad<A extends Type> extends Applicative<A> {
  flatMap<B extends Type>(f: (value: A) => Monad<B>): Monad<B>
}

// AsyncMonad extends Monad
export interface AsyncMonad<A extends Type> extends Monad<A> {
  flatMapAsync<B extends Type>(f: (value: A) => Promise<AsyncMonad<B>>): Promise<AsyncMonad<B>>
}
```

## Migration Steps

### 1. If you were extending Functor expecting flatMap

**Before:**

```typescript
interface MyType<T> extends Functor<T> {
  // Used both map and flatMap from Functor
}
```

**After:**

```typescript
interface MyType<T> extends Monad<T> {
  // Now correctly extends Monad which has both map and flatMap
}
```

### 2. If you were using AbstractFunctor

**Before:**

```typescript
interface MyType<T> extends AbstractFunctor<T> {
  // ...
}
```

**After:**

```typescript
interface MyType<T> extends Monad<T> {
  // AbstractFunctor is now aliased to Monad
}
```

### 3. If you were using AsyncFunctor

**Before:**

```typescript
interface MyType<T> extends AsyncFunctor<T> {
  // Only had flatMapAsync
}
```

**After:**

```typescript
interface MyAsyncType<T> extends AsyncMonad<T> {
  // Now also has map, flatMap, ap, and flatMapAsync
}

// Or if you only need the async method:
interface MyAsyncType<T> {
  flatMapAsync<B>(f: (value: T) => Promise<MyAsyncType<B>>): Promise<MyAsyncType<B>>
}
```

### 4. If you were using ArrayFunctor

**Before:**

```typescript
type MyArrayType<T extends Type[]> = ArrayFunctor<T> & {
  // ...
}
```

**After:**

```typescript
// Just define the specific methods you need
type MyArrayType<T extends Type[]> = {
  map<U extends Type[]>(f: (value: T) => U): MyArrayType<U>
  flatMap<U extends Type[]>(f: (value: T) => MyArrayType<U>): MyArrayType<U>
  // ...
}
```

## Benefits

1. **Correct FP Hierarchy**: Follows standard functional programming type class hierarchy
2. **Better Type Inference**: Clearer separation of concerns improves TypeScript's type inference
3. **Extensibility**: New interfaces support declaration merging
4. **Documentation**: Each type class now includes its laws in JSDoc comments

## Type Class Hierarchy

```
Functor (map)
   ↓
Applicative (ap)
   ↓
Monad (flatMap)
   ↓
AsyncMonad (flatMapAsync)
```

## What's New

### Added to functype data structures:

All major functype data structures (Option, Either, List, Lazy) now have the `ap` method, making them closer to true Applicative functors:

```typescript
// Example with Option
const addOne = Option((x: number) => x + 1)
const value = Option(5)
const result = value.ap(addOne) // Some(6)
```

### New Type Classes:

- **Applicative** - Extends Functor with `ap` method
- **Monad** - Extends Applicative with `flatMap` method
- **AsyncMonad** - Extends Monad with `flatMapAsync` method

## Breaking Changes

The following types have been removed:

- `AbstractFunctor` - Use `Monad` instead
- `ArrayFunctor` - Use regular `Functor` or `Monad` with proper type constraints

## Why AsyncFunctor Remains

The `AsyncFunctor` interface is kept because:

1. Existing functype data structures use it extensively
2. While they now have `ap`, they don't extend the full Monad hierarchy due to type compatibility issues
3. They're effectively "monad-like" structures with async support

For new code that needs a complete FP type class hierarchy, use the new interfaces:

- `Functor` for mappable types
- `Applicative` for types with `ap`
- `Monad` for types with `flatMap`
- `AsyncMonad` for types with async operations

## Examples

### Implementing a Functor

```typescript
class Box<T> implements Functor<T> {
  constructor(private value: T) {}

  map<U>(f: (value: T) => U): Box<U> {
    return new Box(f(this.value))
  }
}
```

### Implementing a Monad

```typescript
class Box<T> implements Monad<T> {
  constructor(private value: T) {}

  map<U>(f: (value: T) => U): Box<U> {
    return new Box(f(this.value))
  }

  ap<U>(ff: Box<(value: T) => U>): Box<U> {
    return ff.map((f) => f(this.value))
  }

  flatMap<U>(f: (value: T) => Box<U>): Box<U> {
    return f(this.value)
  }
}
```

## Questions?

If you have questions about this migration, please open an issue on the functype repository.
