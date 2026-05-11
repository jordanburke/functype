// Logger interface + Tag
export type { LogEntry, LogLevel, LogMetadata } from "./logger"
export { Logger } from "./logger"

// Layer constructors
export type { ConsoleLoggerOptions } from "./layers"
export { createConsoleLogger, LoggerLive, silentLogger } from "./layers"

// Adapter (for advanced use — creating Logger from ILogLayer directly)
export { logLayerAdapter } from "./adapter"

// Testing utilities
export type { TestLoggerHandle } from "./testing"
export { createTestLogger } from "./testing"

// Middleware
export { tapLog, withLogging } from "./middleware"

// Direct (imperative) logging
export type { DirectLogger, DirectTestLoggerHandle } from "./direct"
export { createDirectConsoleLogger, createDirectTestLogger, directSilentLogger, toDirectLogger } from "./direct"
