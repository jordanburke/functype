import { List } from "functype"

import type { LogEntry, LogLevel, LogMetadata } from "../logger/Logger"
import type { DirectLogger } from "./DirectLogger"

export type DirectTestLoggerHandle = {
  readonly logger: DirectLogger
  readonly entries: () => List<LogEntry>
  readonly clear: () => void
  readonly hasEntry: (level: LogLevel, messagePattern: string | RegExp) => boolean
}

/** What the logger and its children have written: an immutable List, replaced on each write. */
type Recorded = { entries: List<LogEntry> }

const createLoggerFromStore = (store: Recorded, baseContext: LogMetadata, baseError?: Error): DirectLogger => {
  const makeMethod =
    (level: LogLevel) =>
    (message: string, metadata?: LogMetadata): void => {
      store.entries = store.entries.add({
        level,
        message,
        metadata: Object.keys(baseContext).length > 0 || metadata ? { ...baseContext, ...metadata } : undefined,
        error: baseError,
        timestamp: new Date(),
      })
    }

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

export const createDirectTestLogger = (): DirectTestLoggerHandle => {
  const store: Recorded = { entries: List.empty<LogEntry>() }

  return {
    logger: createLoggerFromStore(store, {}),
    entries: () => store.entries,
    clear: () => {
      store.entries = List.empty<LogEntry>()
    },
    hasEntry: (level: LogLevel, messagePattern: string | RegExp) =>
      store.entries.exists(
        (e) =>
          e.level === level &&
          (typeof messagePattern === "string" ? e.message.includes(messagePattern) : messagePattern.test(e.message)),
      ),
  }
}
