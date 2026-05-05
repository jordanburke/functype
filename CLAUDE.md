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

### MCP Server (`mcp-server/`)

- `cd mcp-server && pnpm validate` - Validate MCP server
- `cd mcp-server && pnpm serve:dev` - Dev server with hot reload
- `cd mcp-server && pnpm inspect` - MCP Inspector

### Site

- `pnpm site:dev` - Start site dev server
- `pnpm site:build` - Build site for production

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

Three base interfaces define the type hierarchy:

- **`Functype<A, Tag>`** (`src/functype/Functype.ts`): Single-value containers with full Iterable API (Option, Lazy). Includes Traversable.
- **`FunctypeSum<A, Tag>`** (`src/functype/FunctypeSum.ts`): Sum types — no collection ops (Either, Try). Scala-aligned: Either/Try are disjoint unions, not iterables.
- **`FunctypeCollection<A, Tag>`** (`src/functype/Functype.ts`): Collections (List, Set) with Iterable + CollectionOps.

Core methods available on all containers: `map`, `flatMap`, `fold`, `pipe`, `toString`, `contains`, `exists`, `forEach`.

### Variance (0.60.0+)

All containers declared with `<out T>` variance where their type parameter is semantically covariant. Exceptions: `Ref<A>` (mutable cell — invariant), `Obj<T>` (record with `keyof` — invariant), `Map<K, out V>` (K invariant for equality, V covariant), `IO<in out R, out E, out A>` (E and A covariant; R invariant — ZIO-style `<in R>` still deferred).

`src/typeclass/variance.ts` exposes:

- `Widen<A, B>` — TS equivalent of Scala's `[B >: A]`; used in `reduce`/`reduceRight` to enforce that B is a supertype of A.
- `reduceWiden` / `reduceRightWiden` — centralized runtime-safe helpers for container implementers.

See `docs/variance-guide.md` for the contributor recipe.

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
2. Implement the type extending the appropriate base:
   - **`Functype<A, Tag>`** — single-value containers with Iterable API (like Option, Lazy)
   - **`FunctypeSum<A, Tag>`** — sum types / disjoint unions (like Either, Try). Excludes collection ops.
   - **`FunctypeCollection<A, Tag>`** — multi-element collections (like List, Set)
3. Use `Companion()` utility to combine constructor with companion methods
4. If the new type has a type parameter, follow the patterns in `docs/variance-guide.md` (covariance via `<out T>`, Scala-aligned method shapes, `Widen<A, B>` for reduce-family methods)
5. Create `index.ts` that re-exports the main type
6. Add export to `src/index.ts` and `package.json` exports field
7. Create tests in `test/mynewtype.spec.ts` — include a `test/mynewtype-variance.spec.ts` if the type is meant to be covariant
8. Update `docs/FUNCTYPE_FEATURE_MATRIX.md` with interface support + variance row
9. Run `pnpm validate`

## Adding Methods to Existing Data Structures

1. Add to shared interface (e.g., `CollectionOps` in `src/typeclass/ContainerOps.ts`) if applicable
2. Implement in ALL types extending that interface (List, Set, etc.)
3. Override return types in type-specific interfaces
4. Add JSDoc comments and tests
5. Run `pnpm extract:interfaces` to regenerate CLI interfaces
6. Update `src/cli/data.ts` with new method entries
7. Update `docs/FUNCTYPE_FEATURE_MATRIX.md`
8. Run `pnpm docs:sync` to sync feature matrix to site
9. Update `site/src/content/<type>.md` with examples
10. Update `.claude/skills/functype/references/quick-reference.md`
11. Update `.claude/skills/functype/references/common-patterns.md` if workarounds become built-in
12. Run `pnpm validate`

See `.claude/skills/functype-developer/references/adding-methods.md` for the full checklist.

## Documentation Updates

When changing public APIs:

- Update JSDoc comments in source (appears in TypeDoc automatically)
- Update `docs/FUNCTYPE_FEATURE_MATRIX.md` if interface support or variance changes
- Update `docs/variance-guide.md` if the change affects the variance patterns (new method shape, new type-level helper)
- Run `pnpm docs:sync` to sync feature matrix to site
- Run `pnpm validate` before committing

