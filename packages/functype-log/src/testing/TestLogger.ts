import { List } from "functype"

import { createSinkLogger } from "../layers/SinkLogger"
import type { LogEntry, Logger, LogLevel } from "../logger/Logger"

export type TestLoggerHandle = {
  readonly logger: Logger
  readonly entries: () => List<LogEntry>
  readonly clear: () => void
  readonly hasEntry: (level: LogLevel, messagePattern: string | RegExp) => boolean
}

export const createTestLogger = (): TestLoggerHandle => {
  // What the logger has written: an immutable List, replaced on each write, so `entries()` is a snapshot.
  const recorded = { entries: List.empty<LogEntry>() }

  return {
    logger: createSinkLogger((entry) => {
      recorded.entries = recorded.entries.add(entry)
    }),
    entries: () => recorded.entries,
    clear: () => {
      recorded.entries = List.empty<LogEntry>()
    },
    hasEntry: (level: LogLevel, messagePattern: string | RegExp) =>
      recorded.entries.exists(
        (e) =>
          e.level === level &&
          (typeof messagePattern === "string" ? e.message.includes(messagePattern) : messagePattern.test(e.message)),
      ),
  }
}
