import type { Logger } from "functype"

import { gray, red, yellow } from "./colors"

const stamp = (): string => new Date().toISOString()

/**
 * Default `Logger` impl for boot diagnostics — zero-dep, raw ANSI colors,
 * NO_COLOR / FORCE_COLOR / isTTY-respecting.
 *
 * All 4 methods of core `Logger` are present (debug included). For consumers
 * already using `functype-log`, pass `createDirectConsoleLogger()` from
 * `functype-log/direct` directly — its `DirectLogger` structurally satisfies
 * core `Logger` (no adapter required).
 *
 * @example
 * ```ts
 * import { bootDiagnostics, consoleBootLogger } from "functype-os/config"
 *
 * await bootDiagnostics({ source, required, logger: consoleBootLogger })
 * // (logger defaults to consoleBootLogger anyway — passed explicitly here
 * //  to show the swap point for `createDirectConsoleLogger()` etc.)
 * ```
 */
export const consoleBootLogger: Logger = {
  debug: (msg, meta) => console.debug(`${gray(stamp())} ${gray("DEBUG")} ${msg}`, meta ?? ""),
  info: (msg, meta) => console.log(`${gray(stamp())} ${msg}`, meta ?? ""),
  warn: (msg, meta) => console.warn(`${gray(stamp())} ${yellow("WARN")} ${msg}`, meta ?? ""),
  error: (msg, meta) => console.error(`${gray(stamp())} ${red("ERROR")} ${msg}`, meta ?? ""),
}
