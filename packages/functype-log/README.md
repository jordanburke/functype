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
```

## Requirements

- functype >= 0.55.0
- Node.js >= 18.17.0

## License

MIT
