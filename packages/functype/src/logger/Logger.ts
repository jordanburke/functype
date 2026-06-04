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
 * Subpath-only import (1.3.x): `import type { Logger } from "functype/logger"`.
 *
 * **Why subpath-only and not also from the top barrel?** Temporary workaround
 * for a non-deterministic chunk-splitter bug in rolldown 1.1.0 (the bundler
 * tsdown uses under the hood). Re-exporting Logger from the top barrel
 * occasionally caused `Companion$N is not defined` errors in downstream
 * builds — same source, same node, different chunk graph from one rolldown
 * run to another. See the TEMPORARY comment in `packages/functype/src/index.ts`
 * for the restore plan once rolldown stabilizes.
 *
 * @category Logger
 */
export interface Logger {
  debug(message: string, metadata?: Record<string, unknown>): void
  info(message: string, metadata?: Record<string, unknown>): void
  warn(message: string, metadata?: Record<string, unknown>): void
  error(message: string, metadata?: Record<string, unknown>): void
}
