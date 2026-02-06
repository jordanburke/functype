# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Quick Start

- **Prerequisites**: Node.js ≥ 18.0.0, pnpm 10.x
- **Install**: `pnpm install`
- **Development**: `pnpm dev` (build with watch mode)
- **Before commit**: `pnpm validate` (format + lint + test + build)
- **Test**: `pnpm test` or `pnpm vitest run test/specific.spec.ts` for single file
- **CLI docs**: `npx functype` for LLM-optimized API reference

## Primary Reference: Feature Matrix

**IMPORTANT**: Always consult [docs/FUNCTYPE_FEATURE_MATRIX.md](./docs/FUNCTYPE_FEATURE_MATRIX.md) FIRST when working with functype. This matrix shows which interfaces each data structure implements and key methods available.

## Development Commands

All commands use `ts-builds` under the hood for standardized tooling.

### Core Workflow

- `pnpm validate` - **Main command**: Format, lint, test, and build (run before commit!)
- `pnpm dev` - Development build with watch mode
- `pnpm build` - Production build (outputs to `dist/`)
- `pnpm compile` - TypeScript compilation check (no emit)

### Testing

- `pnpm test` - Run all tests
- `pnpm vitest run test/path/to/file.spec.ts` - Run specific test file
- `pnpm test:watch` - Run tests in watch mode
- `pnpm test:coverage` - Run tests with coverage report

### Formatting & Linting

- `pnpm format` / `pnpm format:check` - Format code with Prettier
- `pnpm lint` / `pnpm lint:check` - Fix/check ESLint issues

### Documentation & Analysis

- `pnpm docs` - Generate TypeDoc documentation
- `pnpm docs:sync` - Sync feature matrix and validate docs
- `pnpm docs:validate` - Run all documentation validation checks
- `pnpm bench` - Run performance benchmarks
- `pnpm analyze:size` - Analyze production bundle size

### Landing Site

- `pnpm landing:dev` - Start landing site dev server
- `pnpm landing:build` - Build landing site for production

## Core Architecture

### Scala-Inspired Constructor Pattern

All types follow a consistent pattern using the `Companion` utility:

```typescript
const option = Option(value) // Constructor function
option.map((x) => x + 1) // Instance methods
Option.none() // Companion methods
```

### Type System

- **Base constraint**: Use `Type` from types module for generic constraints (never `any`)
- **HKT**: Higher-kinded types enable generic programming across containers
- **Branded types**: Use `Brand` module for nominal typing
- **Type classes**: Functor, Applicative, Monad, Foldable, Traversable, Matchable, Serializable

### Key Interfaces

Two base interfaces define the type hierarchy (see `src/functype/Functype.ts`):

- **`Functype<A, Tag>`**: Single-value containers (Option, Either, Try, Lazy) with Extractable + Matchable
- **`FunctypeCollection<A, Tag>`**: Collections (List, Set) with Iterable + CollectionOps

Core methods available on all containers: `map`, `flatMap`, `fold`, `pipe`, `toString`

### Error Handling

- **Option/Either/Try**: For expected, recoverable failures
- **Throwable**: Enhanced error wrapper preserving context and stack traces
- **Task**: Sync/async operations returning `TaskOutcome<T>` with Ok/Err pattern
- **IO<R,E,A>**: Lazy effect type with typed errors and dependency injection

## Code Style

- **Imports**: Type-only imports when possible, organized with simple-import-sort
- **Paths**: Absolute imports with `@/` alias (e.g., `import from "@/option"`)
- **Types**: Use `Type` constraint, never `any`, prefer `unknown`
- **Pattern**: Constructor functions returning objects, not classes
- **Testing**: Vitest with describe/it, fast-check for property-based tests

## TypeScript Configuration

Strict mode with additional safety:

- `noUncheckedIndexedAccess: true` - Safer array/object access
- `verbatimModuleSyntax: true` - Stricter imports/exports
- `noImplicitReturns: true` - All code paths must return

## Module Organization

- Each module has `index.ts` re-exporting its main type
- Package.json `exports` field enables selective imports: `import { Option } from "functype/option"`
- Use `Base` function from `core/base` to add Typeable and toString to new types

## Adding New Data Structures

1. Create module directory under `src/` (e.g., `src/mynewtype/`)
2. Implement the type extending `Functype<A, Tag>` or `FunctypeCollection<A, Tag>`
3. Use `Companion()` utility to combine constructor with companion methods
4. Create `index.ts` that re-exports the main type
5. Add export to `src/index.ts` and `package.json` exports field
6. Create tests in `test/mynewtype.spec.ts`
7. Update `docs/FUNCTYPE_FEATURE_MATRIX.md` with interface support
8. Run `pnpm validate`

