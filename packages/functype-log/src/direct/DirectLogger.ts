import type { ConsoleLoggerOptions } from "../layers/ConsoleLogger"
import { createConsoleLogger } from "../layers/ConsoleLogger"
import { silentLogger } from "../layers/SilentLogger"
import type { Logger, LogMetadata } from "../logger/Logger"

export type DirectLogger = {
  readonly trace: (message: string, metadata?: LogMetadata) => void
  readonly debug: (message: string, metadata?: LogMetadata) => void
  readonly info: (message: string, metadata?: LogMetadata) => void
  readonly warn: (message: string, metadata?: LogMetadata) => void
  readonly error: (message: string, metadata?: LogMetadata) => void
  readonly fatal: (message: string, metadata?: LogMetadata) => void
  readonly withError: (error: Error) => DirectLogger
  readonly withContext: (context: LogMetadata) => DirectLogger
  readonly child: (context?: LogMetadata) => DirectLogger
}

export const toDirectLogger = (logger: Logger): DirectLogger => ({
  trace: (msg, meta) => logger.trace(msg, meta).runSyncOrThrow(),
  debug: (msg, meta) => logger.debug(msg, meta).runSyncOrThrow(),
  info: (msg, meta) => logger.info(msg, meta).runSyncOrThrow(),
  warn: (msg, meta) => logger.warn(msg, meta).runSyncOrThrow(),
  error: (msg, meta) => logger.error(msg, meta).runSyncOrThrow(),
  fatal: (msg, meta) => logger.fatal(msg, meta).runSyncOrThrow(),
  withError: (err) => toDirectLogger(logger.withError(err)),
  withContext: (ctx) => toDirectLogger(logger.withContext(ctx)),
  child: (ctx) => toDirectLogger(logger.child(ctx)),
})

export const createDirectConsoleLogger = (options?: ConsoleLoggerOptions): DirectLogger =>
  toDirectLogger(createConsoleLogger(options))

export const directSilentLogger: DirectLogger = toDirectLogger(silentLogger)
