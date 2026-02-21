# Functype - Agent Guide

## Overview

Functional programming library for TypeScript with immutable data structures,
type-safe error handling, and Scala-inspired patterns.

## Build & Development

- **Prerequisites**: Node.js >= 18.0.0, pnpm 10.x
- **Install**: `pnpm install`
- **Test**: `pnpm test` (or `pnpm vitest run test/specific.spec.ts` for single file)
- **Validate**: `pnpm validate` (format + lint + test + build — run before commit)
- **Build**: `pnpm build`
- **Dev**: `pnpm dev` (build with watch mode)
- **Format**: `pnpm format`
- **Lint**: `pnpm lint`

## Architecture

- **Scala-inspired Companion pattern**: Constructor function + static methods combined via `Companion()` utility
- **Base constraint**: Use `Type` from types module (never `any`)
- **Two base interfaces**:
  - `Functype<A, Tag>` — Single-value containers (Option, Either, Try, Lazy) with Extractable + Matchable
  - `FunctypeCollection<A, Tag>` — Collections (List, Set) with Iterable + CollectionOps
- **Core methods** on all containers: `map`, `flatMap`, `fold`, `pipe`, `toString`
- **HKT system**: Higher-kinded types enable generic programming across containers
- **Type classes**: Functor, Applicative, Monad, Foldable, Traversable, Matchable, Serializable

## Code Conventions

- TypeScript strict mode with `noUncheckedIndexedAccess`, `verbatimModuleSyntax`
- Type-only imports when possible
- Absolute imports with `@/` alias (e.g., `import from "@/option"`)
- Constructor functions returning objects (not classes)
- Vitest with describe/it for testing, fast-check for property-based tests
- No `any` types — use `unknown` or proper typing

## Module Structure

Each module has `index.ts` re-exporting its main type.
Selective imports supported: `import { Option } from "functype/option"`

## Core Types

| Type     | Purpose                                                             |
| -------- | ------------------------------------------------------------------- |
| Option   | Handle nullable values safely with Some and None                    |
| Either   | Express success/failure with Left and Right                         |
| Try      | Safely execute operations that might throw                          |
| List     | Immutable array with functional operations                          |
| Set      | Immutable set with functional operations                            |
| Map      | Immutable key-value store                                           |
| Task     | Sync/async operations with structured error handling                |
| IO       | Lazy, composable effects with typed errors and dependency injection |
| Lazy     | Deferred evaluation with memoization                                |
| Tuple    | Fixed-length typed arrays                                           |
| Stack    | Immutable LIFO stack                                                |
| LazyList | Lazy-evaluated infinite sequences                                   |

## Documentation

- `npx functype [type] --json` — Machine-readable API reference
- `docs/FUNCTYPE_FEATURE_MATRIX.md` — Interface support matrix
- `docs/ai-guide.md` — AI-optimized usage guide
- `docs/quick-reference.md` — Comprehensive API reference

## Adding New Data Structures

1. Create module directory under `src/` (e.g., `src/mynewtype/`)
2. Implement extending `Functype<A, Tag>` or `FunctypeCollection<A, Tag>`
3. Use `Companion()` utility to combine constructor with companion methods
4. Create `index.ts` that re-exports the main type
5. Add export to `src/index.ts` and `package.json` exports field
6. Create tests in `test/mynewtype.spec.ts`
7. Update `docs/FUNCTYPE_FEATURE_MATRIX.md`
8. Run `pnpm validate`
