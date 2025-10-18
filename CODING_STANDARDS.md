# functype Coding Standards

## Overview

This document outlines coding standards for the Functype project, a functional programming library for TypeScript. These standards aim to ensure code consistency, maintainability, and type safety across the codebase.

## Core Principles

- **Functional Programming**: Embrace functional paradigms including immutability, pure functions, and composition
- **Type Safety**: Leverage TypeScript's type system for compile-time safety
- **Immutability**: All data structures should be immutable by design
- **Composability**: Design APIs that facilitate composition of complex programs from simple components
- **Pattern Consistency**: Follow the Scala-inspired pattern consistently across all modules

## TypeScript Standards

### Type Safety

- **Strict Mode**: Enable strict TypeScript checking with `"strict": true` in tsconfig.
- **No Any**: Never use the `any` type. Use instead:
  - `unknown` for values of uncertain type that require type checking
  - Proper type definitions and interfaces
  - Generic type parameters to preserve type information
  - `never` where appropriate for exhaustiveness checking
- **Type Declarations**: Maintain explicit type declarations for function parameters and return types.
- **Type Guards**: Use type guards for narrow types when working with union types.
- **Typescript Types**: Please use Types over Interfaces when possible

```typescript
// INCORRECT
function transform(value: any): any {
  return value.map((x) => x * 2)
}

// CORRECT
function transform<T extends number>(value: T[]): T[] {
  return value.map((x) => (x * 2) as T)
}

// BETTER with functype
import { List } from "functype"

function transform(value: List<number>): List<number> {
  return value.map((x) => x * 2)
}
```

### Error Handling

- Use functional error handling patterns with `Option`, `Either`, and `Try` types
- Avoid throwing exceptions; instead, return appropriate error containers
- Design for composition of error handling

```typescript
// INCORRECT
function parseNumber(str: string): number {
  const num = parseInt(str, 10)
  if (isNaN(num)) {
    throw new Error("Invalid number")
  }
  return num
}

// CORRECT
import { Either, Left, Right } from "functype"
import { ParseError } from "functype"

function parseNumber(str: string): Either<ParseError, number> {
  const num = parseInt(str, 10)
  if (isNaN(num)) {
    return Left(ParseError(`Invalid number: ${str}`))
  }
  return Right(num)
}
```

## Code Style

### Formatting

Use the following Prettier configuration:

```json
{
  "semi": false,
  "trailingComma": "all",
  "singleQuote": false,
  "printWidth": 120,
  "tabWidth": 2,
  "endOfLine": "auto"
}
```

### Naming Conventions

- **Files**:
  - Use PascalCase for files containing primary type definitions (e.g., `Option.ts`)
  - Use kebab-case for utility files (e.g., `is-iterable.ts`)
- **Variables and Functions**:
  - Use camelCase for variables and function expressions
  - Use PascalCase for constructor functions, types, and interfaces
  - Use ALL_CAPS for constants
- **Types**:
  - Prefer descriptive names that reflect the semantic meaning
  - Suffix type parameters with type category (e.g., `<TValue>`, `<TKey>`)
  - Use `Type` from functor definitions for consistent type representation

### API Design Pattern

- **Scala-inspired Approach**: Follow the hybrid functional and object-oriented style:
  - Constructor functions that return objects with methods (e.g., `Option(value)`)
  - Object methods for operations (e.g., `option.map()`, `list.filter()`)
  - Companion functions for additional utilities (e.g., `Option.from()`, `Option.none()`)
- **Consistency**: All modules should follow this pattern to maintain API consistency
- **Companion Pattern**: Use the `Companion` utility to create function-objects where appropriate

```typescript
// Example using Companion pattern
const FPromiseImpl = <T extends Type, E = unknown>() =>
  // Implementation details
  {
    // Return object with methods
  }

const FPromiseCompanion = {
  resolve: <T, E = never>(value: T): FPromise<T, E> => {
    /*...*/
  },
  reject: <T, E = unknown>(reason: E): FPromise<T, E> => {
    /*...*/
  },
  // Additional static methods
}

export const FPromise = Companion(FPromiseImpl, FPromiseCompanion)

// Usage
const promise = FPromise.resolve(42).map((x) => x * 2)
```

### Import Organization

- Use path aliases with `@/` prefix for imports from project directories
- Group imports in the following order, separated by blank lines:
  1. External library imports
  2. Internal imports using path aliases
  3. Relative imports
  4. Type imports

