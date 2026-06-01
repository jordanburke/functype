# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

IO-native logging for the functype ecosystem. Wraps LogLayer with functype's Tag/Layer dependency injection system. Each log method returns `IO<never, never, void>` — logging is lazy, composable, and testable.

**Dependencies**: `functype` (peer, >=0.55.0), `loglayer` (runtime)

## Development Commands

```bash
pnpm validate        # Main: format → lint → typecheck → test → build (run before commits)
pnpm test            # Run all tests
pnpm test -- test/logger.spec.ts          # Run a single test file
pnpm test -- -t "should attach metadata"  # Run tests matching a pattern
pnpm test:watch      # Watch mode
pnpm typecheck       # TypeScript type check
pnpm build           # Production build (outputs to dist/)
pnpm dev             # Dev build with watch mode
```

All scripts delegate to `ts-builds` — prettier, eslint, vitest, and tsdown configs are inherited from it.

## Architecture

### Module Structure

```
src/
  logger/       # Logger interface, Tag, LogLevel, LogMetadata, LogEntry types
  adapter/      # LogLayerAdapter: ILogLayer → Logger bridge (internal)
  layers/       # LoggerLive factory: console(), silent(), fromLogLayer()
  testing/      # TestLogger: captures entries as List<LogEntry>
  middleware/   # withLogging, tapLog utilities
```

### Key Pattern: Logger as IO Service

The `Logger` type uses functype's declaration merging pattern — `Logger` is both a TypeScript type and a `Tag` value (same identifier). This enables `IO.service(Logger)` to resolve the service via the type system:

```typescript
import { IO } from "functype"
import { Logger, LoggerLive } from "functype-log"

const program = IO.service(Logger).flatMap((log) => log.info("hello"))

await program.provideLayer(LoggerLive.console()).runOrThrow()
```

### LogLayer is an Implementation Detail

Users interact with the `Logger` interface and `LoggerLive` layers. LogLayer is only visible through `LoggerLive.fromLogLayer()` for advanced transport configuration (pino, winston, datadog, etc.).

### Subpath Exports

The package exposes subpath imports for tree-shaking: `functype-log/logger`, `functype-log/layers`, `functype-log/testing`, `functype-log/middleware`, `functype-log/direct`. The root `functype-log` re-exports everything.

### DirectLogger (escape hatch for non-IO codebases)

`functype-log/direct` exposes a `DirectLogger` API: a synchronous/imperative mirror of `Logger` where every method returns `void` instead of `IO<never, never, void>`. Use it when you need to drop a logger into existing imperative code (e.g. a top-level error handler, a CLI bootstrap) without lifting the call site into IO.

```typescript
import { createDirectConsoleLogger, toDirectLogger } from "functype-log/direct"

const log = createDirectConsoleLogger()
log.info("starting") // no .runOrThrow() — runs immediately
log.error("boom", { code: 1 })

// Or convert from an existing IO-shaped Logger:
const direct = toDirectLogger(loggerFromService)
```

`directSilentLogger` and `createDirectTestLogger()` (for tests) round out the surface. Prefer the IO-shaped `Logger` for new code in IO-aware codebases.

### Import Convention

All functype imports use the barrel export (`"functype"`, not subpaths) per functype ecosystem convention.

## Key Types

- `Logger` — Interface + Tag (declaration merging). Methods return `IO<never, never, void>`
- `LoggerLive` — Layer constructors: `.console()`, `.silent()`, `.fromLogLayer()`
- `TestLoggerHandle` — `{ logger, entries(), clear(), hasEntry() }`
- `LogEntry` — `{ level, message, metadata?, error?, timestamp }`

## Testing

Tests use `createTestLogger()` which provides a `Logger` that captures entries in memory:

```typescript
const { logger, entries, hasEntry } = createTestLogger()
await logger.info("test").runOrThrow()
expect(hasEntry("info", "test")).toBe(true)
```
