# functype-log

IO-native logging for the [functype](https://github.com/jordanburke/functype) ecosystem. Wraps [LogLayer](https://loglayer.dev/) with functype's `Tag`/`Layer` dependency injection system.

Every log method returns `IO<never, never, void>` — logging is lazy, composable, and testable.

## Install

```bash
pnpm add functype-log functype
```

## Quick Start

```typescript
import { IO } from "functype"
import { Logger, LoggerLive } from "functype-log"

const program = IO.gen(function* () {
  const log = yield* IO.service(Logger)
  yield* log.info("Starting", { version: "1.0.0" })
  const result = yield* doWork()
  yield* log.info("Done", { result })
  return result
})

// Run with console logging
await program.provideLayer(LoggerLive.console()).runOrThrow()
```

## Layers

### Console (dev)

```typescript
await program.provideLayer(LoggerLive.console()).runOrThrow()
await program.provideLayer(LoggerLive.console({ prefix: "[APP]" })).runOrThrow()
```

`ConsoleLoggerOptions` accepts `level`, `prefix`, `stream`, and `console`:

```typescript
// Default — info/debug → stdout (console.info/console.debug),
// warn/error → stderr (console.warn/console.error). Matches loglayer's
// per-level routing and the convention of pino / winston / bunyan.
LoggerLive.console()

// Route ALL levels through stderr. Required when stdout is reserved as a
// data/protocol channel — e.g. MCP-over-stdio servers (stdout carries
// JSON-RPC; any other bytes corrupt the protocol), or CLI tools that emit
// structured output on stdout.
LoggerLive.console({ stream: "stderr" })

// Fully override the sink — file streams, structured collectors, in-memory
// capture for tests. Takes precedence over `stream`. Only the methods
// loglayer's ConsoleTransport calls need to be present
// (log / info / debug / trace / warn / error).
LoggerLive.console({
  console: {
    info: (...args) => myStream.write(format(args) + "\n"),
    warn: (...args) => myStream.write(format(args) + "\n"),
    error: (...args) => myStream.write(format(args) + "\n"),
    debug: () => {},
    trace: () => {},
    log: (...args) => myStream.write(format(args) + "\n"),
  },
})
```

The same options propagate to `createDirectConsoleLogger`:

```typescript
import { createDirectConsoleLogger } from "functype-log/direct"

const log = createDirectConsoleLogger({ stream: "stderr" }) // MCP-safe
log.info("connection established") // → stderr, not stdout
```

### Silent (testing/suppression)

```typescript
await program.provideLayer(LoggerLive.silent()).runOrThrow()
```

### From LogLayer (production)

Use any of LogLayer's 40+ transports — pino, winston, datadog, bunyan, OpenTelemetry, etc.

```typescript
import { LogLayer } from "loglayer"
import { PinoTransport } from "@loglayer/transport-pino"
import pino from "pino"

const pinoLog = new LogLayer({
  transport: new PinoTransport({ logger: pino() }),
})

await program.provideLayer(LoggerLive.fromLogLayer(pinoLog)).runOrThrow()
```

### OpenTelemetry

```typescript
import { openTelemetryPlugin } from "@loglayer/plugin-opentelemetry"

const otelLog = new LogLayer({
  transport: new PinoTransport({ logger: pino() }),
  plugins: [openTelemetryPlugin()],
})

await program.provideLayer(LoggerLive.fromLogLayer(otelLog)).runOrThrow()
```

## Logger API

```typescript
const log = yield * IO.service(Logger)

// Log levels
yield * log.trace("verbose detail")
yield * log.debug("debug info")
yield * log.info("informational")
yield * log.warn("warning")
yield * log.error("error occurred")
yield * log.fatal("fatal error")

// Structured metadata
yield * log.info("user action", { userId: "123", action: "login" })

// Error context
yield * log.withError(err).error("operation failed")

// Persistent context
const reqLog = log.withContext({ requestId: "req-1" })
yield * reqLog.info("first") // includes requestId
yield * reqLog.info("second") // includes requestId

// Child logger
const child = log.child({ handler: "users" })
```

## Middleware

### withLogging

Wraps any IO with start/complete logging at debug level:

```typescript
import { withLogging } from "functype-log"

const fetchUsers = Http.get("/api/users", { validate: UserSchema })
const logged = withLogging("fetchUsers", fetchUsers)
// Logs: "fetchUsers: starting" then "fetchUsers: completed"
```

### tapLog

Logs after an effect completes:

```typescript
import { tapLog } from "functype-log"

const result = await tapLog<number[]>(
  "info",
  (arr) => `fetched ${arr.length} items`,
)(IO.succeed([1, 2, 3]))
  .provideService(Logger, logger)
  .runOrThrow()
```

## Testing

`createTestLogger` captures log entries in memory for assertions:

```typescript
import { createTestLogger } from "functype-log"

const { logger, entries, hasEntry, clear } = createTestLogger()

await myProgram.provideService(Logger, logger).runOrThrow()

// Assert on captured entries
expect(entries().size).toBe(2)
expect(hasEntry("info", "Starting")).toBe(true)
expect(hasEntry("info", /fetched \d+ items/)).toBe(true)

// Entries are List<LogEntry> with full metadata
const first = entries().head
expect(first.level).toBe("info")
expect(first.metadata).toEqual({ version: "1.0.0" })
expect(first.timestamp).toBeInstanceOf(Date)
```

## Subpath Exports

```typescript
import { Logger } from "functype-log" // everything
import { Logger } from "functype-log/logger" // types only
import { LoggerLive } from "functype-log/layers" // layer constructors
import { createTestLogger } from "functype-log/testing" // test utilities
import { withLogging } from "functype-log/middleware" // middleware
import { createDirectConsoleLogger } from "functype-log/direct" // sync/imperative API
```

## Interop with `functype`'s core `Logger` (1.3.0+)

The core `functype` package ships a minimal `Logger` interface — 4 mandatory methods (`debug`/`info`/`warn`/`error`) returning `void`, designed as the shared shape for boot-diagnostic / observability hooks across the ecosystem (see `bootDiagnostics` in `functype-os/config`). Reachable from both `functype` (top barrel) and the `functype/logger` subpath.

`DirectLogger` from `functype-log/direct` **structurally satisfies** that core `Logger` interface — its `debug`/`info`/`warn`/`error` methods are a superset of the core shape. You can pass a `DirectLogger` directly anywhere a core `Logger` is expected, with no adapter:

```typescript
import type { Logger } from "functype"
import { createDirectConsoleLogger } from "functype-log/direct"

const logger: Logger = createDirectConsoleLogger() // structural compat — no cast required
```

This means you can plug `functype-log` into `bootDiagnostics` (or any other functype-ecosystem hook taking a core `Logger`) without coupling the consumer package to LogLayer:

```typescript
import { bootDiagnostics, Layered, ProcessEnvSource } from "functype-os/config"
import { createDirectConsoleLogger } from "functype-log/direct"

bootDiagnostics({
  source: Layered([ProcessEnvSource()]),
  required: ["DATABASE_URL"],
  logger: createDirectConsoleLogger(),
})
```

`bootDiagnostics`' `logger` parameter is typed as core `Logger` from `functype` — `DirectLogger` satisfies it structurally.

The IO-shaped `Logger` (this package's primary API) does NOT structurally satisfy the core `Logger` — its methods return `IO<never, never, void>` instead of `void`. For IO-aware code that needs to also drive boot diagnostics, derive a `DirectLogger` via `toDirectLogger(ioLogger)` and pass that.

## Requirements

- functype >= 0.55.0
- Node.js >= 18.17.0

## License

MIT
