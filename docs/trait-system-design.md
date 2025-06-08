# Trait System Design for functype

## Overview

This document outlines a proposed trait system for functype that enables runtime type checking while maintaining the library's functional programming principles and TypeScript's compile-time safety.

## Motivation

TypeScript's type system is purely compile-time - all type information is erased during compilation. This creates several challenges:

1. **API Validation**: Cannot verify external data conforms to expected interfaces
2. **Dynamic Dispatch**: Cannot implement behavior based on runtime capabilities
3. **Error Messages**: Runtime errors lack type context, making debugging harder
4. **Library Interop**: Cannot safely determine if objects implement required interfaces

## Design Goals

- **Lightweight**: Minimal memory and performance overhead
- **Non-invasive**: Does not pollute serialized output
- **Type-safe**: Maintains TypeScript's compile-time guarantees
- **Composable**: Works naturally with functype's functional patterns
- **Debuggable**: Easy to inspect and understand at runtime

## Implementation

### Core Concept: Symbol-based Trait Markers

Each trait interface includes a unique Symbol property that serves as a runtime marker:

```typescript
// Define the trait symbol
export const SerializableSymbol = Symbol.for("functype.Serializable")

// Add symbol to the trait interface
export type Serializable<T> = {
  readonly [SerializableSymbol]: true
  serialize(): SerializationMethods<T>
}

// Type guard checks for the symbol
export function isSerializable<T>(value: unknown): value is Serializable<T> {
  return value != null && typeof value === "object" && SerializableSymbol in value && value[SerializableSymbol] === true
}
```

### Why Symbols?

Symbols provide several key advantages:

1. **Automatic Serialization Exclusion**: `JSON.stringify()` ignores Symbol properties
2. **No Name Conflicts**: Symbols are guaranteed unique
3. **Global Registry**: `Symbol.for()` enables cross-module trait checking
4. **JavaScript Standard**: Follows patterns like `Symbol.iterator` and `Symbol.toStringTag`
5. **Developer Tools Support**: Modern debuggers display Symbol properties clearly

### Example Implementation

Here's how Option would implement multiple traits:

```typescript
import { SerializableSymbol } from "@/serializable"
import { FunctorSymbol } from "@/functor"
import { FoldableSymbol } from "@/foldable"

export const Some = <T>(value: T): Option<T> => ({
  _tag: "Some",
  value,
  isEmpty: false,

  // Trait markers
  [SerializableSymbol]: true,
  [FunctorSymbol]: true,
  [FoldableSymbol]: true,

  // Implementations
  map: <U>(f: (value: T) => U) => Some(f(value)),

  serialize: () => ({
    toJSON: () => JSON.stringify({ _tag: "Some", value }),
    toYAML: () => `_tag: Some\nvalue: ${stringify(value)}`,
    toBinary: () => Buffer.from(JSON.stringify({ _tag: "Some", value })).toString("base64"),
  }),

  // ... other methods
})
```

## Usage Patterns

### Runtime Type Checking

```typescript
function processValue(value: unknown) {
  if (isSerializable(value)) {
    // TypeScript knows value has serialize() method
    const json = value.serialize().toJSON()
    localStorage.setItem("cache", json)
  }

  if (isFunctor(value) && isFoldable(value)) {
    // Can safely use both interfaces
    const result = value.map((x) => x * 2).fold(0, (acc, x) => acc + x)
  }
}
```

### Trait-Based Dispatch

```typescript
const traitHandlers = new Map<symbol, (value: any) => void>()

traitHandlers.set(SerializableSymbol, (value) => {
  console.log("Serializing:", value.serialize().toJSON())
})

traitHandlers.set(FunctorSymbol, (value) => {
  console.log("Mapping over functor")
})

function handleByTraits(value: unknown) {
  for (const [symbol, handler] of traitHandlers) {
    if (hasTrait(value, symbol)) {
      handler(value)
    }
  }
}
```

### Debugging Support

```typescript
// Utility to list all traits an object implements
export function getTraits(value: unknown): string[] {
  if (!value || typeof value !== "object") return []

  const traits: string[] = []
  const traitMap = {
    [SerializableSymbol]: "Serializable",
    [FunctorSymbol]: "Functor",
    [FoldableSymbol]: "Foldable",
    // ... other traits
  }

  for (const [symbol, name] of Object.entries(traitMap)) {
    if (symbol in value) {
      traits.push(name)
    }
  }

  return traits
}

// Usage
console.log(getTraits(Option("hello"))) // ['Serializable', 'Functor', 'Foldable', ...]
```

## Benefits

1. **Safe External Data Handling**: Validate objects from APIs, user input, or other libraries
2. **Better Error Messages**: Provide context about what traits were expected vs. found
3. **Progressive Enhancement**: Add runtime checking without breaking existing code
4. **Library Interoperability**: Check if external objects can be used with functype functions
5. **Plugin Systems**: Enable extension based on runtime capabilities

## Potential Concerns and Mitigations

### Memory Overhead

**Concern**: Each object carries extra Symbol properties  
**Mitigation**: Symbols have minimal memory impact, and the benefits outweigh the cost

### Maintenance Burden

**Concern**: Developers might forget to add trait markers  
**Mitigation**: Use factory functions that automatically include required markers

```typescript
// Helper to ensure trait markers are included
function makeSerializable<T extends object>(obj: T, methods: SerializationMethods<T>): T & Serializable<T> {
  return {
    ...obj,
    [SerializableSymbol]: true,
    serialize: () => methods,
  }
}
```

### TypeScript Philosophy

**Concern**: Moves away from structural typing toward nominal typing  
**Mitigation**: This is intentional - we want to ensure objects were created through functype's factory functions with proper guarantees

## Implementation Checklist

- [ ] Define Symbol constants for each trait
- [ ] Add Symbol properties to trait interfaces
- [ ] Implement type guards for each trait
- [ ] Update factory functions to include trait markers
- [ ] Add debugging utilities (getTraits, hasTrait, etc.)
- [ ] Document trait system in API docs
- [ ] Add tests for runtime type checking

## Future Considerations

1. **Trait Composition**: Building complex traits from simpler ones
2. **Versioning**: Adding version info to traits for compatibility
3. **Performance Monitoring**: Tracking trait check performance in production
4. **Development Mode**: Richer debugging info in development builds

## Conclusion

This trait system provides a lightweight, elegant solution for runtime type information in functype. By leveraging JavaScript Symbols, we achieve runtime type safety without compromising serialization, performance, or the functional programming paradigm that makes functype unique.
