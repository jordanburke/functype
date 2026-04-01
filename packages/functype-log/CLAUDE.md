# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

IO-native logging for the functype ecosystem. Wraps LogLayer with functype's Tag/Layer dependency injection system. Each log method returns `IO<never, never, void>` — logging is lazy, composable, and testable.

**Dependencies**: `functype` (peer, >=0.54.0), `loglayer` (runtime)

## Development Commands

```bash
pnpm validate        # Main: format + lint + test + build (before commits)
pnpm test            # Run tests
pnpm typecheck       # TypeScript type check
pnpm build           # Production build (outputs to dist/)
pnpm dev             # Dev build with watch mode
```

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

```typescript
import { IO } from "functype"
import { Logger, LoggerLive } from "functype-log"

const program = IO.service(Logger).flatMap((log) => log.info("hello"))

await program.provideLayer(LoggerLive.console()).runOrThrow()
```

### LogLayer is an Implementation Detail

Users interact with the `Logger` interface and `LoggerLive` layers. LogLayer is only visible through `LoggerLive.fromLogLayer()` for advanced transport configuration (pino, winston, datadog, etc.).

### Import Convention

All functype imports use the barrel export (`"functype"`, not subpaths) per functype-os convention.

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
