/**
 * Minimal Logger interface for the functype ecosystem.
 *
 * One shared contract every present and future sibling package can reference
 * without inventing its own ad-hoc logger interface. Type-only — no runtime,
 * no opinion on output format, no `console`-global dependency. Default impls
 * live in consumer packages (e.g. `consoleBootLogger` in `functype-os/config`).
 *
 * Four methods, all mandatory: `debug`, `info`, `warn`, `error`. Mandatory
 * means no defensive `logger.debug?.()` checks at call sites.
 *
 * Richer loggers — `DirectLogger` from `functype-log/direct` for example —
 * structurally satisfy `Logger` because their `debug/info/warn/error(msg, meta?)`
 * signatures are a superset. Pass them directly anywhere a `Logger` is
 * expected; no adapter required.
 *
 * Subpath: `import type { Logger } from "functype/logger"`. Also re-exported
 * from the top-level `functype` barrel for consumers that prefer the canonical
 * entry point (mirrors the `JSONValue` precedent — type-only re-export, safe
 * across name collision with user types via `import type { Logger as ... }`).
 *
 * @category Logger
 */
export interface Logger {
  debug(message: string, metadata?: Record<string, unknown>): void
  info(message: string, metadata?: Record<string, unknown>): void
  warn(message: string, metadata?: Record<string, unknown>): void
  error(message: string, metadata?: Record<string, unknown>): void
}
