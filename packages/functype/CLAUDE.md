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

### Lint policy — health metric, not a gate

Unlike the rest of the family (`functype-os`, `functype-log`, `functype-react`,
`functype-eval`, `functype-mcp-server`, `eslint-plugin-functype`,
`eslint-config-functype` — all of which enforce `eslint src --max-warnings 0`),
**functype core does not gate on warning count**. `lint:check` reports
warnings but does not fail CI on them.

The reason: functype core is the _implementation layer_ of the patterns the
rules enforce. Roughly half of the ~170 warnings live in code that is the
implementation of the pattern being checked — `do/index.ts` is the
do-notation runtime, `list/List.ts` contains the iteration that
`no-imperative-loops` would forbid, `core/task/Task.ts` is the Promise
plumbing. Suppressing those via per-glob eslint overrides would destroy
useful information: the warning count is a real measurement of how much
imperative shape lives in the substrate.

Treat the count as a trend: down is healthier (genuine FP refactors are
landing), up means new imperative code crept in and is worth a look. For
a richer, weighted version of the same idea, run:

```bash
pnpm -F functype-eval bin score packages/functype/src --json
```

functype-eval normalizes by KLOC, weights by dimension, and gives a
0–100 fitness number — the deliberate health metric.

If you do refactor warnings out organically while touching a file, that's
exactly the pattern this policy encourages. Just don't reach for a sweep
that uses per-file overrides to declare false zero.

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
- **Service interfaces**: `Logger` (1.3.0+) — minimal 4-method interface (debug/info/warn/error) shared by every functype-\* package and consumer code. Type-only, no implementation, no runtime. Reachable from both the top barrel (`import type { Logger } from "functype"`) and the `functype/logger` subpath. Default impls live in consumer packages (`consoleBootLogger` in `functype-os/config`). DirectLogger from `functype-log` structurally satisfies it. **Clock/Random/Tracer are NOT being added** — those are framework abstractions (Effect ships them; functype shouldn't). Logger is uniquely justified because every production TS app already has one — naming an existing concept, not introducing a new one.

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
option.or(otherOption)       // fallback to another Option
Option.sequence(opts)        // Option<T>[] → Option<T[]> (None if any None)
Option.traverse(arr, f)      // T[] → (T => Option<U>) → Option<U[]>
// Scala/cats/fp-ts users: functype follows Rust naming.
//   Scala getOrElse(default)  → functype orElse(default)
//   Scala orElse(other)       → functype or(other)
// Renamed in 0.16.0 (see MIGRATION_EXTRACTABLE_API.md). No getOrElse alias.

// Either - error handling
Right(value)                 // success
Left(error)                  // error
either.fold(onLeft, onRight)
either.filterOrElse(p, v => err) // Right→Left(err) when predicate fails; widens L to L | typeof err
Either.sequence(eithers)     // Either<E,T>[] → Either<E, T[]> (first Left wins)
Either.traverse(arr, f)      // T[] → (T => Either<E,U>) → Either<E, U[]>

// Try - exception handling
Try(() => riskyCode())       // catches exceptions
Try.success(value)           // direct Success construction
Try.failure(error)           // direct Failure (Error or string)
Try.fromPromise(promise)     // async: Promise<T> → Promise<Try<T>>
try_.recover(e => fallback)  // map over failure
try_.recoverWith(e => Try.success(alt)) // flatMap over failure
try_.filterOrElse(p, v => new Error("...")) // Success→Failure when predicate fails (no manual throw)
try_.toEither(left)          // → Either<L, T>; Failure → Left(left)
try_.toEither(e => buildL(e))// → Either<L, T>; Failure → Left(buildL(error)) — preserves cause
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

// Retry surface (new in 1.3.0 — pair with HttpError tagged ADT for HTTP retry policy):
effect.retry(n)                             // retry up to n on any error
effect.retryWithDelay(n, ms)                // retry with fixed delay between attempts
effect.retryWhile({ n, while, delayMs? })   // predicate-based retry (only retry when while(e, attempt) === true)
effect.retryWithBackoff({                   // exponential backoff with optional full jitter
  n, baseMs,
  maxMs?, factor?, jitter?,                 // defaults: maxMs=30_000, factor=2, jitter=true
  while?,                                   // optional predicate gating each retry
})

// Http - typed fetch wrapper. New in 1.3.0: afterResponse hook, params, retryWhile/retryWithBackoff.
Http.get(url, opts?)              // GET → IO<never, HttpError, HttpResponse<unknown>>
Http.get(url, { decode })         // GET → IO<never, HttpError, HttpResponse<T>> (Either-returning decoder)
Http.get(url, { params })         // GET with query params: { tag: ["a","b"], page: 2 } → ?tag=a&tag=b&page=2
Http.post(url, { body, decode })  // POST with auto JSON body serialization
Http.put(url, { body, decode })   // PUT
Http.patch(url, { body, decode }) // PATCH
Http.delete(url, opts?)           // DELETE
Http.request({ url, decode })     // Full control (url, method, headers, body, parseAs, decode, flatten, params)
Http.client(config)               // Create client with baseUrl, defaultHeaders, custom fetch, beforeRequest, afterResponse

// HttpClientConfig hooks:
//   beforeRequest: (HttpRequestView) => IO<never, HttpError, HttpRequestView>
//     Auth refresh, request IDs, request logging. Composable via IO operators.
//   afterResponse: (HttpResponse<unknown>) => IO<never, HttpError, HttpResponse<unknown>>
//     SUCCESS PATH ONLY. Response logging, ETag capture, response transforms.
//     Skipped on HttpStatusError / DecodeError / NetworkError — use .catchTag for those.
//
// Refresh-on-401 is a .catchTag pattern, not afterResponse:
//   api.get("/me").catchTag("HttpStatusError", e =>
//     e.status === 401 ? refresh().flatMap(() => api.get("/me")) : IO.fail(e),
//   )

// HttpQueryParams: typed query record. Drops undefined/null, arrays repeat key, percent-encoded.
//   type HttpQueryParams = Readonly<Record<string,
//     string | number | boolean | readonly (string | number | boolean)[] | undefined | null>>

// Production retry policy for HTTP — pair retryWithBackoff with the HttpError tagged ADT:
const isRetryable = (e: HttpError): boolean =>
  e._tag === "NetworkError" ||
  (e._tag === "HttpStatusError" && (e.status >= 500 || e.status === 429))

Http.get("/api/users", { decode: usersDecoder })
  .retryWithBackoff({ n: 3, baseMs: 250, while: isRetryable })
  .timeout(10_000)

// Decoder<T> = (raw: unknown) => Either<DecoderError, T> — the named contract
// Built-ins (zero-dep, composable):
const userDecoder = Decoder.object({
  name: Decoder.string,
  age: Decoder.option(Decoder.number),          // null → None, else Some(n)
  tags: Decoder.list(Decoder.string),
  role: Decoder.either.envelope({ ok: Decoder.string, err: Decoder.number }),
})
// For Zod / TypeBox / Valibot / hand-rolled: any (raw) => Either<DecoderError, T> IS a Decoder.

// Deprecated but still supported for back-compat:
// validate: (data) => T — throw-pattern field from 1.0.x. Prefer `decode` with a Decoder,
//   or use an adapter package like functype-zod for Zod's schema.parse.

// Request body flatten (new in 1.1.0):
// - Default `flatten: true` strips functype ADTs to primitives (Option→nullable, List→array,
//   Either→right-value or throw, Try→success-value or throw, Map→record).
// - `flatten: false` emits canonical {_tag, value} shape for round-trip with Decoder.tagged.*
//   in functype-to-functype services.

// HttpError ADT: NetworkError | HttpStatusError | DecodeError
// (DecodeError also exported as ResponseDecodeError type alias for clarity)
// Use .catchTag("HttpStatusError", e => ...) for selective error recovery
// Compose: Http.get(url, { decode }).map(r => r.data).retry(3).timeout(5000)
await effect.runOrThrow()         // HttpResponse<T> with data, status, headers

// DecoderError - recursive ADT (Leaf | Composite) for structural decode failures
// (distinct from HttpError.DecodeError — this is the inner cause the wrapper carries)
DecoderError.leaf(path, message, cause?)      // single failure at a path
DecoderError.composite(path, children)        // aggregate; paths absolute on leaves after prepend
DecoderError.flatten(e): List<{path, message}> // collect all leaves
DecoderError.format(e): string                // multi-line render for display
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
