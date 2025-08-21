# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Quick Start

- **Prerequisites**: Node.js ≥ 18.0.0, pnpm 10.12.1
- **Install**: `pnpm install`
- **Development**: `pnpm dev` (build with watch mode)
- **Before commit**: `pnpm validate` (format + lint + test + build)
- **Test**: `pnpm test` or `pnpm vitest run test/specific.spec.ts` for single file

## Primary Reference: Feature Matrix

**IMPORTANT**: Always consult the [FUNCTYPE_FEATURE_MATRIX.md](./FUNCTYPE_FEATURE_MATRIX.md) file FIRST when working with functype. This matrix provides:

- Complete overview of all data structures and interfaces
- Which interfaces each data structure implements
- Key methods available for each interface
- Quick reference for understanding library capabilities

## Development Commands

### Pre-Checkin Command

- `pnpm validate` - **Main command**: Format, lint, test, and build everything for checkin

### Formatting

- `pnpm format` - Format code with Prettier (write mode)
- `pnpm format:check` - Check Prettier formatting without writing

### Linting

- `pnpm lint` - Fix ESLint issues (write mode)
- `pnpm lint:check` - Check ESLint issues without fixing

### Testing

- `pnpm test` - Run all tests
- `pnpm vitest run test/path/to/file.spec.ts` - Run specific test file
- `pnpm test:watch` - Run tests in watch mode
- `pnpm test:coverage` - Run tests with coverage report
- `pnpm test:ui` - Run tests with Vitest UI

### Building

- `pnpm build` - Production build (outputs to `dist/`)
- `pnpm build:watch` - Watch mode for continuous building
- `pnpm dev` - Development build with watch mode (alias for build:watch)
- `pnpm compile` - TypeScript compilation check (no emit)
- `pnpm clean` - Remove dist directories

### Performance & Documentation

- `pnpm bench` - Run performance benchmarks
- `pnpm bench:ui` - Run benchmarks with UI
- `pnpm docs` - Generate TypeDoc documentation
- `pnpm docs:watch` - Generate docs in watch mode
- `pnpm analyze:size` - Analyze production bundle size

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

### Base Pattern

The fundamental `Base` function pattern creates objects with type metadata:

```typescript
Base<T>(type: string, body: T)
```

This adds `Typeable` functionality and standard `toString()` methods to all data structures.

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
- **ErrorFormatter**: Use for structured error output

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

## TypeScript Configuration

Key strict settings enabled:

- `strict: true` - Full strict mode
- `noUncheckedIndexedAccess: true` - Safer array/object access
- `strictPropertyInitialization: true` - Ensures properties are initialized
- `verbatimModuleSyntax: true` - Stricter module syntax
- `noErrorTruncation: true` - Full error messages

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
- **Help system**: JSON help files for each module (e.g., `option.help.json`)
- **Tools directory**: Contains AI integration examples and pattern suggestions

## Documentation Standards

- **API Documentation**: Use TypeDoc for generating API documentation
- **JSDoc Comments**: Include for all public APIs with examples for non-obvious types
- **Project Documentation**: Maintain README.md with usage examples
- **Code Comments**: Document unfinished work with TODOs that include context
- **Quick Reference**: See `docs/quick-reference.md` for concise usage examples

## Bundle Optimization

- Optimized for tree-shaking with `"sideEffects": false`
- Supports selective module imports to minimize bundle size
- Provides modular exports for different functional types
- ESM-only for modern bundlers

Example import strategies:

```typescript
// Selective module imports (recommended)
import { Option } from "functype/option"

// Direct constructor imports (smallest bundle)
import { some, none } from "functype/option"
```

## Common Data Structure Patterns

### Creating Instances

```typescript
// Option
const some = Option(value) // Some if value is not null/undefined
const none = Option.none() // None

// Either
const right = Right(value) // Success
const left = Left(error) // Failure

// List
const list = List([1, 2, 3]) // From array
const empty = List.empty<number>() // Empty typed list

// Try
const tryValue = Try(() => risky()) // Wraps exceptions
```

