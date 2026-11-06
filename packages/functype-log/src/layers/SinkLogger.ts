import { IO } from "functype"

import type { LogEntry, Logger, LogLevel, LogMetadata, LogSink } from "../logger/Logger"

const LEVEL_ORDER: Readonly<Record<LogLevel, number>> = {
  trace: 0,
  debug: 1,
  info: 2,
  warn: 3,
  error: 4,
  fatal: 5,
}

export type SinkLoggerOptions = {
  /** Drop entries below this level. Every level passes when unset. */
  readonly level?: LogLevel
  /** Put in front of each message, followed by a space. */
  readonly prefix?: string
}

const buildEntry = (
  level: LogLevel,
  message: string,
  context: LogMetadata,
  metadata: LogMetadata | undefined,
  error: Error | undefined,
  prefix: string | undefined,
): LogEntry => ({
  level,
  message: prefix ? `${prefix} ${message}` : message,
  metadata: Object.keys(context).length > 0 || metadata ? { ...context, ...metadata } : undefined,
  error,
  timestamp: new Date(),
})

const buildLogger = (sink: LogSink, options: SinkLoggerOptions, context: LogMetadata, error?: Error): Logger => {
  const threshold = LEVEL_ORDER[options.level ?? "trace"]

  const method =
    (level: LogLevel) =>
    (message: string, metadata?: LogMetadata): IO<never, never, void> =>
      IO.sync(() => {
        if (LEVEL_ORDER[level] >= threshold) sink(buildEntry(level, message, context, metadata, error, options.prefix))
      })

  return {
    trace: method("trace"),
    debug: method("debug"),
    info: method("info"),
    warn: method("warn"),
    error: method("error"),
    fatal: method("fatal"),
    withError: (err) => buildLogger(sink, options, context, err),
    withContext: (ctx) => buildLogger(sink, options, { ...context, ...ctx }, error),
    child: (ctx) => buildLogger(sink, options, { ...context, ...ctx }),
  }
}

/** A `Logger` that hands each entry to `sink`. It doesn't use loglayer. */
export const createSinkLogger = (sink: LogSink, options: SinkLoggerOptions = {}): Logger =>
  buildLogger(sink, options, {})
