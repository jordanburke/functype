import type { LogEntry, Logger, LogLevel, LogSink } from "../logger/Logger"
import { createSinkLogger } from "./SinkLogger"

/** The console methods the console logger calls. A subset of the global `Console`. */
type ConsoleMethod = "info" | "debug" | "trace" | "warn" | "error"

type ConsoleTarget = Partial<Pick<Console, ConsoleMethod>>

/** Which console method each level writes with. `fatal` has no method of its own, so it uses `error`. */
const METHOD: Readonly<Record<LogLevel, ConsoleMethod>> = {
  trace: "trace",
  debug: "debug",
  info: "info",
  warn: "warn",
  error: "error",
  fatal: "error",
}

/**
 * A console that routes EVERY level through `console.error` (stderr).
 *
 * Opt in via `stream: "stderr"`. Required for consumers where stdout is a
 * reserved data/protocol channel — most notably MCP-over-stdio, which uses
 * stdout exclusively for JSON-RPC. Also useful for CLI tools that emit
 * structured output on stdout.
 */
const stderrConsole: ConsoleTarget = {
  info: (...args: unknown[]) => console.error(...args),
  debug: (...args: unknown[]) => console.error(...args),
  trace: (...args: unknown[]) => console.error(...args),
  warn: (...args: unknown[]) => console.error(...args),
  error: (...args: unknown[]) => console.error(...args),
}

export type ConsoleLoggerOptions = {
  /** Drop entries below this level. Every level passes when unset. */
  readonly level?: LogLevel
  /** Put in front of each message, followed by a space. */
  readonly prefix?: string
  /**
   * Which standard stream console output is routed to.
   *
   * - `"stdout"` (default) — uses the global `console`. `info`/`debug` land
   *   on stdout via `console.info`/`console.debug`; `warn`/`error`/`fatal`/`trace`
   *   land on stderr via `console.warn`/`console.error`/`console.trace`.
   *   Matches the convention of every other Node logging library
   *   (pino, winston, bunyan).
   * - `"stderr"` — routes ALL levels through `console.error` (stderr). Use
   *   when stdout is a reserved data/protocol channel — most notably
   *   MCP-over-stdio servers where stdout carries JSON-RPC and any other
   *   bytes corrupt the protocol.
   */
  readonly stream?: "stdout" | "stderr"
  /**
   * Fully override the console. Takes precedence over `stream`. Use for
   * routing to a file stream, structured collector, or other custom target.
   *
   * Only the methods the logger calls need to be present
   * (`info`/`debug`/`trace`/`warn`/`error`). Calling a level whose method is
   * missing throws a `TypeError` to whoever ran the log call.
   */
  readonly console?: Partial<Console>
  /**
   * Hand each `LogEntry` to this function instead of writing to a console. Takes precedence over
   * `console` and `stream`. `level` and `prefix` still apply.
   */
  readonly sink?: LogSink
}

const resolveConsole = (options?: ConsoleLoggerOptions): ConsoleTarget => {
  if (options?.console) return options.console
  if (options?.stream === "stderr") return stderrConsole
  return console
}

/**
 * The arguments one entry is written with: the message alone, or a data object then the message.
 * The data object holds the context and metadata, plus the `withError` error under `err`, which
 * wins over a metadata key of the same name.
 */
const consoleArgs = ({ message, metadata, error }: LogEntry): ReadonlyArray<unknown> => {
  // `== null`, so a null error from an untyped caller is skipped, as loglayer skipped it.
  if (metadata === undefined && error == null) return [message]
  return [{ ...metadata, ...(error == null ? {} : { err: error }) }, message]
}

/**
 * A sink that writes each entry to `target`. It looks the method up on every call, and calls it as
 * a method of `target`, so a console spied on or patched after the logger was made still sees it.
 *
 * @interop A sink reports failure by throwing to whoever ran the log call, as `LogSink` documents.
 */
const consoleSink =
  (target: ConsoleTarget): LogSink =>
  (entry) => {
    const name = METHOD[entry.level]
    const write = target[name]
    if (typeof write !== "function") throw new TypeError(`console.${name} is not a function`)
    write.apply(target, [...consoleArgs(entry)])
  }

export const createConsoleLogger = (options?: ConsoleLoggerOptions): Logger =>
  createSinkLogger(options?.sink ?? consoleSink(resolveConsole(options)), {
    ...(options?.level ? { level: options.level } : {}),
    ...(options?.prefix ? { prefix: options.prefix } : {}),
  })
