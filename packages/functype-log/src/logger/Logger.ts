import type { IO } from "functype"
import { Tag } from "functype"

export type LogLevel = "trace" | "debug" | "info" | "warn" | "error" | "fatal"

export type LogMetadata = Record<string, unknown>

export type LogEntry = {
  readonly level: LogLevel
  readonly message: string
  readonly metadata?: LogMetadata
  readonly error?: Error
  readonly timestamp: Date
}

export type Logger = {
  readonly trace: (message: string, metadata?: LogMetadata) => IO<never, never, void>
  readonly debug: (message: string, metadata?: LogMetadata) => IO<never, never, void>
  readonly info: (message: string, metadata?: LogMetadata) => IO<never, never, void>
  readonly warn: (message: string, metadata?: LogMetadata) => IO<never, never, void>
  readonly error: (message: string, metadata?: LogMetadata) => IO<never, never, void>
  readonly fatal: (message: string, metadata?: LogMetadata) => IO<never, never, void>
  readonly withError: (error: Error) => Logger
  readonly withContext: (context: LogMetadata) => Logger
  readonly child: (context?: LogMetadata) => Logger
}

export const Logger = Tag<Logger>("Logger")
