# Interface-Based Type Classes Design Document

## Executive Summary

This document proposes migrating functype's type class definitions from type aliases to interfaces while maintaining 100% backward compatibility and the library's functional programming principles. This change enables better extensibility, clearer error messages, and improved compiler performance without losing any existing functionality.

## What You Don't Lose

**Critical**: You lose NOTHING by moving to interfaces. Here's what remains exactly the same:

1. **Union Types Still Work**

```typescript
// This stays exactly the same
type Option<T> = Some<T> | None
type Either<L, R> = Left<L> | Right<R>
```

2. **Factory Functions Unchanged**

```typescript
// Same pattern, just better type checking
function Some<T>(value: T): Some<T> {
  return { _tag: "Some", value, map: (f) => Some(f(value)) }
}
```

3. **No Classes Required**

- Interfaces in TypeScript are structural contracts, NOT class blueprints
- Objects satisfy interfaces by shape alone
- No `new` keyword, no `this`, no inheritance

4. **All Current Features Preserved**

- Pattern matching with discriminated unions
- Exhaustive type checking
- Tree-shaking and bundle optimization
- Functional composition

## What You Gain

### 1. Declaration Merging (Extensibility)

**The Killer Feature**: Users and library extensions can add capabilities without forking:

```typescript
// Core functype
interface Functor<T> {
  map<U>(f: (value: T) => U): Functor<U>
}

// User's project or extension library
interface Functor<T> {
  mapAsync<U>(f: (value: T) => Promise<U>): Promise<Functor<U>>
  tap(f: (value: T) => void): Functor<T>
}

// Now ALL Functors have these methods available!
// This is IMPOSSIBLE with type aliases
```

### 2. Superior Error Messages

```typescript
// With interface
interface Serializable<T> {
  serialize(): SerializationMethods<T>
}
// Error: Type 'MyType' does not implement interface 'Serializable<T>'
//        Property 'serialize' is missing

// With type alias
type SerializableType<T> = {
  serialize(): SerializationMethods<T>
}
// Error: Type 'MyType' is not assignable to type '{ serialize(): { toJSON(): string; toYAML(): string; toBinary(): string; } }'
//        Property 'serialize' is missing in type 'MyType' but required in type '{ serialize(): { toJSON(): string; toYAML(): string; toBinary(): string; } }'
```

### 3. Better IDE Support

- Interfaces show by name in tooltips
- Go-to-definition works better
- Find-all-references is more accurate
- Refactoring tools understand interfaces better

### 4. Compiler Performance

TypeScript caches interface definitions by name, while type aliases are re-evaluated at each use site. For a library with complex type hierarchies like functype, this matters.

### 5. Explicit Contracts

Interfaces make type class laws explicit and documentable:

```typescript
/**
 * Functor type class
 *
 * Laws:
 * - Identity: fa.map(x => x) ≡ fa
 * - Composition: fa.map(f).map(g) ≡ fa.map(x => g(f(x)))
 */
interface Functor<T> {
  map<U>(f: (value: T) => U): Functor<U>
}
```

## Design Principles

1. **Backward Compatibility**: All existing code continues to work
2. **Gradual Migration**: Can be adopted incrementally
3. **Type Safety**: No loss of compile-time guarantees
4. **Runtime Transparency**: No runtime overhead or changes
5. **Functional Purity**: No OOP concepts introduced

## Proposed Architecture

### Layer 1: Core Type Class Interfaces

