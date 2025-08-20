# Functype Development Guidelines

This document provides essential information for developing and maintaining the Functype project, a functional programming library for TypeScript.

## Build/Configuration Instructions

### Prerequisites

- Node.js v22 or later (as specified in `.nvmrc`)
- pnpm v10 or later (package manager)

### Setup

1. Clone the repository
2. Install dependencies:
   ```bash
   pnpm install
   ```

### Build Commands

- **Development Build**:

  ```bash
  pnpm dev
  ```

- **Production Build**:

  ```bash
  pnpm build
  ```

- **Watch Mode** (for development):

  ```bash
  pnpm build:watch
  ```

- **Type Checking Only**:
  ```bash
  pnpm compile
  ```

### Build Configuration

The project uses the following build tools:

- **TypeScript**: Configuration in `tsconfig.json`
  - Target: ES2020
  - Module: ESNext
  - Strict type checking enabled
  - Path alias: `@/*` maps to `./src/*`

- **tsup**: Configuration in `tsup.config.ts`
  - Bundles the code into ESM format
  - Creates separate entry points for different modules
  - Generates type declarations
  - Minifies code in production builds
  - Outputs to the `dist` directory with `.mjs` extension

## Testing Information

### Testing Framework

The project uses Vitest for testing with the following configuration:

- **Configuration**: `vitest.config.ts`
- **Environment**: Node.js
- **Test Files**: Files matching `**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}`
- **Coverage**: V8 provider with text, JSON, and HTML reporters

### Running Tests

- **Run All Tests**:

  ```bash
  pnpm test
  ```

- **Run Specific Test File**:

  ```bash
  pnpm test path/to/file.spec.ts
  ```

- **Watch Mode**:

  ```bash
  pnpm test:watch
  ```

- **With Coverage**:

  ```bash
  pnpm test:coverage
  ```

- **With UI**:
  ```bash
  pnpm test:ui
  ```

### Writing Tests

Tests should follow these patterns:

1. **File Organization**: Test files should mirror the source file structure
2. **Naming Convention**: Use `*.spec.ts` for test files
3. **Test Structure**: Use `describe` for test suites and `it` for individual tests
4. **Assertions**: Use `expect` with appropriate matchers

#### Example Test

```typescript
import { describe, expect, it } from "vitest"
import { List } from "../../src"

describe("List.filter", () => {
  it("should filter elements based on a predicate", () => {
    const list = List([1, 2, 3, 4, 5])
    const evenNumbers = list.filter((x) => x % 2 === 0)

    expect(evenNumbers.toArray()).toEqual([2, 4])
    expect(evenNumbers.length).toBe(2)
  })

  // Additional test cases...
})
```

### Property-Based Testing

The project uses `fast-check` for property-based testing:

```typescript
import * as fc from "fast-check"
import { describe, expect, it } from "vitest"
import { Option } from "../../src"

describe("Option - Property-based tests", () => {
  it("should satisfy identity law", () => {
    fc.assert(
      fc.property(fc.string(), (value) => {
        const option = Option(value)
        const mapped = option.map((x) => x)
        expect(mapped.getOrElse("default")).toBe(option.getOrElse("default"))
      }),
    )
  })
})
```

## Additional Development Information

### Code Style

The project uses ESLint and Prettier for code style enforcement:

- **Prettier Configuration** (`.prettierrc`):
  - No semicolons
  - Trailing commas in all places
  - Double quotes
  - 120 character line length
  - 2 spaces for indentation

- **ESLint Configuration** (`eslint.config.mjs`):
  - TypeScript ESLint plugin
  - Prettier integration
  - Import sorting

### Linting Commands

- **Lint and Fix**:

  ```bash
  pnpm lint
  ```

- **Format Only**:
  ```bash
  pnpm lint:format
  ```

### Project Structure

The codebase is organized by core type abstractions:

- `core/`: Core abstractions and base utilities
- `collections/`: Collection types
- `option/`, `either/`, `try/`: Functional data types
- `fpromise/`: Functional Promise implementation
- `list/`, `map/`, `set/`: Collection implementations
- `tuple/`: Tuple implementation
- `branded/`: Branded types

### API Design Pattern

The project follows a Scala-inspired approach:

- Constructor functions that return objects with methods
- Object methods for operations
- Companion functions for additional utilities

Example:

```typescript
// Usage pattern
const list = List([1, 2, 3])
const mapped = list.map((x) => x * 2)
```

### Documentation

- **API Documentation**: Generated with TypeDoc

  ```bash
  pnpm docs
  ```

- **JSDoc Comments**: All public APIs should have JSDoc comments

### Functional Programming Guidelines

- **Immutability**: Never mutate data; create new instances with changes
- **Pure Functions**: Functions should not cause side effects
- **Function Composition**: Design for composability of operations
- **Type Safety**: Leverage TypeScript's type system for compile-time safety

### Error Handling

Use functional error handling patterns with `Option`, `Either`, and `Try` types instead of throwing exceptions.

### CI/CD

The project uses GitHub Actions for CI:

- Runs on Ubuntu with Node.js v22 and pnpm v10
- Executes tests on push and pull requests