## Functype API Quick Reference (v0.60.0+)

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
Option.sequence(opts)        // Option<T>[] → Option<T[]> (None if any None)
Option.traverse(arr, f)      // T[] → (T => Option<U>) → Option<U[]>

// Either - error handling
Right(value)                 // success
Left(error)                  // error
either.fold(onLeft, onRight)
Either.sequence(eithers)     // Either<E,T>[] → Either<E, T[]> (first Left wins)
Either.traverse(arr, f)      // T[] → (T => Either<E,U>) → Either<E, U[]>

// Try - exception handling
Try(() => riskyCode())       // catches exceptions
Try.success(value)           // direct Success construction
Try.failure(error)           // direct Failure (Error or string)
Try.fromPromise(promise)     // async: Promise<T> → Promise<Try<T>>
try_.recover(e => fallback)  // map over failure
try_.recoverWith(e => Try.success(alt)) // flatMap over failure
try_.toEither()              // convert to Either
Try.sequence(tries)          // Try<T>[] → Try<T[]> (first Failure wins)
Try.traverse(arr, f)         // T[] → (T => Try<U>) → Try<U[]>

// IO - lazy effect type with typed errors and dependency injection
IO.sync(() => value)         // wrap sync computation
IO.async(() => promise)      // wrap async computation
IO.succeed(42)               // pure success value
IO.fail(new MyError())       // pure failure value
IO.tryPromise({              // promise with error mapping
  try: () => fetch(url),
  catch: (e) => new NetworkError(e)
})
IO.service(Tag)              // access injected dependency
effect.provide(layer)        // provide dependencies
effect.retry(3)              // retry on failure
await effect.run()           // execute the effect
effect.runSync()             // execute sync effect
await effect.runEither()     // execute, get Either<E,A>
IO.gen(function*() {         // generator do-notation
  const db = yield* IO.service(Database)
  const user = yield* IO.tryPromise(() => db.find(id))
  return user
})

// Task - async with cancellation and progress tracking
// Returns TaskOutcome<T> (Ok/Err) with Functor, AsyncMonad, Foldable, Extractable
Task(params).Async(() => fetch(url))     // async operation → Promise<TaskOutcome<T>>
Task(params).Sync(() => computation())   // sync operation → TaskOutcome<T>
Task.ok(value)                           // create Ok result
Task.err(error)                          // create Err result
Task.cancellable(fn)                     // { task, cancel }
Task.withProgress(fn, onProgress)        // { task, cancel, currentProgress }
outcome.fold(onErr, onOk)               // pattern match on result
outcome.toEither()                       // convert to Either

// IO<R,E,A> - lazy effects with typed errors and dependency injection
// Use IO when you need: typed errors, DI, service composition, testability
IO.sync(() => value)         // sync effect
IO.succeed(42)               // pure success
IO.fail(error)               // typed failure
IO.tryPromise({try, catch})  // promise with error mapping
IO.service(Tag)              // dependency injection
IO.gen(function*() {...})    // generator do-notation
effect.provide(layer)        // provide dependencies
await effect.run()           // execute async
effect.runSync()             // execute sync
await effect.runEither()     // execute → Either<E,A>

// Http - typed fetch wrapper (BYOV: bring your own validator)
Http.get(url, opts?)              // GET → IO<never, HttpError, HttpResponse<unknown>>
Http.get(url, { validate })       // GET → IO<never, HttpError, HttpResponse<T>> (T from validate)
Http.post(url, { body, validate })// POST with auto JSON body serialization
Http.put(url, { body, validate }) // PUT
Http.patch(url, { body, validate })// PATCH
Http.delete(url, opts?)           // DELETE
Http.request({ url, validate })   // Full control (url, method, headers, body, parseAs, validate)
Http.client(config)               // Create client with baseUrl, defaultHeaders, custom fetch
// Without validate, response data is unknown. Provide validate: (data: unknown) => T for typed data.
// Works with Zod, TypeBox, Valibot, or manual validators.
// HttpError ADT: NetworkError | HttpStatusError | DecodeError
// Use .catchTag("HttpStatusError", e => ...) for selective error recovery
// Compose: Http.get(url, { validate }).map(r => r.data).retry(3).timeout(5000)
await effect.runOrThrow()         // HttpResponse<T> with data, status, headers
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