```typescript
// Base capability that all functype types share
interface FunctypeBase {
  readonly _tag: string
  pipe<U>(f: (value: this) => U): U
  toString(): string
}

// Fundamental algebraic type classes
interface Functor<T> extends FunctypeBase {
  map<U>(f: (value: T) => U): Functor<U>
}

interface Applicative<T> extends Functor<T> {
  ap<U>(ff: Functor<(value: T) => U>): Functor<U>
}

interface Monad<T> extends Applicative<T> {
  flatMap<U>(f: (value: T) => Monad<U>): Monad<U>
}

// Data processing type classes
interface Foldable<T> extends FunctypeBase {
  fold<U>(zero: U, f: (acc: U, value: T) => U): U
  foldLeft<U>(zero: U): (f: (acc: U, value: T) => U) => U
  foldRight<U>(zero: U): (f: (value: T, acc: U) => U) => U
}

interface Traversable<T> extends Functor<T>, Foldable<T> {
  readonly size: number
  readonly isEmpty: boolean
  traverse<F, U>(F: Applicative<F>, f: (value: T) => F[U]): F[Traversable<U>]
}

// Effect type classes
interface MonadError<E, T> extends Monad<T> {
  throwError(error: E): MonadError<E, never>
  catchError(f: (error: E) => MonadError<E, T>): MonadError<E, T>
}

interface MonadAsync<T> extends Monad<T> {
  flatMapAsync<U>(f: (value: T) => Promise<MonadAsync<U>>): Promise<MonadAsync<U>>
}

// Utility type classes
interface Matchable<T, Tags extends string> extends FunctypeBase {
  match<U>(patterns: { [K in Tags]: (value: Extract<T, { _tag: K }>) => U }): U
}

interface Serializable<T> extends FunctypeBase {
  serialize(): SerializationMethods<T>
}

interface Eq<T> extends FunctypeBase {
  equals(other: T): boolean
}

interface Ord<T> extends Eq<T> {
  compare(other: T): -1 | 0 | 1
}

// Conversion type classes
interface ToOption<T> {
  toOption(): Option<T>
}

interface ToEither<E, T> {
  toEither(): Either<E, T>
}

interface ToList<T> {
  toList(): List<T>
}

interface ToTask<T> {
  toTask(): Task<T>
}
```

### Layer 2: Concrete Type Definitions

```typescript
// Interfaces for specific type capabilities
interface OptionOps<T>
  extends Monad<T>, Foldable<T>, Matchable<T, "Some" | "None">, Serializable<T>, ToEither<void, T>, ToList<T> {
  readonly _tag: "Some" | "None"
  readonly isEmpty: boolean
  get(): T
  getOrElse(defaultValue: T): T
  orElse(alternative: () => Option<T>): Option<T>
  filter(predicate: (value: T) => boolean): Option<T>
  contains(value: T): boolean
}

// Concrete types still use discriminated unions
type Some<T> = OptionOps<T> & {
  readonly _tag: "Some"
  readonly value: T
  readonly isEmpty: false
}

type None = OptionOps<never> & {
  readonly _tag: "None"
  readonly isEmpty: true
}

type Option<T> = Some<T> | None
```

### Layer 3: Implementation with Symbol Traits

```typescript
// Symbol definitions for runtime trait detection
export const FunctorSymbol = Symbol.for("functype.Functor")
export const MonadSymbol = Symbol.for("functype.Monad")
export const FoldableSymbol = Symbol.for("functype.Foldable")
export const SerializableSymbol = Symbol.for("functype.Serializable")

// Type guards using symbols
export function isFunctor<T>(value: unknown): value is Functor<T> {
  return value != null && typeof value === "object" && FunctorSymbol in value && value[FunctorSymbol] === true
}

// Implementation includes symbols
function Some<T>(value: T): Some<T> {
  return {
    _tag: "Some",
    value,
    isEmpty: false,

    // Symbol markers for runtime trait detection
    [FunctorSymbol]: true,
    [MonadSymbol]: true,
    [FoldableSymbol]: true,
    [SerializableSymbol]: true,

    // Interface implementations
    map: <U>(f: (value: T) => U) => Some(f(value)),
    flatMap: <U>(f: (value: T) => Option<U>) => f(value),
    ap: <U>(ff: Option<(value: T) => U>) => (ff._tag === "Some" ? Some(ff.value(value)) : None),

    fold: <U>(zero: U, f: (acc: U, value: T) => U) => f(zero, value),
    foldLeft:
      <U>(zero: U) =>
      (f: (acc: U, value: T) => U) =>
        f(zero, value),
    foldRight:
      <U>(zero: U) =>
      (f: (value: T, acc: U) => U) =>
        f(value, zero),

    // ... rest of implementation
  }
}
```

