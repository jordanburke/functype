import { Layer } from "functype"

import { Logger } from "../logger/Logger"
import type { ConsoleLoggerOptions } from "./ConsoleLogger"
import { createConsoleLogger } from "./ConsoleLogger"
import { silentLogger } from "./SilentLogger"

export const LoggerLive = {
  /** Console logger — zero config. Pass `sink` to send entries to pino, a vendor, or anything else. */
  console: (options?: ConsoleLoggerOptions): Layer<never, never, Logger> =>
    Layer.sync(Logger, () => createConsoleLogger(options)),

  /** Silent/noop logger — for testing or suppression */
  silent: (): Layer<never, never, Logger> => Layer.succeed(Logger, silentLogger),
}