```typescript
// External imports
import stringify from "safe-stable-stringify"

// Internal imports using path aliases
import { AsyncMonad, Functor } from "@/typeclass"
import { Type } from "@/types"
import { List } from "@/list/List"

// Relative imports (only when necessary)
import { isTypeable } from "../typeable"

// Type imports
import type { Collection } from "@/collections"
```

## Functional Programming Guidelines

- **Pure Functions**: Functions should not cause side effects
- **Immutability**: Never mutate data; create new instances with changes
  - Always use `const` over `let` for variable declarations
  - Never use `var`
  - Avoid reassigning variables; create new variables instead
- **Function Composition**: Design for composability of operations
- **Higher-Order Functions**: Embrace functions that take or return other functions
- **Type-Driven Development**: Let types guide implementation
- **Pattern Matching**: Use functional pattern matching via `.fold()` and similar constructs
- **Algebraic Data Types**: Use sum and product types appropriately

```typescript
// Composition example
const processInput = (input: string): Option<number> =>
  Option(input)
    .map((s) => s.trim())
    .filter((s) => s.length > 0)
    .flatMap((s) => Try(() => parseInt(s, 10)).toOption())
```

## Project Structure

- Organize code by core type abstractions:
  - `core/`: Core abstractions and base utilities
  - `collections/`: Collection types (List, Set, Map)
  - `option/`: Option type implementation
  - `either/`: Either type implementation
  - `try/`: Try type implementation
  - `fpromise/`: FPromise implementation
  - `utility/`: General utilities

## Type Definitions

- Write comprehensive JSDoc comments for type definitions
- Document type parameters clearly
- Include examples in JSDoc comments for non-obvious types
- Follow functional programming terminology conventions

```typescript
/**
 * Option type represents a value that may or may not exist.
 * This is similar to Scala's Option or Haskell's Maybe.
 *
 * @template T - The type of the contained value
 */
export type Option<T extends Type> = {
  /** Tag identifying if this is a Some or None variant */
  readonly _tag: "Some" | "None"

  /** The contained value (undefined for None) */
  readonly value: T | undefined

  // Method definitions...
}
```

## Code Quality and Documentation

- Document all public APIs
- Include JSDoc comments for functions and complex types
- Document the purpose of modules and files
- Keep documentation close to the code it documents
- Examples should be included in documentation when helpful
- **Unfinished work must have a commented TODO associated with it**
  - Include descriptive context about what needs to be done
  - Add your initials and date when appropriate
  - Consider adding GitHub issue references for tracking

```typescript
// Good TODO example
// TODO(JB 2025-03-20): Implement LazyList type for deferred evaluation
// See #123 for requirements

// Bad TODO example (avoid)
// TODO: Fix this
```

## Testing

- Write unit tests for all public APIs and critical functions
- Use property-based testing for data structure invariants
- Test both success and failure paths
- Organize tests to mirror the project structure
- Test edge cases thoroughly

```typescript
// Property-based test example
import * as fc from "fast-check"
import { describe, expect, it } from "vitest"
import { Option, Some, None } from "../../src"

describe("Option - Property-based tests", () => {
  // Identity law: map(x => x) === identity
  it("should satisfy identity law", () => {
    fc.assert(
      fc.property(fc.string(), (value) => {
        const option = Option(value)
        const mapped = option.map((x) => x)
        expect(mapped.orElse("default")).toBe(option.orElse("default"))
      }),
    )
  })
})
```

## Performance Considerations

- Balance functional purity with practical performance
- Understand the performance implications of immutable data structures
- Consider lazy evaluation where appropriate
- Optimize critical paths while maintaining functional principles
- Add runtime complexity information to documentation for collection operations

## Contributing

Before submitting code for review:

1. Ensure all code follows these standards
2. Run `pnpm typecheck` to verify type safety
3. Run `pnpm test` to execute all tests
4. Run `pnpm lint` to check for style issues
5. Update documentation as needed

## Commands

- Build (production): `pnpm build`
- Build (development): `pnpm dev`
- Watch mode: `pnpm build:watch`
- Test all: `pnpm test`
- Test single file: `pnpm vitest run test/path/to/file.spec.ts`
- Test with UI: `pnpm test:ui`
- Lint: `pnpm lint`
- Format only: `pnpm lint:format`
- Documentation: `pnpm docs`

## Additional Resources

- [TypeScript Documentation](https://www.typescriptlang.org/docs/)
- [Functional Programming in TypeScript](https://www.typescriptlang.org/docs/handbook/typescript-in-5-minutes-func.html)
- [Scala Standard Library](https://www.scala-lang.org/api/current/)
- [Functional Programming Design Patterns](https://fsharpforfunandprofit.com/fppatterns/)
