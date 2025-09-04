# Design Decision: Removing get() Method in Favor of getOrThrow()

**Date:** September 2025  
**Status:** Implemented  
**Contributors:** Jordan Burke, Claude Code

## Summary

Functype has removed the `get()` method from all data structures (Option, Either, Try, etc.) and replaced it with `getOrThrow(error?: Error)` as the sole unsafe extraction method. This decision aligns with functional programming best practices while providing better error handling than traditional approaches.

## Background

### The Problem with get() Methods

In functional programming libraries like Scala, the `get()` method on containers like `Option` is widely considered an anti-pattern:

1. **Defeats Safety Purpose**: Using `get()` on `None` throws `NoSuchElementException`, undermining Option's null safety guarantees
2. **Community Consensus**: Scala experts consistently advise "never use `Option.get`"
3. **Poor Error Messages**: Generic exceptions provide little context about what went wrong
4. **Cognitive Load**: Having both `get()` and `getOrThrow()` creates confusion about which to use

### Why get() Exists in Scala

Research shows that `Option.get` exists primarily for historical reasons:

- **Java Migration**: Easing transition from Java's imperative style
- **REPL Convenience**: Quick value extraction during interactive development
- **Imperative Support**: Supporting non-functional programming styles

However, the Scala community widely acknowledges "there is no good reason for the `get` method."

## Decision

**We chose to eliminate `get()` entirely and provide only `getOrThrow(error?: Error)` as the unsafe extraction method.**

## Rationale

### 1. Explicit Danger Signaling

```typescript
// Clear that this operation can throw
const value = option.getOrThrow()

// vs. deceptively safe-looking
const value = option.get()
```

The method name `getOrThrow()` immediately signals to developers that this operation is unsafe and can throw exceptions.

### 2. Smart Default Error Handling

Each data structure provides meaningful default errors when no custom error is provided:

```typescript
// Option provides descriptive default
Option.none().getOrThrow()
// throws: Error("Cannot extract value from None")

// Either uses Left value as error
Left("validation failed").getOrThrow()
// throws: Error("validation failed")

// Try uses caught exception
Try(() => {
  throw new Error("oops")
}).getOrThrow()
// throws: Error("oops")
```

### 3. Cleaner API Design

**Before (with both methods):**

```typescript
interface Option<T> {
  get(): T // unsafe, throws on None
  getOrThrow(error?: Error): T // also unsafe, better errors
}
```

**After (single unsafe method):**

```typescript
interface Unsafe<T> {
  getOrThrow(error?: Error): T // only unsafe method
}
```

This reduces cognitive overhead and eliminates decision paralysis about which unsafe method to use.

### 4. TypeScript Context Benefits

TypeScript developers are less familiar with Scala conventions. The explicit `getOrThrow()` naming:

- Is more intuitive for JavaScript/TypeScript developers
- Follows TypeScript community patterns
- Reduces confusion about method safety

### 5. Functional Programming Alignment

This design actively discourages unsafe operations by:

- Making the danger explicit in the method name
- Requiring developers to think about error handling
- Promoting functional alternatives like `getOrElse()`, `fold()`, and `map()`

## Implementation Details

### Interface Hierarchy

```typescript
interface Unsafe<T> {
  getOrThrow(error?: Error): T
}

interface Extractable<T> extends Unsafe<T> {
  getOrElse(defaultValue: T): T
  orElse(alternative: Extractable<T>): Extractable<T>
  orNull(): T | null
  orUndefined(): T | undefined
}
```

### Type-Specific Error Handling

Each data structure implements intelligent default error behavior:

- **Option**: Provides descriptive "Cannot extract value from None" message
- **Either**: Uses the Left value as the thrown error
- **Try**: Re-throws the originally caught exception
- **TaskOutcome**: Uses the contained Throwable as the error

## Benefits Achieved

### 1. Better Error Messages

Instead of generic `NoSuchElementException`, developers get contextual errors that help with debugging.

### 2. Reduced API Surface

One unsafe method instead of two eliminates confusion and reduces documentation burden.

### 3. Explicit Safety Model

The `Unsafe` interface clearly marks dangerous operations, making the type system more expressive about safety guarantees.

### 4. Functional Programming Encouragement

By making unsafe operations explicitly dangerous, developers are naturally guided toward safe functional alternatives.

### 5. TypeScript Ecosystem Alignment

The approach feels natural to TypeScript developers and follows modern JavaScript error handling patterns.

## Alternatives Considered

### 1. Keep Both Methods

**Rejected** because it creates confusion and doesn't solve the fundamental problem of having an unsafe method with a safe-sounding name.

### 2. Remove All Unsafe Methods

**Rejected** because there are legitimate use cases where developers need to extract values and are certain they exist (e.g., after type guards or in test code).

### 3. Use Scala's Exact API

**Rejected** because it perpetuates known design problems from Scala and doesn't take advantage of TypeScript's strengths.

## Migration Impact

### Breaking Change

This is a breaking change for existing code using `get()` methods.

### Migration Path

```typescript
// Before
const value = option.get()

// After
const value = option.getOrThrow()
```

### Tooling Support

The change is mechanically straightforward and can be automated with find-and-replace operations.

## Comparison with Other Libraries

### Scala

- **Problem**: Has both `get()` (dangerous) and community discourages its use
- **Our Solution**: Eliminates the dangerous method entirely

### Java Optional

- **Problem**: Has `get()` method that throws `NoSuchElementException`
- **Our Solution**: Better method naming and smart default errors

### Rust Option

- **Approach**: Uses `unwrap()` which panics, or `expect(msg)` for custom messages
- **Our Solution**: Similar to `expect()` but with smart defaults when no message provided

## Future Considerations

### 1. Linting Rules

Consider adding ESLint rules to catch any accidental reintroduction of `get()` methods.

### 2. Documentation Updates

Ensure all examples and tutorials use the new `getOrThrow()` pattern.

### 3. Community Education

Emphasize the reasoning behind this decision in migration guides and API documentation.

## Conclusion

Removing the `get()` method in favor of `getOrThrow()` represents an evolution beyond traditional functional programming library design. It takes lessons learned from the Scala community's experience and applies them to create a safer, more explicit API that better serves TypeScript developers.

This decision demonstrates that functype is not merely copying Scala's design, but thoughtfully adapting functional programming principles for the TypeScript ecosystem while addressing known pain points in existing implementations.

The result is a cleaner, safer, and more intuitive API that maintains functional programming principles while providing better developer experience than traditional approaches.