### Common Operations

```typescript
// Transform (map)
option.map((x) => x * 2)
either.map((x) => x.toUpperCase())
list.map((x) => x + 1)

// Chain (flatMap)
option.flatMap((x) => Option(x > 0 ? x : null))
either.flatMap((x) => (validate(x) ? Right(x) : Left("Invalid")))

// Extract (fold/getOrElse)
option.fold(
  () => "empty",
  (x) => `value: ${x}`,
)
either.getOrElse("default")
tryValue.getOrThrow()
```

## Testing Patterns

- **Property Testing**: Use fast-check for property-based tests
- **Edge Cases**: Always test empty/null/undefined cases
- **Type Safety**: Verify type inference works correctly
- **Async Testing**: Use Task for async operation testing
- **Test Structure**: Tests can use `.test.ts` or `.spec.ts` extensions

```typescript
// Example test structure
describe("Option", () => {
  it("should map over Some values", () => {
    const result = Option(5).map((x) => x * 2)
    expect(result.get()).toBe(10)
  })

  it("should handle None correctly", () => {
    const result = Option(null).map((x) => x * 2)
    expect(result.isNone()).toBe(true)
  })
})
```

## Performance Considerations

- **LazyList**: Use for large datasets or infinite sequences
- **Lazy**: Use for expensive computations that may not be needed
- **Task**: Use for async operations that need cancellation
- **Memoization**: Built into Lazy, consider for expensive pure functions

## Available Data Structures

### Fully Implemented

- **Option<T>**: Handle nullable values safely
- **Either<L,R>**: Express success/failure with values
- **Try<T>**: Wrap operations that might throw
- **List<A>**: Immutable array with functional operations
- **Set<A>**: Immutable set with functional operations
- **Map<K,V>**: Immutable map (limited functional support)
- **Lazy<T>**: Deferred computation with memoization
- **Task<T>**: Sync/async operations with cancellation

### Partially Implemented

- **Stack<A>**: LIFO collection with Matchable interface
- **LazyList<A>**: Lazy evaluation for sequences (custom Functor/Monad)
- **Tuple<T[]>**: Fixed-length arrays (custom Functor/Monad)

### Limited Implementation

- **FPromise<T,E>**: Enhanced Promise (only PromiseLike interface)
- **Identity<T>**: Simple wrapper type
- **Ref<T>**: Mutable reference container

## Development Workflow

### Adding New Features

1. Create module directory under `src/` (e.g., `src/mynewtype/`)
2. Create `index.ts` that exports the main type and utilities
3. Add export to `src/index.ts` for main bundle
4. Add export mapping in `package.json` for selective imports
5. Create comprehensive tests in `test/mynewtype.spec.ts`
6. Update FUNCTYPE_FEATURE_MATRIX.md if implementing standard interfaces
7. Run `pnpm validate` to verify everything works correctly

### Working with Type Classes

When implementing a new data structure that supports standard interfaces:

1. Extend appropriate base type (`FunctypeBase` or `FunctypeCollectionBase`)
2. Implement required methods for each interface
3. Use `Base` function from `core/base` to add common functionality
4. Ensure type inference works correctly without explicit annotations
5. Add comprehensive tests for all interface methods
6. Run `pnpm validate` to verify everything works correctly

### Debugging Tips

- Use `toString()` method for readable output of any data structure
- Enable source maps in tsconfig for better stack traces
- Use `ErrorFormatter` for structured error output
- Run tests with `--reporter=verbose` for detailed output
- Use `pnpm dev` for development with better debugging info

## AI Integration Tools

The project includes sophisticated tooling for AI assistance:

- **Pattern Suggestion Tool**: Converts JavaScript patterns to functype equivalents
- **Functype Lookup Tool**: Fuzzy search for functype methods and patterns
- **Example Scripts**: Located in `src/tools/examples/`
- **Pattern Registry**: Compiled transformation patterns for common conversions
