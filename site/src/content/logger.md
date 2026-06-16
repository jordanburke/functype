# Logger

A minimal, ecosystem-wide logging interface. Type-only — zero runtime, no `console` dependency, no opinion on output format. Every present and future `functype-*` package targets this shape, so a consumer writes ONE logger adapter and it works everywhere.

## Overview

```typescript
export interface Logger {
  debug(message: string, metadata?: Record<string, unknown>): void;
  info(message: string, metadata?: Record<string, unknown>): void;
  warn(message: string, metadata?: Record<string, unknown>): void;
  error(message: string, metadata?: Record<string, unknown>): void;
}
```

Four methods, all mandatory. No `trace`/`fatal`/`child`/`withContext` in the core shape — richer loggers (like `DirectLogger` from `functype-log`) add those on top and remain structurally assignable.

## Import

`Logger` is reachable from both the top barrel and the `functype/logger` subpath:

```typescript
import type { Logger } from "functype";
// or
import type { Logger } from "functype/logger";
```

If your application already has its own `Logger` type, rename on import:

```typescript
import type { Logger as FunctypeLogger } from "functype";
```

## Why it lives in core

Logger is the only service-style interface in `functype` core — and only because every production TypeScript app already has one. The proposal explicitly **rejected** adding `Clock`, `Random`, or `Tracer` (framework abstractions Effect ships) on the same grounds: those aren't universally needed the way logging is.

The proposal also rejected baking in a default implementation. Concrete loggers live in consumer packages (`consoleBootLogger` in `functype-os/config`, `DirectLogger` in `functype-log`). Core stays pure types — Bun/Deno/edge-runtime portability comes for free.

## Implementing it

Any 4-method object with the right signatures satisfies `Logger`:

```typescript
import type { Logger } from "functype";

const myLogger: Logger = {
  debug: (msg, meta) => console.debug(msg, meta ?? ""),
  info: (msg, meta) => console.log(msg, meta ?? ""),
  warn: (msg, meta) => console.warn(msg, meta ?? ""),
  error: (msg, meta) => console.error(msg, meta ?? ""),
};
```

## Interop with `functype-log`

`functype-log/direct` exposes `DirectLogger` — a sync/imperative logger with `debug`/`info`/`warn`/`error(msg, meta?): void` methods plus extras (`trace`, `fatal`, `withError`, `withContext`, `child`). Its surface is a structural **superset** of core `Logger`, so it assigns directly with no adapter:

```typescript
import type { Logger } from "functype";
import { createDirectConsoleLogger } from "functype-log/direct";

const logger: Logger = createDirectConsoleLogger(); // no cast required
```

This lets you wire `functype-log` into any hook expecting a core `Logger` — including `bootDiagnostics` from `functype-os/config`:

```typescript
import { bootDiagnostics, Layered, ProcessEnvSource } from "functype-os/config";
import { createDirectConsoleLogger } from "functype-log/direct";

bootDiagnostics({
  source: Layered([ProcessEnvSource()]),
  required: ["DATABASE_URL"],
  logger: createDirectConsoleLogger(),
});
```

> Note: the IO-shaped `Logger` (the primary export of `functype-log`) does NOT structurally satisfy core `Logger` — its methods return `IO<never, never, void>` instead of `void`. Use `toDirectLogger(ioLogger)` to bridge from one to the other when you need to mix IO-aware code with imperative consumers.

## When to use

- Authoring a `functype-*` ecosystem package or any library that wants to log without picking a logging stack.
- Wiring `bootDiagnostics` for application startup with a custom logger.
- Library authors targeting "drop-in any logger" composition without a logging-library peer dependency.

## When NOT to use

- If your app already uses `functype-log` directly and you want full `IO<never, never, void>` composition with `.tap`/`.flatMap` — use `functype-log`'s `Logger` (IO-shaped) directly, not the core type.
- If you need structured `child(context)` propagation or per-call context binding — those are richer-logger concerns; pick `functype-log` or wrap your own.
