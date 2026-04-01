import { ConsoleTransport, LogLayer } from "loglayer"

import { logLayerAdapter } from "../adapter/LogLayerAdapter"
import type { Logger, LogLevel } from "../logger/Logger"

export type ConsoleLoggerOptions = {
  readonly level?: LogLevel
  readonly prefix?: string
}

export const createConsoleLogger = (options?: ConsoleLoggerOptions): Logger => {
  const logLayer = new LogLayer({
    transport: new ConsoleTransport({ logger: console }),
    ...(options?.prefix ? { prefix: options.prefix } : {}),
  })

  return logLayerAdapter(logLayer)
}
