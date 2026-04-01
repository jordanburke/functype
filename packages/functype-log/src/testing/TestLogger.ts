import { IO, List } from "functype"

import type { LogEntry, Logger, LogLevel, LogMetadata } from "../logger/Logger"

export type TestLoggerHandle = {
  readonly logger: Logger
  readonly entries: () => List<LogEntry>
  readonly clear: () => void
  readonly hasEntry: (level: LogLevel, messagePattern: string | RegExp) => boolean
}

const createLoggerFromStore = (store: LogEntry[], baseContext: LogMetadata, baseError?: Error): Logger => {
  const makeMethod =
    (level: LogLevel) =>
    (message: string, metadata?: LogMetadata): IO<never, never, void> =>
      IO.sync(() => {
        store.push({
          level,
          message,
          metadata: Object.keys(baseContext).length > 0 || metadata ? { ...baseContext, ...metadata } : undefined,
          error: baseError,
          timestamp: new Date(),
        })
      })

  return {
    trace: makeMethod("trace"),
    debug: makeMethod("debug"),
    info: makeMethod("info"),
    warn: makeMethod("warn"),
    error: makeMethod("error"),
    fatal: makeMethod("fatal"),
    withError: (err: Error) => createLoggerFromStore(store, baseContext, err),
    withContext: (ctx: LogMetadata) => createLoggerFromStore(store, { ...baseContext, ...ctx }, baseError),
    child: (ctx?: LogMetadata) => createLoggerFromStore(store, { ...baseContext, ...ctx }, undefined),
  }
}

export const createTestLogger = (): TestLoggerHandle => {
  const store: LogEntry[] = []

  return {
    logger: createLoggerFromStore(store, {}),
    entries: () => List(store),
    clear: () => {
      store.length = 0
    },
    hasEntry: (level: LogLevel, messagePattern: string | RegExp) =>
      store.some(
        (e) =>
          e.level === level &&
          (typeof messagePattern === "string" ? e.message.includes(messagePattern) : messagePattern.test(e.message)),
      ),
  }
}
