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
  const store: LogEntry[] = []

  return {
    logger: createSinkLogger((entry) => {
      store.push(entry)
    }),
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
