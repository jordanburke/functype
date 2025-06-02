# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

# CLAUDE.md - Project Guidelines for functype

## Build & Test Commands

- Build: `pnpm build:prod` (production) or `pnpm build:dev` (development)
- Watch mode: `pnpm build:watch`
- Compile only: `pnpm compile` (runs TypeScript compiler with no emit)
- Lint: `pnpm lint` (format and fix) or `pnpm lint:fix` (fix only)
- Test all: `pnpm test`
- Test single file: `pnpm vitest run test/path/to/file.spec.ts`
- Test watch mode: `pnpm test:watch`
- Test with coverage: `pnpm test:coverage`
- Test with UI: `pnpm test:ui`
- Documentation: `pnpm docs` (generate docs) or `pnpm docs:watch` (watch mode)
- Bundle analysis: `pnpm analyze:size` (analyze production bundle size)

## Core Architecture

### Scala-Inspired Constructor Pattern

All types follow a consistent pattern where constructor functions return objects with methods:

```typescript
// Example pattern used throughout:
const option = Option(value) // Constructor function
option.map((x) => x + 1) // Instance methods
Option.none() // Companion methods via Companion utility
```

### Type System Foundation

- **Base constraint**: Use `Type` from functor module for generic constraints (never `any`)
- **HKT support**: Higher-kinded types are implemented to enable generic programming
- **Branded types**: Use `Brand` module for nominal typing when needed
- **Type classes**: Core interfaces include Functor, Foldable, Traversable, Matchable, Serializable

### Core Abstractions

Every container type implements these key methods:

- `map`: Transform contained values while preserving structure
- `flatMap`: Chain operations that return wrapped values
- `fold`: Extract values via pattern matching
- `pipe`: Enable function composition
- `toString`: Provide readable string representation

### Error Handling Strategy

- **Throwable**: Wrapper for errors that preserves context and stack traces
- **Task**: Handles sync/async operations with cancellation and progress tracking
- **Error patterns**: Use Option/Either/Try for expected failures, Throwable for unexpected
- **Error formatting**: Use ErrorFormatter for structured error output

## Code Style

- **Imports**: Use type-only imports when possible. Organized with simple-import-sort.
- **Types**: Use `Type` from functor. Prefer explicit type annotations.
- **Naming**: Use PascalCase for classes/types, camelCase for functions/variables.
- **Error Handling**: Use Option/Either/Try patterns for error handling.
- **Functional Style**: Follow functional paradigms (immutability, pure functions).
- **Pattern**: Constructor functions return objects with methods, not classes.
- **Paths**: Use absolute imports with @ alias (`import from "@/path"`).
- **Testing**: Use Vitest with describe/it pattern. Test edge cases thoroughly.
- **TypeScript**: Use strict mode, avoid `any` types, prefer `unknown` where needed.
- **Property Testing**: Use fast-check for property-based testing where applicable.

## API Design Pattern

- **Scala-inspired Approach**: Use a hybrid of functional and object-oriented styles:
  - Constructor functions that return objects with methods (e.g., `Option(value)`)
  - Object methods for operations (e.g., `option.map()`, `list.filter()`)
  - Companion functions for additional utilities (e.g., `Option.from()`, `Option.none()`)
- **Consistency**: All modules should follow this pattern to maintain API consistency
- **Companion Pattern**: Use the `Companion` utility to create function-objects where appropriate
- **Immutability**: All data structures must be immutable
- **Composability**: Design for function composition and chaining operations

## Module Organization

- **Index exports**: Each module has an index.ts that re-exports its main type
- **Selective imports**: Package.json exports field enables importing specific modules
- **Base pattern**: Use Base function from core/base to add common functionality
- **Type hierarchy**: Types build on shared abstractions (Functor → Monad → specific types)

## Documentation Standards

- **API Documentation**: Use TypeDoc for generating API documentation
- **JSDoc Comments**: Include for all public APIs with examples for non-obvious types
- **Project Documentation**: Maintain README.md with usage examples
- **Code Comments**: Document unfinished work with TODOs that include context

## Bundle Optimization

- Optimized for tree-shaking with `"sideEffects": false`
- Supports selective module imports to minimize bundle size
- Provides modular exports for different functional types
- ESM-only for modern bundlers