## Adding Methods to Existing Data Structures

1. Add to shared interface (e.g., `CollectionOps` in `src/typeclass/ContainerOps.ts`) if applicable
2. Implement in ALL types extending that interface (List, Set, etc.)
3. Override return types in type-specific interfaces
4. Add JSDoc comments and tests
5. Run `pnpm extract:interfaces` to regenerate CLI interfaces
6. Update `src/cli/data.ts` with new method entries
7. Update `docs/FUNCTYPE_FEATURE_MATRIX.md`
8. Run `pnpm docs:sync` to sync feature matrix to landing site
9. Update `landing/src/content/<type>.md` with examples
10. Update `.claude/skills/functype/references/quick-reference.md`
11. Update `.claude/skills/functype/references/common-patterns.md` if workarounds become built-in
12. Run `pnpm validate`

See `.claude/skills/functype-developer/references/adding-methods.md` for the full checklist.

## Documentation Updates

When changing public APIs:

- Update JSDoc comments in source (appears in TypeDoc automatically)
- Update `docs/FUNCTYPE_FEATURE_MATRIX.md` if interface support changes
- Run `pnpm docs:sync` to sync feature matrix to landing site
- Run `pnpm validate` before committing

## Functype API Quick Reference (v0.44.0+)

```typescript
// List - immutable array
List([1, 2, 3])              // create from array
List.of(1, 2, 3)             // variadic factory
List.empty<number>()         // typed empty list
list.concat(other)           // combine lists (returns new List)
list.toArray()               // convert back to array
list.filter(fn).map(fn)      // transforms
list.isEmpty                 // check if empty (property)

// Set - immutable set
Set([1, 2, 3])               // create from array
Set.of(1, 2, 3)              // variadic factory
Set.empty<number>()          // typed empty set
set.add(value)               // add value (returns new Set)
set.toArray()                // convert to array

// Map - immutable key-value store
Map([["a", 1], ["b", 2]])    // create from pairs
Map.of<string, number>(["a", 1], ["b", 2])  // variadic factory
Map.empty<string, number>()  // typed empty map
map.set(key, value)          // add entry (returns new Map)
map.get(key)                 // get value (returns Option)

// Option - nullable handling
Option(value)                // wrap value (None if null/undefined)
Option.none()                // explicit None
option.map(fn).orElse(default)

// Either - error handling
Right(value)                 // success
Left(error)                  // error
either.fold(onLeft, onRight)

// Try - exception handling
Try(() => riskyCode())       // catches exceptions
try_.toEither()              // convert to Either
```

## Functype Refactoring Patterns

### Pattern 1: Array mutations → List

```typescript
// BEFORE: Mutable array with push
const errors: string[] = []
if (condition) errors.push("error message")
return errors

// AFTER: Immutable List with concat
const errors = condition ? List(["error message"]) : List<string>([])
return errors.toArray()
```

### Pattern 2: Accumulating in loops → List.concat

```typescript
// BEFORE: Push in forEach/map
const results: Item[] = []
items.forEach((item) => {
  if (item.valid) results.push(transform(item))
})

// AFTER: Filter + map (or reduce with List)
const results = List(items.filter((i) => i.valid).map(transform))
```

### Pattern 3: Conditional object properties → spread syntax

```typescript
// BEFORE: Mutate after creation
const config: Config = { base: true }
if (env.TOKEN) config.token = env.TOKEN

// AFTER: Spread syntax (no mutation)
const config: Config = {
  base: true,
  ...(env.TOKEN && { token: env.TOKEN }),
}
```

### Pattern 4: Map/Set mutations → functype Map/Set

```typescript
// BEFORE: Native Map with set()
const cache = new Map<string, Value>()
cache.set(key, value)

// AFTER: functype Map (returns new Map)
import { Map as FMap } from "functype"
const cache = FMap<string, Value>([])
const newCache = cache.set(key, value)
```

### Pattern 5: Error accumulation → List + buildResult helper

```typescript
const buildResult = (
  success: boolean,
  errors: List<string>,
  warnings: List<string>,
  details: Record<string, unknown>,
): ValidationResult => ({
  success,
  errors: errors.toArray(),
  warnings: warnings.toArray(),
  details,
})

// Usage
const errors = List<string>([])
  .concat(check1Failed ? List(["Check 1 failed"]) : List([]))
  .concat(check2Failed ? List(["Check 2 failed"]) : List([]))

return buildResult(errors.isEmpty, errors, List([]), {})
```