## Migration Strategy

### Phase 1: Add Interfaces Alongside Types (Non-Breaking)

```typescript
// Old (keep for compatibility)
export type Functor<T> = {
  map<U>(f: (value: T) => U): Functor<U>
}

// New (add alongside)
export interface IFunctor<T> {
  map<U>(f: (value: T) => U): IFunctor<U>
}

// Factories return intersection
function Some<T>(value: T): Some<T> & IFunctor<T> & IMonad<T>
```

### Phase 2: Deprecate Type Aliases

- Mark type aliases as @deprecated
- Update documentation to use interfaces
- Provide migration guide

### Phase 3: Remove Type Aliases (Major Version)

- Remove deprecated type aliases
- Rename IFunctor → Functor
- Full interface-based system

## Example: Complete Option Implementation

```typescript
// Type class interfaces
interface Functor<T> extends FunctypeBase {
  map<U>(f: (value: T) => U): Functor<U>
}

interface Monad<T> extends Functor<T> {
  flatMap<U>(f: (value: T) => Monad<U>): Monad<U>
}

interface Foldable<T> extends FunctypeBase {
  fold<U>(zero: U, f: (acc: U, value: T) => U): U
}

// Option-specific interface
interface OptionOps<T> extends Monad<T>, Foldable<T>, Serializable<T> {
  readonly _tag: "Some" | "None"
  readonly isEmpty: boolean
  getOrElse(defaultValue: T): T
}

// Concrete types
type Some<T> = OptionOps<T> & { _tag: "Some"; value: T; isEmpty: false }
type None = OptionOps<never> & { _tag: "None"; isEmpty: true }
type Option<T> = Some<T> | None

// Companion with static methods
export const Option = Companion<typeof OptionConstructor, Option<unknown>>(OptionConstructor, {
  of: <T>(value: T) => Some(value),
  none: () => None,
  from: <T>(value: T | null | undefined) => (value == null ? None : Some(value)),
})

// Implementation
function Some<T>(value: T): Some<T> {
  return {
    _tag: "Some",
    value,
    isEmpty: false,

    // Type class implementations
    map: (f) => Some(f(value)),
    flatMap: (f) => f(value),
    fold: (zero, f) => f(zero, value),
    getOrElse: () => value,

    // Serialization
    serialize: () => ({
      toJSON: () => JSON.stringify({ _tag: "Some", value }),
      toYAML: () => `_tag: Some\nvalue: ${value}`,
      toBinary: () => Buffer.from(JSON.stringify({ _tag: "Some", value })),
    }),

    // Base functionality
    pipe: (f) => f(this),
    toString: () => `Some(${value})`,
  }
}

const None: None = {
  _tag: "None",
  isEmpty: true,

  map: () => None,
  flatMap: () => None,
  fold: (zero) => zero,
  getOrElse: (defaultValue) => defaultValue,

  serialize: () => ({
    toJSON: () => JSON.stringify({ _tag: "None" }),
    toYAML: () => "_tag: None",
    toBinary: () => Buffer.from(JSON.stringify({ _tag: "None" })),
  }),

  pipe: (f) => f(None),
  toString: () => "None",
}
```

## Benefits Summary

1. **Extensibility**: Third-party libraries can add methods via declaration merging
2. **Better Errors**: Named interfaces in error messages
3. **Performance**: Cached interface resolution
4. **Discoverability**: Better IDE support
5. **Type Safety**: Same compile-time guarantees
6. **Runtime Traits**: Symbol-based trait detection
7. **Documentation**: Type class laws in interface JSDoc
8. **Interop**: Clear contracts for external libraries

## Conclusion

Moving to interfaces provides significant benefits with zero functionality loss. The migration can be done gradually, maintaining full backward compatibility. This positions functype as a more extensible, maintainable, and developer-friendly functional programming library while preserving its core principles and patterns.
