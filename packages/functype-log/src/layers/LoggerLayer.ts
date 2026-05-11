import { Layer } from "functype"
import type { ILogLayer } from "loglayer"

import { logLayerAdapter } from "../adapter/LogLayerAdapter"
import { Logger } from "../logger/Logger"
import type { ConsoleLoggerOptions } from "./ConsoleLogger"
import { createConsoleLogger } from "./ConsoleLogger"
import { silentLogger } from "./SilentLogger"

export const LoggerLive = {
  /** From an existing LogLayer instance — escape hatch for power users (pino, winston, datadog, etc.) */
  fromLogLayer: (logLayer: ILogLayer): Layer<never, never, Logger> => Layer.succeed(Logger, logLayerAdapter(logLayer)),

  /** Console logger — zero config, great for dev */
  console: (options?: ConsoleLoggerOptions): Layer<never, never, Logger> =>
    Layer.sync(Logger, () => createConsoleLogger(options)),

  /** Silent/noop logger — for testing or suppression */
  silent: (): Layer<never, never, Logger> => Layer.succeed(Logger, silentLogger),
}
