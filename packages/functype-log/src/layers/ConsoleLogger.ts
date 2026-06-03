import { ConsoleTransport, LogLayer } from "loglayer"

import { logLayerAdapter } from "../adapter/LogLayerAdapter"
import type { Logger, LogLevel } from "../logger/Logger"

/**
 * Console sink shape expected by `loglayer`'s `ConsoleTransport`. Matches
 * the subset of the global `Console` interface the transport actually calls.
 */
type ConsoleSink = Pick<Console, "log" | "info" | "debug" | "trace" | "warn" | "error">

/**
 * A console sink that routes EVERY level through `console.error` (stderr).
 *
 * Opt in via `stream: "stderr"`. Required for consumers where stdout is a
 * reserved data/protocol channel — most notably MCP-over-stdio, which uses
 * stdout exclusively for JSON-RPC. Also useful for CLI tools that emit
 * structured output on stdout.
 */
const stderrConsole: ConsoleSink = {
  log: (...args: unknown[]) => console.error(...args),
  info: (...args: unknown[]) => console.error(...args),
  debug: (...args: unknown[]) => console.error(...args),
  trace: (...args: unknown[]) => console.error(...args),
  warn: (...args: unknown[]) => console.error(...args),
  error: (...args: unknown[]) => console.error(...args),
}

export type ConsoleLoggerOptions = {
  readonly level?: LogLevel
  readonly prefix?: string
  /**
   * Which standard stream console output is routed to.
   *
   * - `"stdout"` (default) — uses the global `console`. `info`/`debug` land
   *   on stdout; `warn`/`error`/`trace` land on stderr (loglayer's per-level
   *   routing). Matches the convention of every other Node logging library
   *   (pino, winston, bunyan).
   * - `"stderr"` — routes ALL levels through `console.error` (stderr). Use
   *   when stdout is a reserved data/protocol channel — most notably
   *   MCP-over-stdio servers where stdout carries JSON-RPC and any other
   *   bytes corrupt the protocol.
   */
  readonly stream?: "stdout" | "stderr"
  /**
   * Fully override the console sink. Takes precedence over `stream`. Use for
   * routing to a file stream, structured collector, or other custom sink.
   *
   * Only the methods called by loglayer's `ConsoleTransport` need to be
   * present (`log`/`info`/`debug`/`trace`/`warn`/`error`).
   */
  readonly console?: Partial<Console>
}

const resolveSink = (options?: ConsoleLoggerOptions): Partial<Console> => {
  if (options?.console) return options.console
  if (options?.stream === "stderr") return stderrConsole
  return console
}

export const createConsoleLogger = (options?: ConsoleLoggerOptions): Logger => {
  const logLayer = new LogLayer({
    transport: new ConsoleTransport({ logger: resolveSink(options) as Console }),
    ...(options?.prefix ? { prefix: options.prefix } : {}),
  })

  return logLayerAdapter(logLayer)
}
